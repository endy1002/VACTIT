"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.overviewRoutes = overviewRoutes;
// Hàm tính điểm từ JSONB
const calculateTotalScore = (processedScore) => {
    if (!processedScore || typeof processedScore !== 'object')
        return 0;
    const s1 = Math.round(Number(processedScore.score0_300_en) || 0);
    const s2 = Math.round(Number(processedScore.score0_300_vi) || 0);
    const s3 = Math.round(Number(processedScore.score0_300_sci) || 0);
    const s4 = Math.round(Number(processedScore.score0_300_math) || 0);
    return s1 + s2 + s3 + s4;
};
async function overviewRoutes(server) {
    /**
     * Aggregated endpoint for /overview page
     * Combines leaderboard + user stats in ONE request
     * Reduces 3 API calls to 1
     */
    server.get('/api/overview-data', async (request, reply) => {
        try {
            const { userId } = request.query;
            // ✅ Check Redis cache first
            const CACHE_TTL = 60; // 60 seconds
            const cacheKey = `overview:${userId || 'guest'}`;
            if (server.redis) {
                try {
                    const cached = await server.redis.get(cacheKey);
                    if (cached) {
                        console.log(`Cache HIT for ${cacheKey}`);
                        return JSON.parse(cached);
                    }
                    console.log(`Cache MISS for ${cacheKey}`);
                }
                catch (cacheErr) {
                    console.error('Cache read error:', cacheErr);
                }
            }
            // ✅ Run ALL queries in parallel
            const [latestExam, totalTests, userTrials] = await Promise.all([
                // 1. Get latest exam for leaderboard
                server.prisma.test.findFirst({
                    where: { type: 'exam' },
                    orderBy: { start_time: 'desc' },
                    select: { test_id: true, title: true }
                }),
                // 2. Count total tests (for stats)
                server.prisma.test.count(),
                // 3. Get user's trials (for stats) - only if userId provided
                userId
                    ? server.prisma.trial.findMany({
                        where: { student_id: userId },
                        select: { test_id: true, start_time: true, end_time: true }
                    })
                    : Promise.resolve([])
            ]);
            // ===== BUILD LEADERBOARD =====
            let leaderboard = [];
            let testInfo = null;
            if (latestExam) {
                const trials = await server.prisma.trial.findMany({
                    where: { test_id: latestExam.test_id },
                    include: {
                        student: { select: { user_id: true, name: true, avatar_url: true } }
                    }
                });
                const results = trials.map(trial => {
                    const totalScore = calculateTotalScore(trial.processed_score);
                    const start = new Date(trial.start_time).getTime();
                    const end = trial.end_time ? new Date(trial.end_time).getTime() : new Date().getTime();
                    const durationMinutes = Math.floor((end - start) / 60000);
                    const durationSeconds = Math.floor((end - start) / 1000) % 60;
                    return {
                        userId: trial.student_id,
                        name: trial.student?.name || 'Ẩn danh',
                        avatar: trial.student?.avatar_url || null,
                        score: totalScore,
                        timeMinutes: durationMinutes,
                        timeSeconds: durationSeconds,
                        date: trial.end_time || trial.start_time
                    };
                });
                // Best result per user
                const bestResultsByUser = new Map();
                results.forEach(record => {
                    const currentBest = bestResultsByUser.get(record.userId);
                    if (!currentBest) {
                        bestResultsByUser.set(record.userId, record);
                    }
                    else if (record.score > currentBest.score) {
                        bestResultsByUser.set(record.userId, record);
                    }
                    else if (record.score === currentBest.score &&
                        record.timeMinutes * 60 + record.timeSeconds < currentBest.timeMinutes * 60 + currentBest.timeSeconds) {
                        bestResultsByUser.set(record.userId, record);
                    }
                });
                leaderboard = Array.from(bestResultsByUser.values())
                    .sort((a, b) => {
                    if (b.score !== a.score)
                        return b.score - a.score;
                    return (a.timeMinutes * 60 + a.timeSeconds) - (b.timeMinutes * 60 + b.timeSeconds);
                })
                    .slice(0, 7)
                    .map(item => ({
                    id: item.userId,
                    name: item.name,
                    avatar: item.avatar,
                    score: item.score,
                    time: `${item.timeMinutes}:${item.timeSeconds.toString().padStart(2, '0')}`,
                    date: item.date
                }));
                testInfo = { testId: latestExam.test_id, title: latestExam.title };
            }
            // ===== BUILD USER STATS =====
            const uniqueTestsCompleted = new Set(userTrials.map(t => t.test_id)).size;
            let totalTimeSpent = 0;
            for (const trial of userTrials) {
                if (trial.start_time && trial.end_time) {
                    const start = new Date(trial.start_time).getTime();
                    const end = new Date(trial.end_time).getTime();
                    if (end > start)
                        totalTimeSpent += (end - start) / 1000;
                }
            }
            // Frequency data for last 7 days
            const now = new Date();
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const recentTrials = userTrials.filter(t => new Date(t.start_time) >= sevenDaysAgo);
            const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
            const frequencyData = [];
            for (let i = 6; i >= 0; i--) {
                const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
                const dateStr = date.toISOString().split('T')[0];
                const dayLabel = dayNames[date.getDay()];
                const count = recentTrials.filter(t => new Date(t.start_time).toISOString().split('T')[0] === dateStr).length;
                frequencyData.push({ date: dateStr, count, dayLabel });
            }
            const formatTime = (seconds) => {
                const hours = Math.floor(seconds / 3600);
                const minutes = Math.floor((seconds % 3600) / 60);
                const secs = Math.floor(seconds % 60);
                if (hours > 0) {
                    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                }
                return `${minutes}:${secs.toString().padStart(2, '0')}`;
            };
            const stats = {
                testsCompleted: uniqueTestsCompleted,
                totalTests,
                totalTimeSpent: Math.floor(totalTimeSpent),
                totalTimeFormatted: formatTime(totalTimeSpent),
                frequencyData,
                totalTrials: userTrials.length
            };
            // ===== RESPONSE =====
            const response = {
                leaderboard,
                testInfo,
                stats
            };
            // ✅ Cache the result
            if (server.redis) {
                try {
                    await server.redis.setex(cacheKey, CACHE_TTL, JSON.stringify(response));
                    console.log(`💾 Cached ${cacheKey} for ${CACHE_TTL}s`);
                }
                catch (cacheErr) {
                    console.error('Cache write error:', cacheErr);
                }
            }
            return response;
        }
        catch (error) {
            server.log.error(error);
            return reply.status(500).send({ error: 'Failed to fetch overview data' });
        }
    });
}
