import "dotenv/config";
import server from './server';
import { startIRTScheduler, stopIRTScheduler } from './jobs/irt-scheduler';
import { startKeepAlive, stopKeepAlive, disconnectPrisma } from './lib/prisma';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const HOST = process.env.HOST || '0.0.0.0';

const start = async () => {
  try {
    // DEBUG: Log database URL host to verify env var
    const dbUrl = process.env.DATABASE_URL || 'NOT SET';
    const maskedUrl = dbUrl.replace(/\/\/.*@/, '//***@');
    console.log(`[DEBUG] DATABASE_URL = ${maskedUrl}`);
    console.log(`[DEBUG] DIRECT_URL = ${(process.env.DIRECT_URL || 'NOT SET').replace(/\/\/.*@/, '//***@')}`);

    await server.listen({ port: PORT, host: HOST });
    console.log(`API server running on http://${HOST}:${PORT}`);
    console.log(`Health check: http://${HOST}:${PORT}/health`);

    // Start database keepalive pings (every 4 min to prevent Supabase idle disconnect)
    startKeepAlive();

    // Start IRT scheduler for automatic exam grading (pass shared Prisma & Redis)
    startIRTScheduler(server.prisma, server.redis);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown handler
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  stopKeepAlive();
  await stopIRTScheduler();
  await disconnectPrisma();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  stopKeepAlive();
  await stopIRTScheduler();
  await disconnectPrisma();
  process.exit(0);
});

start();
