"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leaderboardRoutes = leaderboardRoutes;
// Hàm tính điểm từ JSONB (an toàn với dữ liệu null/undefined)
const calculateTotalScore = (processedScore) => {
    if (!processedScore || typeof processedScore !== 'object')
        return 0;
    // Lấy giá trị, nếu không có thì mặc định là 0, sau đó làm tròn
    const s1 = Math.round(Number(processedScore.score0_300_en) || 0);
    const s2 = Math.round(Number(processedScore.score0_300_vi) || 0);
    const s3 = Math.round(Number(processedScore.score0_300_sci) || 0);
    const s4 = Math.round(Number(processedScore.score0_300_math) || 0);
    // Tổng điểm cuối cùng
    return s1 + s2 + s3 + s4;
};
async function leaderboardRoutes(server) {
    // 1. Lấy danh sách các bài thi thật (Exam) để hiển thị lên Dropdown
    server.get('/api/leaderboard/exams', async (request, reply) => {
        try {
            const exams = await server.prisma.test.findMany({
                where: { type: 'exam' },
                select: { test_id: true, title: true },
                orderBy: { start_time: 'desc' }
            });
            return { data: exams };
        }
        catch (error) {
            server.log.error(error);
            return reply.status(500).send({ error: 'Failed to fetch exams' });
        }
    });
    // 2. Lấy Leaderboard của 1 bài thi cụ thể
    server.get('/api/leaderboard', async (request, reply) => {
        try {
            const { testId } = request.query;
            if (!testId) {
                return { data: [] }; // Không có testId thì trả về rỗng để tránh lỗi
            }
            //  OPTIMIZED: Check Redis cache first
            const CACHE_TTL = 60; // 60 seconds
            const cacheKey = `leaderboard:${testId}`;
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
            // Lấy tất cả các lượt thi (trial) của bài thi này
            const trials = await server.prisma.trial.findMany({
                where: {
                    test_id: testId,
                    test: { type: 'exam' } // Chỉ lấy bài thi thật
                },
                include: {
                    student: {
                        select: { user_id: true, name: true, avatar_url: true } // Lấy thông tin sinh viên
                    }
                }
            });
            // Map dữ liệu và tính điểm
            const results = trials.map(trial => {
                // Tính điểm từ processed_score (JSON)
                const totalScore = calculateTotalScore(trial.processed_score);
                // Tính thời gian làm bài (phút)
                const start = new Date(trial.start_time).getTime();
                const end = trial.end_time ? new Date(trial.end_time).getTime() : new Date().getTime();
                const durationMinutes = Math.floor((end - start) / 60000);
                return {
                    userId: trial.student_id,
                    name: trial.student?.name || 'Ẩn danh',
                    avatar: trial.student.avatar_url,
                    score: totalScore,
                    time: durationMinutes,
                    trialId: trial.trial_id
                };
            });
            // Lọc kết quả tốt nhất của mỗi User (nếu thi lại)
            // Logic: Điểm cao hơn lấy -> Nếu bằng điểm, lấy bài làm nhanh hơn
            const bestResultsByUser = new Map();
            results.forEach(record => {
                const currentBest = bestResultsByUser.get(record.userId);
                if (!currentBest) {
                    bestResultsByUser.set(record.userId, record);
                }
                else {
                    if (record.score > currentBest.score) {
                        bestResultsByUser.set(record.userId, record);
                    }
                    else if (record.score === currentBest.score && record.time < currentBest.time) {
                        bestResultsByUser.set(record.userId, record);
                    }
                }
            });
            // Chuyển về mảng và sắp xếp
            const leaderboard = Array.from(bestResultsByUser.values())
                .sort((a, b) => {
                // Ưu tiên điểm cao
                if (b.score !== a.score)
                    return b.score - a.score;
                // Nếu điểm bằng nhau, ưu tiên thời gian ngắn
                return a.time - b.time;
            })
                .map((item) => ({
                id: item.userId,
                name: item.name,
                avatar: item.avatar,
                score: item.score,
                examCount: 1,
                time: `${item.time}p`,
                trend: 'same'
            }));
            const response = { data: leaderboard };
            // ✅ OPTIMIZED: Cache result
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
            return reply.status(500).send({ error: 'Failed to fetch leaderboard' });
        }
    });
    // 3. Lấy Leaderboard của bài thi gần nhất
    server.get('/api/leaderboard/latest', async (request, reply) => {
        try {
            // ✅ OPTIMIZED: Check Redis cache first
            const CACHE_TTL = 120; // 2 minutes
            const cacheKey = 'leaderboard:latest';
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
            // Tìm bài thi gần nhất có type = 'exam'
            const latestExam = await server.prisma.test.findFirst({
                where: { type: 'exam' },
                orderBy: { start_time: 'desc' },
                select: { test_id: true, title: true }
            });
            if (!latestExam) {
                return { data: [], testInfo: null };
            }
            // Lấy trials của bài thi này
            const trials = await server.prisma.trial.findMany({
                where: { test_id: latestExam.test_id },
                include: {
                    student: {
                        select: { user_id: true, name: true, avatar_url: true }
                    }
                }
            });
            // Map và tính điểm
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
            // Lọc kết quả tốt nhất của mỗi User
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
            // Sắp xếp và format
            const leaderboard = Array.from(bestResultsByUser.values())
                .sort((a, b) => {
                if (b.score !== a.score)
                    return b.score - a.score;
                return (a.timeMinutes * 60 + a.timeSeconds) - (b.timeMinutes * 60 + b.timeSeconds);
            })
                .slice(0, 7) // Giới hạn top 7
                .map((item) => ({
                id: item.userId,
                name: item.name,
                avatar: item.avatar,
                score: item.score,
                time: `${item.timeMinutes}:${item.timeSeconds.toString().padStart(2, '0')}`,
                date: item.date
            }));
            const response = {
                data: leaderboard,
                testInfo: {
                    testId: latestExam.test_id,
                    title: latestExam.title
                }
            };
            // ✅ OPTIMIZED: Cache the result
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
            return reply.status(500).send({ error: 'Failed to fetch latest leaderboard' });
        }
    });
}
