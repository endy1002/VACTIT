import { PrismaClient, Prisma } from '@prisma/client';
import { logExternalApi, logPerformance, logError } from '../utils/logger';

/**
 * Process IRT calculation for a single exam directly (no BullMQ).
 * Extracted from irt.worker.ts logic:
 *   1. Fetch questions + correct answers
 *   2. Fetch trials + responses
 *   3. Build 0/1 response matrix
 *   4. POST to R Service (IRT_API_URL)
 *   5. Update processed_score in DB
 */
export async function processIRTForExam(
    prisma: PrismaClient,
    testId: string
): Promise<{ success: boolean; processed: number; message?: string }> {
    const startTime = Date.now();

    console.log(`[IRT Processor] Starting IRT calculation for test: ${testId}`);

    try {
        // 1. Fetch Questions (ordered by question_id)
        const questions = await prisma.question.findMany({
            where: { test_id: testId },
            orderBy: { question_id: 'asc' },
        });

        if (questions.length === 0) {
            throw new Error(`No questions found for test ${testId}`);
        }

        console.log(`[IRT Processor] Found ${questions.length} questions for test ${testId}`);

        // Create a map for quick lookup of correct options
        const correctOptionsMap = new Map<string, string>();
        questions.forEach(q => {
            if (q.correct_option) correctOptionsMap.set(q.question_id, q.correct_option);
        });

        // 2. Fetch Trials with responses
        const trials = await prisma.trial.findMany({
            where: { test_id: testId },
            include: { responses: true },
        });

        if (trials.length === 0) {
            console.log(`[IRT Processor] No trials found for test ${testId}. Skipping.`);
            return { success: true, processed: 0, message: 'No trials found' };
        }

        console.log(`[IRT Processor] Found ${trials.length} trials for test ${testId}`);

        // 3. Transform Data to 0/1 Matrix
        const names: string[] = [];
        const responsesMatrix: number[][] = [];

        for (const trial of trials) {
            names.push(trial.trial_id);

            const studentVector = questions.map(q => {
                const response = trial.responses.find(r => r.question_id === q.question_id);
                if (!response || !response.chosen_option) return 0;
                const correct = correctOptionsMap.get(q.question_id);
                return (correct && response.chosen_option === correct) ? 1 : 0;
            });

            responsesMatrix.push(studentVector);
        }

        if (questions.length < 120) {
            console.warn(`[IRT Processor] Warning: Test has ${questions.length} questions, R script may expect 120.`);
        }

        // 4. POST to R Service
        const irtApiUrl = process.env.IRT_API_URL;
        const irtApiKey = process.env.IRT_API_KEY;

        if (!irtApiUrl) {
            throw new Error('IRT_API_URL environment variable is not set');
        }

        const payload = { responses: responsesMatrix, names };

        console.log(`[IRT Processor] Sending data to ${irtApiUrl}/calculate-irt...`);
        console.log(`[IRT Processor] Payload: ${trials.length} students × ${questions.length} questions`);
        console.log(`[IRT Processor] Using API Key: ${irtApiKey ? 'YES (' + irtApiKey.substring(0, 3) + '...)' : 'NO'}`);

        const fetchStartTime = Date.now();
        console.log(`[IRT Processor] Calling R service (timeout: 120s)...`);

        const response = await fetch(`${irtApiUrl}/calculate-irt`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(irtApiKey ? { 'Authorization': `Bearer ${irtApiKey}` } : {}),
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(120_000), // 120s timeout (R service cold start can take 30-60s)
        });

        const fetchDuration = Date.now() - fetchStartTime;
        logExternalApi('irt-r-service', '/calculate-irt', response.status, fetchDuration, { testId });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`IRT Service returned ${response.status}: ${errorText}`);
        }

        const resultData: any = await response.json();

        // Expected: { students: [{ name: "trial_id", theta_vi: ..., score0_300_vi: ... }, ...], items: ... }
        if (!resultData || !resultData.students) {
            throw new Error('Invalid response from IRT service');
        }

        // 5. Update Trials with Processed Scores
        const studentsScores = resultData.students;
        console.log(`[IRT Processor] Received scores for ${studentsScores.length} students.`);

        const updatePromises = studentsScores.map(async (studentScore: any) => {
            const trialId = studentScore.name;
            await prisma.trial.update({
                where: { trial_id: trialId },
                data: {
                    processed_score: studentScore as any,
                },
            });
        });

        await Promise.all(updatePromises);

        const totalDuration = Date.now() - startTime;
        logPerformance('irt_direct_processing', totalDuration, 30000, {
            testId,
            trialsCount: studentsScores.length,
            questionsCount: questions.length,
        });

        console.log(`✅ [IRT Processor] Completed for test ${testId}: ${studentsScores.length} trials processed in ${totalDuration}ms`);

        return { success: true, processed: studentsScores.length };

    } catch (error: any) {
        const duration = Date.now() - startTime;
        logError(error, {
            context: 'irt_direct_processing',
            testId,
            duration_ms: duration,
        });

        if (error.cause) {
            console.error('[IRT Processor] Cause:', error.cause);
        }

        console.error(`❌ [IRT Processor] Failed for test ${testId}:`, error.message);
        throw error;
    }
}
