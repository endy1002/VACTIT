import { PrismaClient } from '@prisma/client';

/**
 * Resilient Prisma Client with auto-reconnect capability.
 * 
 * - Implements keepalive pings to prevent idle connection drops (Supabase free tier)
 * - Singleton pattern to avoid creating multiple instances / connection pool exhaustion
 * - Auto-reconnect via keepalive on ping failure
 */

let prisma: PrismaClient;
let keepAliveInterval: NodeJS.Timer | null = null;

function createPrismaClient(): PrismaClient {
    const client = new PrismaClient({
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
export function getPrismaClient(): PrismaClient {
    if (!prisma) {
        prisma = createPrismaClient();
        console.log('[Prisma] Client created');
    }
    return prisma;
}

/**
 * Start keepalive pings to prevent Supabase from dropping idle connections.
 * Pings every 4 minutes (Supabase free tier timeout is ~5 min).
 * Also attempts auto-reconnect on failure.
 */
export function startKeepAlive(intervalMs = 4 * 60 * 1000) {
    if (keepAliveInterval) {
        clearInterval(keepAliveInterval as any);
    }

    keepAliveInterval = setInterval(async () => {
        try {
            await prisma.$queryRaw`SELECT 1`;
            // Silently succeed - no need to log every ping
        } catch (error: any) {
            console.warn('[Prisma KeepAlive] Ping failed, attempting reconnect:', error.message);
            try {
                await prisma.$disconnect();
                await prisma.$connect();
                console.log('[Prisma KeepAlive] ✅ Reconnected after failed ping');
            } catch (reconnectError: any) {
                console.error('[Prisma KeepAlive] ❌ Reconnect failed:', reconnectError.message);
            }
        }
    }, intervalMs);

    console.log(`[Prisma KeepAlive] Started (every ${intervalMs / 1000}s)`);
}

/**
 * Stop keepalive pings
 */
export function stopKeepAlive() {
    if (keepAliveInterval) {
        clearInterval(keepAliveInterval as any);
        keepAliveInterval = null;
        console.log('[Prisma KeepAlive] Stopped');
    }
}

/**
 * Gracefully disconnect Prisma
 */
export async function disconnectPrisma() {
    stopKeepAlive();
    if (prisma) {
        await prisma.$disconnect();
        console.log('[Prisma] Disconnected');
    }
}
