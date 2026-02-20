"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = require("fastify");
const prisma_1 = require("./lib/prisma");
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const auth_routes_1 = require("./routes/auth.routes");
const user_routes_1 = require("./routes/user.routes");
const test_routes_1 = require("./routes/test.routes");
const trial_routes_1 = require("./routes/trial.routes");
const response_routes_1 = require("./routes/response.routes");
const teacher_routes_1 = require("./routes/teacher.routes");
const leaderboard_routes_1 = require("./routes/leaderboard.routes");
const news_routes_1 = require("./routes/news.routes");
const notification_routes_1 = require("./routes/notification.routes");
const overview_routes_1 = require("./routes/overview.routes");
const logger_1 = require("./utils/logger");
// Initialize Prisma (resilient singleton with auto-reconnect)
const prisma = (0, prisma_1.getPrismaClient)();
// Initialize Fastify server
const server = (0, fastify_1.fastify)({
    logger: true
});
// Decorate server with prisma for use in routes
server.decorate('prisma', prisma);
// Setup Redis connection (optional)
const redisConnection = process.env.REDIS_URL
    ? new ioredis_1.default(process.env.REDIS_URL, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        retryStrategy: (times) => Math.min(times * 50, 2000),
    })
    : undefined;
// Setup queues (optional - only if Redis is available)
const scoringQueue = redisConnection
    ? new bullmq_1.Queue('scoring-queue', { connection: redisConnection })
    : null;
// Log Redis connection status
if (redisConnection) {
    redisConnection.on('connect', () => {
        logger_1.logger.info('Redis connected');
    });
    redisConnection.on('error', (err) => {
        logger_1.logger.error('Redis connection error', { error: err.message });
    });
}
else {
    logger_1.logger.warn('Redis not configured - queue features disabled');
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
    request.startTime = Date.now();
});
server.addHook('onResponse', async (request, reply) => {
    const duration = Date.now() - (request.startTime || Date.now());
    const userId = request.user?.id || request.user?.user_id;
    (0, logger_1.logRequest)(request.method, request.url, reply.statusCode, duration, userId);
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
    const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        redis: 'not configured',
        uptime: process.uptime(),
    };
    // Test database (with retry reconnect on failure)
    try {
        await prisma.$queryRaw `SELECT 1`;
        health.database = 'connected';
    }
    catch (error) {
        console.error('Database health check failed, attempting reconnect with retry:', error.message);
        const reconnected = await (0, prisma_1.reconnectWithRetry)(3); // 3 retries for health check (faster)
        if (reconnected) {
            health.database = 'reconnected';
        }
        else {
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
        }
        catch (error) {
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
    }
    catch (error) {
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
server.register(auth_routes_1.authRoutes);
server.register(user_routes_1.userRoutes);
server.register(test_routes_1.testRoutes);
server.register(trial_routes_1.trialRoutes);
server.register(response_routes_1.responseRoutes);
server.register(teacher_routes_1.teacherRoutes);
server.register(leaderboard_routes_1.leaderboardRoutes);
server.register(news_routes_1.newsRoutes);
server.register(notification_routes_1.notificationRoutes);
server.register(overview_routes_1.overviewRoutes);
// ============ Job Queue Endpoints ============
// Submit scoring job
server.post('/api/jobs/score-test', async (request, reply) => {
    if (!scoringQueue) {
        return reply.code(503).send({
            error: 'Queue service unavailable',
            message: 'Redis connection not configured'
        });
    }
    const { trialId, userId } = request.body;
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
    }
    catch (error) {
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
    const { jobId } = request.params;
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
    }
    catch (error) {
        return reply.code(500).send({
            error: 'Failed to get job status',
            message: error.message
        });
    }
});
// ============ Graceful Shutdown ============
const closeGracefully = async (signal) => {
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
    }
    catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
    }
};
process.on('SIGINT', () => closeGracefully('SIGINT'));
process.on('SIGTERM', () => closeGracefully('SIGTERM'));
exports.default = server;
