import { FastifyInstance } from 'fastify';
import { generateTrialId } from '../utils/generateID';
import { z } from 'zod';

const createTrialSchema = z.object({
  testId: z.string().min(1),
  userId: z.string().optional(),
});

export async function trialRoutes(server: FastifyInstance) {
  // Get all trials
  server.get('/api/trials', async (request, reply) => {
    try {
      const trials = await server.prisma.trial.findMany({
        include: {
          student: {
            select: {
              user_id: true,
              name: true,
              email: true
            }
          },
          test: {
            select: {
              test_id: true,
              title: true,
              type: true
            }
          },
          _count: {
            select: { responses: true }
          }
        }
      });
      return { data: trials, count: trials.length };
    } catch (error) {
      reply.status(500);
      return {
        error: error instanceof Error ? error.message : 'Failed to fetch trials'
      };
    }
  });

  // Get trial by ID
  server.get<{ Params: { id: string }; Querystring: { userId?: string } }>(
    '/api/trials/:id',
    async (request, reply) => {
      try {
        const { id } = request.params;
        const requesterId = request.query.userId;
        console.log(`Fetching trial ${id} for requester ${requesterId}`);
        if (!requesterId) {
          reply.status(401);
          return { error: 'missing_user_id' };
        }

        const trial = await server.prisma.trial.findUnique({
          where: { trial_id: id },
          include: {
            student: {
              select: { user_id: true, name: true }
            },
            test: {
              select: {
                test_id: true,
                title: true,
                type: true,
                duration: true,
              },
            },
          }
        });

        if (!trial) {
          reply.status(404);
          return { error: 'Trial not found' };
        }

        if (trial.student?.user_id !== requesterId) {
          reply.status(403);
          return { error: 'forbidden' };
        }

        // Prevent re-entry for completed exams (has responses)
        const responseCount = await server.prisma.response.count({ where: { trial_id: id } });
        if (trial.test?.type === 'exam' && responseCount > 0) {
          reply.status(400);
          return { error: 'already_submitted' };
        }

        return {
          data: {
            ...trial,
            testDuration: trial.test?.duration ?? null,
          },
        };
      } catch (error) {
        reply.status(500);
        return {
          error: error instanceof Error ? error.message : 'Failed to fetch trial'
        };
      }
    }
  );

  // Get trials by student (with Redis cache)
  server.get<{ Params: { studentId: string } }>(
    '/api/students/:studentId/trials',
    async (request, reply) => {
      try {
        const { studentId } = request.params;

        // ✅ Check Redis cache first (30s TTL)
        const cacheKey = `student:${studentId}:trials`;
        const CACHE_TTL = 30;

        if (server.redis) {
          try {
            const cached = await server.redis.get(cacheKey);
            if (cached) {
              console.log(`✅ Cache HIT for student trials: ${studentId}`);
              return JSON.parse(cached);
            }
            console.log(`❌ Cache MISS for student trials: ${studentId}`);
          } catch (cacheErr) {
            console.error('Cache read error:', cacheErr);
          }
        }

        const trials = await server.prisma.trial.findMany({
          where: { student_id: studentId },
          orderBy: { start_time: 'desc' },
          include: {
            test: { select: { test_id: true, title: true, type: true, duration: true } },
            _count: { select: { responses: true } },
          },
        });

        const response = { data: trials, count: trials.length };

        // ✅ Cache result
        if (server.redis) {
          try {
            await server.redis.setex(cacheKey, CACHE_TTL, JSON.stringify(response));
          } catch (cacheErr) {
            console.error('Cache write error:', cacheErr);
          }
        }

        return response;
      } catch (error) {
        reply.status(500);
        return {
          error: error instanceof Error ? error.message : 'Failed to fetch student trials',
        };
      }
    }
  );

  // Get trial details with responses (with Redis cache)
  server.get<{ Params: { id: string } }>(
    "/api/trials/:id/details",
    async (request, reply) => {
      try {
        const trialId = request.params.id;

        // ✅ Check Redis cache first (60s TTL - longer since details rarely change)
        const cacheKey = `trial:${trialId}:details`;
        const CACHE_TTL = 60;

        if (server.redis) {
          try {
            const cached = await server.redis.get(cacheKey);
            if (cached) {
              console.log(`✅ Cache HIT for trial details: ${trialId}`);
              return JSON.parse(cached);
            }
            console.log(`❌ Cache MISS for trial details: ${trialId}`);
          } catch (cacheErr) {
            console.error('Cache read error:', cacheErr);
          }
        }

        const trial = await server.prisma.trial.findUnique({
          where: { trial_id: trialId },
          include: {
            test: { select: { test_id: true, title: true, duration: true, type: true } },
            responses: {
              select: {
                question_id: true,
                chosen_option: true,
                response_time: true,
                question: {
                  select: {
                    question_id: true,
                    correct_option: true,
                  },
                },
              },
            },
          },
        });

        if (!trial) {
          reply.status(404);
          return { error: "Trial not found" };
        }

        const response = { data: trial };

        // ✅ Cache result
        if (server.redis) {
          try {
            await server.redis.setex(cacheKey, CACHE_TTL, JSON.stringify(response));
          } catch (cacheErr) {
            console.error('Cache write error:', cacheErr);
          }
        }

        return response;
      } catch (error) {
        reply.status(500);
        return { error: error instanceof Error ? error.message : "Failed to fetch trial details" };
      }
    }
  );



  // Create trial
  server.post('/api/trials', async (request, reply) => {
    try {
      const parsed = createTrialSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.status(422);
        return { error: 'invalid_input', details: parsed.error.flatten() };
      }

      const { testId, userId } = parsed.data;

      // require a user id to enforce "one trial per user per test"
      if (!userId) {
        reply.status(400);
        return { error: 'missing_user_id' };
      }

      //  OPTIMIZED: Parallelize user and test verification
      const [student, test] = await Promise.all([
        server.prisma.user.findUnique({
          where: { user_id: userId },
          select: { user_id: true }
        }),
        server.prisma.test.findUnique({
          where: { test_id: testId },
        })
      ]);

      if (!student) {
        reply.status(404);
        return { error: 'student_not_found' };
      }

      if (!test) {
        reply.status(404);
        return { error: 'test_not_found' };
      }

      // Check if this user already has a trial for this test
      const existingTrialforExam = await server.prisma.trial.findFirst({
        where: {
          test_id: testId,
          student_id: userId,
          test: {
            type: "exam"
          }
        },
        select: {
          trial_id: true,
          test_id: true,
          test: {
            select: {
              title: true
            }
          },
          start_time: true,
          end_time: true
        }
      });
      console.log("existingTrialforExam", existingTrialforExam);

      if (existingTrialforExam) {
        reply.status(200);
        return { data: existingTrialforExam, alreadyDone: true };
      }

      const start = new Date();
      // duration is in minutes, default to 0 if null
      const end = new Date();
      const trialId = generateTrialId();

      const trial = await server.prisma.trial.create({
        data: {
          trial_id: trialId,
          start_time: start,
          end_time: end,
          student: { connect: { user_id: userId } },
          test: { connect: { test_id: testId } },
          raw_score: {},
          processed_score: {},
          tactic: {},
        },
        select: {
          trial_id: true,
          test_id: true,
          start_time: true,
          end_time: true,
        },
      });

      reply.status(201);
      return { data: trial, alreadyDone: false };
    } catch (error) {
      reply.status(500);
      return {
        error: error instanceof Error ? error.message : 'Failed to create trial',
      };
    }
  });

  server.post('/api/trials/cleanup', async (request, reply) => {
    try {
      let payload: any = request.body;
      // navigator.sendBeacon often sends a string body; try to parse if needed
      if (typeof payload === 'string') {
        try {
          payload = JSON.parse(payload);
        } catch {
          // leave as string -> not usable
        }
      }

      const trialId = payload?.trialId;
      if (!trialId) {
        reply.status(400);
        return { error: 'missing_trialId' };
      }

      const trial = await server.prisma.trial.findUnique({
        where: { trial_id: trialId },
        include: { test: true },
      });

      if (!trial) {
        reply.status(404);
        return { error: 'trial_not_found' };
      }

      if (trial.test?.type !== 'practice') {
        // do nothing for exam trials
        return { data: { deleted: false, reason: 'not_practice' } };
      }

      await server.prisma.trial.delete({ where: { trial_id: trialId } });
      return { data: { deleted: true } };
    } catch (error) {
      reply.status(500);
      return { error: error instanceof Error ? error.message : 'Failed to cleanup trial' };
    }
  });

}
