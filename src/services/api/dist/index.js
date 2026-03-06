"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const server_1 = __importDefault(require("./server"));
const irt_scheduler_1 = require("./jobs/irt-scheduler");
const prisma_1 = require("./lib/prisma");
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const HOST = process.env.HOST || '0.0.0.0';
const start = async () => {
    try {
        // DEBUG: Log database URL host to verify env var
        const dbUrl = process.env.DATABASE_URL || 'NOT SET';
        const maskedUrl = dbUrl.replace(/\/\/.*@/, '//***@');
        console.log(`[DEBUG] DATABASE_URL = ${maskedUrl}`);
        console.log(`[DEBUG] DIRECT_URL = ${(process.env.DIRECT_URL || 'NOT SET').replace(/\/\/.*@/, '//***@')}`);
        await server_1.default.listen({ port: PORT, host: HOST });
        console.log(`API server running on http://${HOST}:${PORT}`);
        console.log(`Health check: http://${HOST}:${PORT}/health`);
        // Start database keepalive pings (every 4 min to prevent Supabase idle disconnect)
        (0, prisma_1.startKeepAlive)();
        // Start IRT scheduler for automatic exam grading (pass shared Prisma & Redis)
        (0, irt_scheduler_1.startIRTScheduler)(server_1.default.prisma, server_1.default.redis);
    }
    catch (err) {
        server_1.default.log.error(err);
        process.exit(1);
    }
};
// Graceful shutdown handler
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    (0, prisma_1.stopKeepAlive)();
    await (0, irt_scheduler_1.stopIRTScheduler)();
    await (0, prisma_1.disconnectPrisma)();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    (0, prisma_1.stopKeepAlive)();
    await (0, irt_scheduler_1.stopIRTScheduler)();
    await (0, prisma_1.disconnectPrisma)();
    process.exit(0);
});
start();
