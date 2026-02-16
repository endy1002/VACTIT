import cron from 'node-cron';
import { PrismaClient, Prisma } from '@prisma/client';
import IORedis from 'ioredis';
import { logError } from '../utils/logger';
import { processIRTForExam } from './irt-processor';

let redis: IORedis | null = null;
let prismaInstance: PrismaClient | null = null;

// In-memory guard: tracks exam IDs currently being processed
// Prevents redundant re-triggers when processing takes longer than 1 minute
const processingExams = new Set<string>();

/**
 * Scheduled job to check for exams that reached due_time and trigger IRT calculation.
 * Runs every minute. Uses Redis lock if available to prevent duplicate triggers.
 * Uses in-memory Set to skip exams already being processed.
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

      // Find exams: type='exam', due_time passed, has unprocessed trials
      // processed_score can be: null (DbNull), JSON null, or {} (empty object)
      const examsNeedingIRT = await prismaInstance.test.findMany({
        where: {
          type: 'exam',
          due_time: {
            lte: now,
          },
          trials: {
            some: {
              OR: [
                { processed_score: { equals: Prisma.AnyNull } },
                { processed_score: { equals: {} } },
              ],
            },
          },
        },
        include: {
          trials: {
            where: {
              OR: [
                { processed_score: { equals: Prisma.AnyNull } },
                { processed_score: { equals: {} } },
              ],
            },
            select: {
              trial_id: true,
            },
          },
        },
      });

      if (examsNeedingIRT.length === 0) {
        console.log('[Scheduler] No exams need IRT calculation at this time');
        if (processingExams.size > 0) {
          console.log(`[Scheduler] (${processingExams.size} exam(s) still processing: ${[...processingExams].join(', ')})`);
        }
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

      // Process each exam — skip if already being processed
      for (const exam of examsNeedingIRT) {
        if (processingExams.has(exam.test_id)) {
          console.log(`⏳ Skipping exam ${exam.test_id} (${exam.title}) — already processing`);
          continue;
        }

        // Mark as processing BEFORE starting (non-blocking: fire and forget)
        processingExams.add(exam.test_id);
        console.log(`🚀 Processing IRT for exam: ${exam.test_id} (${exam.title}) - ${exam.trials.length} trial(s) pending`);

        // Fire and don't block the scheduler loop — let it finish so lock is released
        processIRTForExam(prismaInstance!, exam.test_id, redis)
          .then(result => {
            console.log(`✅ IRT completed for exam: ${exam.test_id} - ${result.processed} trial(s) processed`);
          })
          .catch(examError => {
            console.error(`❌ IRT failed for exam ${exam.test_id}:`, examError.message);
            logError(examError, {
              context: 'irt_scheduler_exam',
              testId: exam.test_id,
            });
          })
          .finally(() => {
            processingExams.delete(exam.test_id);
          });
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
  console.log('⏹  IRT scheduler stopped');
}
