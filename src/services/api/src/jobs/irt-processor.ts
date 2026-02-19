import { PrismaClient, Prisma } from '@prisma/client';
import { logExternalApi, logPerformance, logError } from '../utils/logger';
import { createNotification } from '../routes/notification.routes';
import IORedis from 'ioredis';

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
    testId: string,
    redis?: IORedis | null
): Promise<{ success: boolean; processed: number; message?: string }> {
    const startTime = Date.now();

    console.log(`[IRT Processor] Starting IRT calculation for test: ${testId}`);

    try {
        // 1. Fetch Questions
        // question_id format: "{testId}_{index}" where index is 1-based integer.
        // IMPORTANT: Must sort NUMERICALLY by the index suffix, NOT by string.
        // String sort of "_1","_10","_100"... completely scrambles section assignment.
        const questionsUnsorted = await prisma.question.findMany({
            where: { test_id: testId },
        });

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
        console.log(`[IRT Processor] Calling R service...`);

        const response = await fetch(`${irtApiUrl}/calculate-irt`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(irtApiKey ? { 'Authorization': `Bearer ${irtApiKey}` } : {}),
            },
            body: JSON.stringify(payload),
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

        // 6. Notify each student that their score is ready
        const testInfo = await prisma.test.findUnique({
            where: { test_id: testId },
            select: { title: true },
        });
        const testTitle = testInfo?.title || testId;

        // Get unique student IDs from trials
        const studentIds = [...new Set(trials.map(t => t.student_id))];
        console.log(`[IRT Processor] Sending score notifications to ${studentIds.length} students...`);

        for (const studentId of studentIds) {
            await createNotification(prisma, redis || null, {
                title: `📊 Kết quả ${testTitle} đã có!`,
                message: `Điểm IRT cho đề thi "${testTitle}" đã được xử lý. Xem kết quả ngay!`,
                type: 'score',
                link: '/result',
                userId: studentId,
            });
        }

        const totalDuration = Date.now() - startTime;
        logPerformance('irt_direct_processing', totalDuration, 30000, {
            testId,
            trialsCount: studentsScores.length,
            questionsCount: questions.length,
        });

        console.log(`✅ [IRT Processor] Completed for test ${testId}: ${studentsScores.length} trials processed, ${studentIds.length} notifications sent in ${totalDuration}ms`);

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
