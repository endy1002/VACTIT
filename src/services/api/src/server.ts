import { fastify } from 'fastify';
import { getPrismaClient, reconnectWithRetry } from './lib/prisma';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { authRoutes } from './routes/auth.routes';
import { userRoutes } from './routes/user.routes';
import { testRoutes } from './routes/test.routes';
import { trialRoutes } from './routes/trial.routes';
import { responseRoutes } from './routes/response.routes';
import { teacherRoutes } from './routes/teacher.routes';
import { leaderboardRoutes } from './routes/leaderboard.routes';
import { newsRoutes } from './routes/news.routes';
import { notificationRoutes } from './routes/notification.routes';
import { overviewRoutes } from './routes/overview.routes';
import { logger, logRequest } from './utils/logger';

// Initialize Prisma (resilient singleton with auto-reconnect)
const prisma = getPrismaClient();

// Initialize Fastify server
const server = fastify({
  logger: true
});

// Decorate server with prisma for use in routes
server.decorate('prisma', prisma);

// Setup Redis connection (optional)
const redisConnection = process.env.REDIS_URL
  ? new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (times) => Math.min(times * 50, 2000),
  })
  : undefined;

// Setup queues (optional - only if Redis is available)
const scoringQueue = redisConnection
  ? new Queue('scoring-queue', { connection: redisConnection })
  : null;

// Log Redis connection status
if (redisConnection) {
  redisConnection.on('connect', () => {
    logger.info('Redis connected');
  });
  redisConnection.on('error', (err) => {
    logger.error('Redis connection error', { error: err.message });
  });
} else {
  logger.warn('Redis not configured - queue features disabled');
}

// Decorate server with redis for caching in routes
server.decorate('redis', redisConnection);

// ============ Plugins ============
// CORS for frontend access
const getAllowedOrigins = () => {
  if (process.env.NODE_ENV !== 'production') {
    return true; // Allow all in development
  }

  // Support multiple origins (comma-separated)
  const frontendUrl = process.env.FRONTEND_URL || '';
  const origins = frontendUrl.split(',').map(url => url.trim()).filter(Boolean);

  console.log('[CORS] Allowed origins:', origins);

  if (origins.length === 0) {
    console.warn('[CORS] WARNING: No FRONTEND_URL configured, allowing all origins');
    return true;
  }

  return origins;
};

server.register(require('@fastify/cors'), {
  origin: getAllowedOrigins(),
  credentials: true,
});

// ============ Request Logging ============
server.addHook('onRequest', async (request) => {
  // Store start time for duration calculation
  (request as any).startTime = Date.now();
});

server.addHook('onResponse', async (request, reply) => {
  const duration = Date.now() - ((request as any).startTime || Date.now());
  const userId = (request as any).user?.id || (request as any).user?.user_id;

  logRequest(
    request.method,
    request.url,
    reply.statusCode,
    duration,
    userId
  );
});

// ============ Root & Health Endpoints ============
server.get('/', async () => {
  return {
    name: 'VACTIT API',
    status: 'ok',
    message: 'API is running',
    version: '1.0.0',
    links: {
      health: '/health',
      api: '/api',
      docs: '/api/docs'
    }
  };
});

server.get('/favicon.ico', async (request, reply) => {
  reply.status(204).send();
});

// Health check endpoint
server.get('/health', async (request, reply) => {
  const health: any = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: 'disconnected',
    redis: 'not configured',
    uptime: process.uptime(),
  };

  // Test database (with retry reconnect on failure)
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.database = 'connected';
  } catch (error: any) {
    console.error('Database health check failed, attempting reconnect with retry:', error.message);
    const reconnected = await reconnectWithRetry(3); // 3 retries for health check (faster)
    if (reconnected) {
      health.database = 'reconnected';
    } else {
      health.status = 'degraded';
      health.database = 'disconnected';
      health.databaseError = error.message;
    }
  }

  // Test Redis (if available)
  if (redisConnection) {
    try {
      await redisConnection.ping();
      health.redis = 'connected';
    } catch (error: any) {
      health.redis = 'disconnected';
    }
  }

  return reply.code(health.status === 'ok' ? 200 : 503).send(health);
});

// Queue health check
server.get('/health/queue', async (request, reply) => {
  if (!scoringQueue) {
    return reply.code(503).send({
      error: 'Queue not configured',
      redis: 'disconnected'
    });
  }

  try {
    const jobCounts = await scoringQueue.getJobCounts();

    return reply.send({
      status: 'ok',
      queue: 'scoring-queue',
      jobs: jobCounts,
    });
  } catch (error: any) {
    return reply.code(500).send({
      error: 'Failed to get queue status',
      message: error.message
    });
  }
});

// API Info endpoint
server.get('/api', async () => {
  return {
    name: 'VACTIT API',
    version: '1.0.0',
    endpoints: {
      auth: {
        signup: 'POST /api/auth/signup',
        login: 'POST /api/auth/login',
      },
      users: {
        list: 'GET /api/users',
        get: 'GET /api/users/:id',
        create: 'POST /api/users',
      },
      tests: {
        list: 'GET /api/tests',
        get: 'GET /api/tests/:id',
        create: 'POST /api/tests',
      },
      trials: {
        list: 'GET /api/trials',
        get: 'GET /api/trials/:id',
        create: 'POST /api/trials',
      },
      responses: {
        list: 'GET /api/responses',
        create: 'POST /api/responses',
      },
      jobs: {
        scoreTest: 'POST /api/jobs/score-test',
        status: 'GET /api/jobs/status/:jobId',
      }
    }
  };
});

// ============ Register Routes ============
server.register(authRoutes);
server.register(userRoutes);
server.register(testRoutes);
server.register(trialRoutes);
server.register(responseRoutes);
server.register(teacherRoutes);
server.register(leaderboardRoutes);
server.register(newsRoutes);
server.register(notificationRoutes);
server.register(overviewRoutes);
// ============ Job Queue Endpoints ============
// Submit scoring job
server.post('/api/jobs/score-test', async (request, reply) => {
  if (!scoringQueue) {
    return reply.code(503).send({
      error: 'Queue service unavailable',
      message: 'Redis connection not configured'
    });
  }

  const { trialId, userId } = request.body as any;

  if (!trialId || !userId) {
    return reply.code(400).send({
      error: 'Missing required fields',
      message: 'trialId and userId are required'
    });
  }

  try {
    const job = await scoringQueue.add('score-trial', {
      trialId,
      userId,
      timestamp: new Date().toISOString(),
    });

    return reply.code(202).send({
      message: 'Job queued for processing',
      jobId: job.id,
      data: job.data,
    });
  } catch (error: any) {
    return reply.code(500).send({
      error: 'Failed to queue job',
      message: error.message
    });
  }
});

// Get job status
server.get('/api/jobs/status/:jobId', async (request, reply) => {
  if (!scoringQueue) {
    return reply.code(503).send({ error: 'Queue service unavailable' });
  }

  const { jobId } = request.params as any;

  try {
    const job = await scoringQueue.getJob(jobId);

    if (!job) {
      return reply.code(404).send({ error: 'Job not found' });
    }

    const state = await job.getState();

    return reply.send({
      jobId: job.id,
      state,
      progress: job.progress,
      data: job.data,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason,
    });
  } catch (error: any) {
    return reply.code(500).send({
      error: 'Failed to get job status',
      message: error.message
    });
  }
});

// ============ Graceful Shutdown ============
const closeGracefully = async (signal: string) => {
  console.log(`\n🛑 Received signal ${signal}, closing server gracefully...`);

  try {
    await server.close();
    console.log('✅ Server closed');

    await prisma.$disconnect();
    console.log('✅ Database disconnected');

    if (redisConnection) {
      await redisConnection.quit();
      console.log('✅ Redis disconnected');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGINT', () => closeGracefully('SIGINT'));
process.on('SIGTERM', () => closeGracefully('SIGTERM'));

// Type augmentation for Fastify
import { PrismaClient } from '@prisma/client';
declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    redis: IORedis | undefined;
  }
}

export default server;
