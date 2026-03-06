"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPrismaClient = getPrismaClient;
exports.startKeepAlive = startKeepAlive;
exports.stopKeepAlive = stopKeepAlive;
exports.disconnectPrisma = disconnectPrisma;
exports.reconnectWithRetry = reconnectWithRetry;
const client_1 = require("@prisma/client");
/**
 * Resilient Prisma Client with:
 * - Singleton pattern (avoid connection pool exhaustion)
 * - KeepAlive pings (prevent Supabase idle disconnect)
 * - Auto-reconnect with exponential backoff retry
 */
let prisma;
let keepAliveInterval = null;
function createPrismaClient() {
    const client = new client_1.PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
        datasources: {
            db: {
                url: process.env.DATABASE_URL,
            },
        },
    });
    return client;
}
/**
 * Get or create the singleton Prisma client
 */
function getPrismaClient() {
    if (!prisma) {
        prisma = createPrismaClient();
        console.log('[Prisma] Client created');
    }
    return prisma;
}
/**
 * Attempt to reconnect with exponential backoff.
 * Retries up to `maxRetries` times with increasing delay.
 *
 * Delay pattern: 2s → 4s → 8s → 16s → 32s (total ~62s coverage)
 */
async function reconnectWithRetry(maxRetries = 5) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const delay = Math.min(2000 * Math.pow(2, attempt - 1), 30000); // 2s, 4s, 8s, 16s, 30s
        try {
            await prisma.$disconnect();
            await prisma.$connect();
            await prisma.$queryRaw `SELECT 1`;
            console.log(`[Prisma] ✅ Reconnected on attempt ${attempt}/${maxRetries}`);
            return true;
        }
        catch (error) {
            console.warn(`[Prisma] Reconnect attempt ${attempt}/${maxRetries} failed: ${error.message}`);
            if (attempt < maxRetries) {
                console.log(`[Prisma] Waiting ${delay / 1000}s before next attempt...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    console.error(`[Prisma] ❌ All ${maxRetries} reconnect attempts failed`);
    return false;
}
/**
 * Start keepalive pings to prevent Supabase from dropping idle connections.
 * Pings every 4 minutes (Supabase free tier timeout is ~5 min).
 * On failure, retries with exponential backoff.
 */
function startKeepAlive(intervalMs = 4 * 60 * 1000) {
    if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
    }
    keepAliveInterval = setInterval(async () => {
        try {
            await prisma.$queryRaw `SELECT 1`;
            // Silently succeed
        }
        catch (error) {
            console.warn('[Prisma KeepAlive] Ping failed:', error.message);
            console.log('[Prisma KeepAlive] Starting reconnect with retry...');
            await reconnectWithRetry(5);
        }
    }, intervalMs);
    console.log(`[Prisma KeepAlive] Started (every ${intervalMs / 1000}s)`);
}
/**
 * Stop keepalive pings
 */
function stopKeepAlive() {
    if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
        console.log('[Prisma KeepAlive] Stopped');
    }
}
/**
 * Gracefully disconnect Prisma
 */
async function disconnectPrisma() {
    stopKeepAlive();
    if (prisma) {
        await prisma.$disconnect();
        console.log('[Prisma] Disconnected');
    }
}
