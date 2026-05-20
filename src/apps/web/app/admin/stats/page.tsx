"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type Exam = {
  test_id: string;
  title: string;
  start_time: string | null;
  due_time: string | null;
};

type HistogramBin = {
  label: string;
  count: number;
};

type TrialStat = {
  trialId: string;
  studentId: string;
  studentName: string;
  score: number;
  finishedAt: string;
  durationMinutes: number | null;
};

type StatsResponse = {
  exams: Exam[];
  selectedExam: Exam | null;
  stats: {
    totalTrials: number;
    scoredTrials: number;
    averageScore: number;
    maxScore: number;
    minScore: number;
  };
  histogram: HistogramBin[];
  trials: TrialStat[];
};

export default function AdminStatsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTestId, setSelectedTestId] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load(testId?: string) {
    setLoading(true);
    setError(null);
    try {
      const qs = testId ? `?testId=${encodeURIComponent(testId)}` : '';
      const response = await fetch(`/api/admin/stats${qs}`);
      const json = await response.json();

      if (!response.ok || json.ok === false) {
        throw new Error(json.error || 'Không thể tải thống kê');
      }

      setData(json.data);
      const nextSelected = json.data?.selectedExam?.test_id || json.data?.exams?.[0]?.test_id || '';
      setSelectedTestId(nextSelected);
    } catch (err: any) {
      console.error('Failed to load admin stats:', err);
      setError(err.message || 'Không thể tải thống kê');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(searchParams.get('testId') || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const maxBinCount = useMemo(() => {
    if (!data?.histogram?.length) return 1;
    return Math.max(...data.histogram.map((bin) => bin.count), 1);
  }, [data]);

  const selectedExamTitle = data?.selectedExam?.title || 'Chưa có đề thi';

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-slate-300">Admin Analytics</p>
            <h1 className="mt-2 text-3xl font-semibold">Thống kê phổ điểm đề thi</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Biểu đồ thể hiện phân bố điểm của từng đề exam theo các khoảng 0-100 đến 1101-1200.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Đề exam" value={data?.exams.length ?? 0} />
            <StatCard label="Bài làm" value={data?.stats.totalTrials ?? 0} />
            <StatCard label="Có điểm" value={data?.stats.scoredTrials ?? 0} />
            <StatCard label="Điểm TB" value={data?.stats.averageScore ?? 0} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-500">Đề thi đang xem</p>
          <h2 className="text-xl font-semibold text-slate-900">{selectedExamTitle}</h2>
          {data?.selectedExam?.test_id && <p className="text-xs text-slate-500">Mã đề: {data.selectedExam.test_id}</p>}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={selectedTestId}
            onChange={(e) => {
              const next = e.target.value;
              setSelectedTestId(next);
              router.replace(`/admin/stats?testId=${encodeURIComponent(next)}`);
              load(next);
            }}
            className="min-w-[280px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
          >
            {data?.exams?.length ? (
              data.exams.map((exam) => (
                <option key={exam.test_id} value={exam.test_id}>
                  {exam.title} ({exam.test_id})
                </option>
              ))
            ) : (
              <option value="">Không có đề exam</option>
            )}
          </select>

          <button
            type="button"
            onClick={() => load(selectedTestId || undefined)}
            className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            Tải lại
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
          Đang tải dữ liệu thống kê...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-sm">
          {error}
        </div>
      ) : data ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Biểu đồ phổ điểm</h3>
                <p className="text-sm text-slate-500">Số lượng bài làm rơi vào từng khoảng điểm.</p>
              </div>
              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                Max bin: {maxBinCount}
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[900px] rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-end gap-2">
                  {data.histogram.map((bin) => {
                    const pct = maxBinCount > 0 ? (bin.count / maxBinCount) * 100 : 0;
                    const heightValue = bin.count > 0 ? `${Math.max(pct, 4)}%` : '0%';
                    return (
                      <div key={bin.label} className="flex flex-1 flex-col items-center justify-end gap-2 text-center">
                        <div className="flex h-[280px] w-full items-end justify-center">
                          {bin.count > 0 && (
                            <div
                              className="w-full max-w-[56px] rounded-t-xl bg-gradient-to-t from-blue-500 to-indigo-500 shadow-sm transition-all hover:opacity-90"
                              style={{ height: heightValue }}
                              title={`${bin.label}: ${bin.count}`}
                            />
                          )}
                        </div>
                        <div className="h-[40px]">
                          <div className="text-xs font-semibold text-slate-700">{bin.count}</div>
                          <div className="mt-1 text-[11px] leading-tight text-slate-500">{bin.label}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Tổng quan</h3>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Metric label="Tổng bài làm" value={data.stats.totalTrials} />
                <Metric label="Bài có điểm" value={data.stats.scoredTrials} />
                <Metric label="Điểm cao nhất" value={data.stats.maxScore} />
                <Metric label="Điểm thấp nhất" value={data.stats.minScore} />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Danh sách bài làm gần nhất</h3>
              <div className="mt-4 space-y-3">
                {data.trials.length ? (
                  data.trials.slice(0, 8).map((trial) => (
                    <div key={trial.trialId} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium text-slate-900">{trial.studentName}</div>
                          <div className="text-xs text-slate-500">{trial.studentId}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-base font-semibold text-slate-900">{trial.score}</div>
                          <div className="text-xs text-slate-500">{trial.durationMinutes != null ? `${trial.durationMinutes} phút` : 'N/A'}</div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                    Chưa có bài làm nào được chấm cho đề này.
                  </div>
                )}
              </div>
            </section>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-sm ring-1 ring-white/10">
      <div className="text-xs uppercase tracking-[0.18em] text-slate-300">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-white">{value}</div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}
