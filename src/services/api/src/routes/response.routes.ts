import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { logExam, logError, logPerformance } from '../utils/logger';
import { createNotification } from './notification.routes';

const createResponsesSchema = z.object({
  trialId: z.string().min(1),
  responses: z.array(
    z.object({
      questionId: z.string().min(1),
      chosenOption: z.string().optional().nullable(),
      responseTime: z.number().min(0),
    })
  ).min(1),
});

export async function responseRoutes(server: FastifyInstance) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_API!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get all responses
  server.get('/api/responses', async (request, reply) => {
    try {
      const responses = await server.prisma.response.findMany({
        include: {
          trial: {
            select: {
              trial_id: true,
              student_id: true,
              test_id: true
            }
          }
        }
      });
      return { data: responses, count: responses.length };
    } catch (error) {
      reply.status(500);
      return {
        error: error instanceof Error ? error.message : 'Failed to fetch responses'
      };
    }
  });

  // Create response
  server.post('/api/responses', async (request, reply) => {
    const startTime = Date.now();
    try {
      const parsed = createResponsesSchema.safeParse(request.body);
      console.log('Received response submission:', parsed.data?.trialId);
      if (!parsed.success) {
        reply.status(422);
        return { error: 'invalid_input', details: parsed.error.flatten() };
      }

      const { trialId, responses } = parsed.data;

      // ensure trial exists
      const trial = await server.prisma.trial.findUnique({
        where: { trial_id: trialId },
      });

      if (!trial) {
        reply.status(404);
        return { error: 'trial_not_found' };
      }

      logExam('submit', trial.test_id, trial.student_id, {
        trialId,
        responseCount: responses.length
      });

      // prepare rows
      const rows = responses.map(r => ({
        trial_id: trialId,
        question_id: r.questionId,
        chosen_option: r.chosenOption ?? null,
        response_time: r.responseTime,
      }));

      // SCORING LOGIC
      // 1. Fetch correct answers via Supabase (skipping Prisma as model is not in schema)
      const { data: questions, error: qError } = await supabase
        .from('Question')
        .select('*')
        .eq('test_id', trial.test_id);

      if (qError) {
        console.error('Error fetching questions for scoring:', qError);
      }

      // 1.5. Satisfy Foreign Key constraint: ensure all submitted questions exist in Question table
      const existingQIds = new Set((questions || []).map((q: any) => q.question_id));
      const missingQuestions = rows
        .filter(r => !existingQIds.has(r.question_id))
        .map(r => ({
          question_id: r.question_id,
          test_id: trial.test_id,
          relative_score: 1,
          correct_option: null
        }));

      if (missingQuestions.length > 0) {
        try {
          await server.prisma.question.createMany({
            data: missingQuestions,
            skipDuplicates: true
          });
        } catch (e) {
          console.error('Error creating missing questions:', e);
        }
      }

      // Map question_id -> correct_option
      const questionMap = new Map<string, string>();
      (questions || []).forEach((q: any) => {
        if (q.correct_option) questionMap.set(q.question_id, q.correct_option);
      });

      // 2. Calculate scores
      let vie = 0, eng = 0, mth = 0, sci = 0;

      for (const r of rows) {
        const correct = questionMap.get(r.question_id);
        if (correct && r.chosen_option === correct) {
          // Parse index from question_id (format: testId_index)
          const parts = r.question_id.split('_');
          const index = parseInt(parts[parts.length - 1], 10);

          if (!isNaN(index)) {
            if (index >= 1 && index <= 30) vie++;
            else if (index >= 31 && index <= 60) eng++;
            else if (index >= 61 && index <= 90) mth++;
            else if (index >= 91 && index <= 120) sci++;
          }
        }
      }

      const totalScore = vie + eng + mth + sci;
      const totalQuestions = questions ? questions.length : 120;

      const tacticData = {
        total: `${totalScore}/${totalQuestions}`,
        Vie_score: vie,
        Eng_score: eng,
        Mth_score: mth,
        Sci_score: sci
      };

      console.log(`Scoring result for trial ${trialId}:`, tacticData, `Total: ${totalScore}`);

      // insert all responses in a transaction
      //delete existing responses for the trial first
      await server.prisma.response.deleteMany({
        where: { trial_id: trialId },
      });
      const [createdResponses] = await server.prisma.$transaction([
        server.prisma.response.createMany({
          data: rows
        }),
        server.prisma.trial.update({
          where: { trial_id: trialId },
          data: {
            raw_score: tacticData as any, // Save JSON breakdown here
            end_time: new Date(),
            // processed_score is reserved for IRT, not updated here
          }
        })
      ]);

      const duration = Date.now() - startTime;
      logPerformance('submit_exam', duration, 1000, {
        trialId,
        totalScore,
        responseCount: rows.length
      });

      // Send notification for practice tests (exam notifications sent after IRT)
      const testInfo = await server.prisma.test.findUnique({
        where: { test_id: trial.test_id },
        select: { type: true, title: true },
      });

      if (testInfo?.type === 'practice') {
        await createNotification(server.prisma, server.redis || null, {
          title: `📝 Kết quả ${testInfo.title}`,
          message: `Bạn đạt ${totalScore}/${totalQuestions} điểm. Xem chi tiết ngay!`,
          type: 'score',
          link: '/result',
          userId: trial.student_id,
        });
      }

      reply.status(201);
      return { data: { count: rows.length, scores: tacticData, total: totalScore } };
    } catch (error) {
      logError(error as Error, {
        context: 'submit_exam',
        trialId: (request.body as any)?.trialId
      });
      reply.status(500);
      return {
        error: error instanceof Error ? error.message : 'Failed to create responses'
      };
    }
  });
}
