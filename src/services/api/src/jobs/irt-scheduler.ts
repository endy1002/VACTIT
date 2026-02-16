import cron from 'node-cron';
import { PrismaClient, Prisma } from '@prisma/client';
import IORedis from 'ioredis';
import { logError } from '../utils/logger';
import { processIRTForExam } from './irt-processor';

let redis: IORedis | null = null;
let prismaInstance: PrismaClient | null = null;

/**
 * Scheduled job to check for exams that reached due_time and trigger IRT calculation.
 * Runs every minute. Uses Redis lock if available to prevent duplicate triggers.
 * Calls R Service directly (no BullMQ worker needed).
 *
 * @param prisma - Shared Prisma client instance from server
 * @param redisClient - Optional shared Redis client for distributed locking
 */
export function startIRTScheduler(prisma: PrismaClient, redisClient?: IORedis) {
  prismaInstance = prisma;
  redis = redisClient || null;

  const schedule = process.env.IRT_SCHEDULER_CRON || '* * * * *';

  console.log(`📅 Starting IRT scheduler (${schedule})...`);

  cron.schedule(schedule, async () => {
    const lockKey = 'irt-scheduler:lock';
    const lockTTL = 55;

    try {
      // Distributed lock (only if Redis available)
      if (redis) {
        try {
          const acquired = await redis.set(lockKey, Date.now().toString(), 'EX', lockTTL, 'NX');
          if (!acquired) {
            return; // Another instance is already processing
          }
          console.log('🔒 Acquired scheduler lock, checking for exams...');
        } catch (redisErr) {
          // Redis unavailable — proceed without lock (single instance assumed)
          console.warn('[Scheduler] Redis lock unavailable, proceeding without lock');
        }
      }

      const now = new Date();

      console.log('[Scheduler] Time check:', {
        nowUTC: now.toISOString(),
        nowVietnam: now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false })
      });

      if (!prismaInstance) {
        throw new Error('Prisma instance not initialized');
      }

      // DEBUG: Check each condition separately to find what's failing
      const allExams = await prismaInstance.test.findMany({
        where: { type: 'exam' },
        select: { test_id: true, title: true, type: true, due_time: true, _count: { select: { trials: true } } },
      });
      console.log('[Scheduler DEBUG] All exams:', allExams.map(e => ({
        id: e.test_id, title: e.title, type: e.type, due_time: e.due_time, trialsCount: e._count.trials
      })));

      const pastDueExams = await prismaInstance.test.findMany({
        where: { type: 'exam', due_time: { lte: now } },
        select: { test_id: true, title: true, due_time: true },
      });
      console.log('[Scheduler DEBUG] Exams past due_time:', pastDueExams);

      // Check trials with null processed_score for those exams
      if (pastDueExams.length > 0) {
        for (const exam of pastDueExams) {
          const trialsWithNullScore = await prismaInstance.trial.findMany({
            where: { test_id: exam.test_id, processed_score: { equals: Prisma.AnyNull } },
            select: { trial_id: true, processed_score: true },
          });
          console.log(`[Scheduler DEBUG] Exam ${exam.test_id}: ${trialsWithNullScore.length} trials with null processed_score`);

          // Also check what processed_score actually looks like
          const allTrials = await prismaInstance.trial.findMany({
            where: { test_id: exam.test_id },
            select: { trial_id: true, processed_score: true },
          });
          console.log(`[Scheduler DEBUG] Exam ${exam.test_id}: ALL trials processed_score values:`,
            allTrials.map(t => ({ id: t.trial_id, score: t.processed_score }))
          );
        }
      }

      // Find exams: type='exam', due_time passed, has unprocessed trials
      const examsNeedingIRT = await prismaInstance.test.findMany({
        where: {
          type: 'exam',
          due_time: {
            lte: now,
          },
          trials: {
            some: {
              processed_score: { equals: Prisma.AnyNull },
            },
          },
        },
        include: {
          trials: {
            where: {
              processed_score: { equals: Prisma.AnyNull },
            },
            select: {
              trial_id: true,
            },
          },
        },
      });

      if (examsNeedingIRT.length === 0) {
        console.log('[Scheduler] No exams need IRT calculation at this time');
        return;
      }

      console.log(`🔍 Found ${examsNeedingIRT.length} exam(s) past due time:`,
        examsNeedingIRT.map(e => ({
          id: e.test_id,
          title: e.title,
          due_time: e.due_time,
          trials_pending: e.trials.length
        }))
      );

      // Process each exam sequentially (direct call, no queue)
      for (const exam of examsNeedingIRT) {
        try {
          console.log(`🚀 Processing IRT for exam: ${exam.test_id} (${exam.title}) - ${exam.trials.length} trial(s) pending`);

          const result = await processIRTForExam(prismaInstance, exam.test_id);

          console.log(`✅ IRT completed for exam: ${exam.test_id} - ${result.processed} trial(s) processed`);
        } catch (examError: any) {
          // Log error but continue with next exam
          console.error(`❌ IRT failed for exam ${exam.test_id}:`, examError.message);
          logError(examError, {
            context: 'irt_scheduler_exam',
            testId: exam.test_id,
          });
        }
      }

    } catch (error) {
      console.error('❌ IRT Scheduler error:', error);
      logError(error as Error, {
        context: 'irt_scheduler',
      });
    } finally {
      // Release lock if Redis available
      if (redis) {
        try {
          await redis.del(lockKey);
        } catch (unlockError) {
          console.error('Failed to release scheduler lock:', unlockError);
        }
      }
    }
  });

  console.log('✅ IRT scheduler started successfully');
}

/**
 * Graceful shutdown handler
 */
export async function stopIRTScheduler() {
  // Redis is shared from server — don't disconnect here
  console.log('⏹  IRT scheduler stopped');
}
