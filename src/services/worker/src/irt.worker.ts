import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { getPrismaClient } from './lib/prisma';
import axios from 'axios';
import { logIRT, logError, logPerformance } from './utils/logger';

const prisma = getPrismaClient();

const redisConnection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (times) => Math.min(times * 50, 2000),
});

interface IRTJobData {
    testId: string;
}

const irtWorker = new Worker(
    'irt-queue',
    async (job: Job<IRTJobData>) => {
        const startTime = Date.now();
        const { testId } = job.data;

        logIRT(job.id!, 'processing', testId, undefined, {
            attemptNumber: job.attemptsMade
        });

        try {
            await job.updateProgress(10);

            // 1. Fetch Questions (to know correct answers and order)
            // question_id format: "{testId}_{index}" where index is 1-based integer.
            // IMPORTANT: Must sort NUMERICALLY by the index suffix, NOT by string.
            // String sort of "_1","_10","_100"... scrambles the order completely.
            const questionsUnsorted = await prisma.question.findMany({
                where: { test_id: testId },
                select: {
                    question_id: true,
                    correct_option: true,
                },
            });

            // Sort by numeric index extracted from question_id
            const questions = questionsUnsorted.sort((a, b) => {
                const getIndex = (id: string) => {
                    const parts = id.split('_');
                    return Number(parts[parts.length - 1]) || 0;
                };
                return getIndex(a.question_id) - getIndex(b.question_id);
            });

            if (questions.length === 0) {
                throw new Error(`No questions found for test ${testId}`);
            }

            // Create a map for quick lookup of correct options
            const correctOptionsMap = new Map<string, string>();
            questions.forEach(q => {
                if (q.correct_option) correctOptionsMap.set(q.question_id, q.correct_option);
            });

            // 2. Fetch Trials for this test
            const trials = await prisma.trial.findMany({
                where: { test_id: testId },
                select: {
                    trial_id: true,
                    responses: {
                        select: {
                            question_id: true,
                            chosen_option: true,
                        },
                    },
                },
            });

            if (trials.length === 0) {
                console.log(`No trials found for test ${testId}. Skipping.`);
                return { message: 'No trials found' };
            }

            await job.updateProgress(30);

            // 3. Transform Data to 0/1 Matrix
            const names: string[] = [];
            const responsesMatrix: number[][] = [];

            for (const trial of trials) {
                names.push(trial.trial_id);

                // Initialize vector of 0s for this student
                // The R script expects 120 columns. If we have fewer questions, we might need to pad or the script might fail/adapt.
                // Assuming the questions array represents the columns.
                const responseMap = new Map(trial.responses.map(r => [r.question_id, r.chosen_option]));
                const studentVector = questions.map(q => {
                    const chosen = responseMap.get(q.question_id);
                    if (!chosen) return 0; // No answer = Incorrect

                    const correct = correctOptionsMap.get(q.question_id);
                    return (correct && chosen === correct) ? 1 : 0;
                });

                responsesMatrix.push(studentVector);
            }

            // Check if we meet the 120 column requirement of the R script (as seen in `irt_run.R`)
            // If we have fewer than 120 questions, we might need to pad with 0s ?? 
            // The snippet `if (nc < 120) stop(sprintf('need at least 120 item columns; got %d', nc))` suggests strict 120.
            // Let's ensure we send 120 columns if possible, padding with 0s if we have less?
            // Or assume the test usually has 120. For now, I'll stick to the actual questions count 
            // but warn if it's not 120, as the external service might reject it.
            if (questions.length < 120) {
                console.warn(`Warning: Test has ${questions.length} questions, but IRT script implies 120.`);
            }

            await job.updateProgress(50);

            // 4. Transmit to IRT Service
            const payload = {
                responses: responsesMatrix,
                names: names
            };

            const irtApiUrl = process.env.IRT_API_URL;
            const irtApiKey = process.env.IRT_API_KEY;

            if (!irtApiUrl) {
                throw new Error('IRT_API_URL environment variable is not set');
            }

            console.log(`Sending data to ${irtApiUrl}/calculate-irt...`);
            console.log(`Using API Key: ${irtApiKey ? 'YES (' + irtApiKey.substring(0, 3) + '...)' : 'NO'}`);

            const irtResponse = await axios.post(`${irtApiUrl}/calculate-irt`, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(irtApiKey ? { 'Authorization': `Bearer ${irtApiKey}` } : {})
                }
            });

            const resultData = irtResponse.data;
            // Expected result structure from R script:
            // { students: [ { name: "trial_id", theta_vi: ..., score0_300_vi: ... }, ... ], items: ... }

            if (!resultData || !resultData.students) {
                throw new Error('Invalid response from IRT service');
            }

            await job.updateProgress(70);

            // 5. Update Trials with Processed Scores
            const studentsScores = resultData.students;
            console.log(`Received scores for ${studentsScores.length} students.`);

            // Update in parallel chunks
            const updatePromises = studentsScores.map(async (studentScore: any) => {
                const trialId = studentScore.name;

                // Remove the 'name' field from the score object before saving if desired, 
                // or just save the whole thing. The user wants it in `processed_score`.

                await prisma.trial.update({
                    where: { trial_id: trialId },
                    data: {
                        processed_score: studentScore as any // Save the full score object (JSON)
                    }
                });
            });

            await Promise.all(updatePromises);

            // Optionally mark test as processed
            // await prisma.test.update({ where: { test_id: testId }, data: { status: 'PROCESSED' } });

            await job.updateProgress(100);

            const duration = Date.now() - startTime;
            logIRT(job.id!, 'completed', testId, duration, {
                trialsProcessed: studentsScores.length,
                totalQuestions: questions.length
            });
            logPerformance('irt_processing', duration, 30000, {
                testId,
                trialsCount: studentsScores.length
            });

            return { success: true, processed: studentsScores.length };

        } catch (error: any) {
            const duration = Date.now() - startTime;
            logIRT(job.id!, 'failed', testId, duration, {
                error: error.message,
                attemptNumber: job.attemptsMade
            });
            logError(error, {
                context: 'irt_processing',
                testId,
                jobId: job.id
            });

            if (error.response) {
                console.error('IRT Service Response:', error.response.data);
            }
            throw error;
        }
    },
    {
        connection: redisConnection,
        concurrency: 1, // Batch processing, maybe simpler to do 1 at a time to avoid DB locking
    }
);

export default irtWorker;
