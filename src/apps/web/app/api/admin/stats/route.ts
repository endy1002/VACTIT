import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

const isAdminRole = (role: unknown) => String(role ?? '').trim().toLowerCase() === 'admin';

const BIN_LABELS = [
  '0-100',
  '101-200',
  '201-300',
  '301-400',
  '401-500',
  '501-600',
  '601-700',
  '701-800',
  '801-900',
  '901-1000',
  '1001-1100',
  '1101-1200',
];

const calculateTotalScore = (processedScore: any): number => {
  if (!processedScore || typeof processedScore !== 'object') return 0;
  const s1 = Math.round(Number(processedScore.score0_300_en) || 0);
  const s2 = Math.round(Number(processedScore.score0_300_vi) || 0);
  const s3 = Math.round(Number(processedScore.score0_300_sci) || 0);
  const s4 = Math.round(Number(processedScore.score0_300_math) || 0);
  return s1 + s2 + s3 + s4;
};

const buildHistogram = (scores: number[]) => {
  const counts = Array(BIN_LABELS.length).fill(0);

  for (const rawScore of scores) {
    const score = Math.max(0, Math.floor(Number(rawScore) || 0));
    let index = 0;

    if (score <= 100) index = 0;
    else index = Math.min(Math.ceil(score / 100) - 1, BIN_LABELS.length - 1);

    counts[index] += 1;
  }

  return BIN_LABELS.map((label, index) => ({
    label,
    count: counts[index],
  }));
};

async function ensureAdmin(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const email = (token as any)?.email as string | undefined;
    const id = ((token as any)?.id ?? (token as any)?.sub) as string | undefined;

    const prisma = await getPrisma();
    const user = email
      ? await prisma.user.findUnique({ where: { email }, select: { role: true } })
      : id
        ? await prisma.user.findUnique({ where: { user_id: id }, select: { role: true } })
        : null;

    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdminRole(user.role)) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
    }

    return null;
  } catch (err) {
    console.error('ensureAdmin(stats) failed', err);
    return NextResponse.json({ ok: false, error: 'Auth check failed' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const authError = await ensureAdmin(req);
  if (authError) return authError;

  try {
    const prisma = await getPrisma();
    const { searchParams } = new URL(req.url);
    const requestedTestId = searchParams.get('testId') || undefined;

    const exams = await prisma.test.findMany({
      where: { type: 'exam' },
      select: {
        test_id: true,
        title: true,
        start_time: true,
        due_time: true,
      },
      orderBy: { start_time: 'desc' },
    });

    const selectedExam = requestedTestId
      ? exams.find((exam) => exam.test_id === requestedTestId) ?? exams[0] ?? null
      : exams[0] ?? null;

    if (!selectedExam) {
      return NextResponse.json({
        ok: true,
        data: {
          exams: [],
          selectedExam: null,
          stats: {
            totalTrials: 0,
            scoredTrials: 0,
            averageScore: 0,
            maxScore: 0,
            minScore: 0,
          },
          histogram: BIN_LABELS.map((label) => ({ label, count: 0 })),
          trials: [],
        },
      });
    }

    const trials = await prisma.trial.findMany({
      where: { test_id: selectedExam.test_id },
      select: {
        trial_id: true,
        student_id: true,
        start_time: true,
        end_time: true,
        processed_score: true,
        student: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { end_time: 'desc' },
    });

    const scoredTrials = trials
      .map((trial) => {
        const score = calculateTotalScore(trial.processed_score);
        const finishedAt = trial.end_time || trial.start_time;
        const durationMinutes = trial.end_time
          ? Math.max(0, Math.floor((new Date(trial.end_time).getTime() - new Date(trial.start_time).getTime()) / 60000))
          : null;

        return {
          trialId: trial.trial_id,
          studentId: trial.student_id,
          studentName: trial.student?.name || 'Ẩn danh',
          score,
          finishedAt,
          durationMinutes,
          hasScore: trial.processed_score && typeof trial.processed_score === 'object' && Object.keys(trial.processed_score as object).length > 0,
        };
      })
      .filter((trial) => trial.hasScore);

    const scores = scoredTrials.map((trial) => trial.score);
    const totalTrials = trials.length;
    const averageScore = scores.length
      ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length)
      : 0;
    const maxScore = scores.length ? Math.max(...scores) : 0;
    const minScore = scores.length ? Math.min(...scores) : 0;

    const histogram = buildHistogram(scores);

    return NextResponse.json({
      ok: true,
      data: {
        exams,
        selectedExam,
        stats: {
          totalTrials,
          scoredTrials: scores.length,
          averageScore,
          maxScore,
          minScore,
        },
        histogram,
        trials: scoredTrials,
      },
    });
  } catch (err) {
    console.error('GET /api/admin/stats error', err);
    return NextResponse.json({ ok: false, error: 'Failed to fetch stats' }, { status: 500 });
  }
}
