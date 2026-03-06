"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Link from "next/link";
import Image from "next/image";

//  SWR hooks for instant loading with stale-while-revalidate
import { useCurrentUser, useStudentTrials, useTrialDetails } from "@/lib/swr-hooks";
import { ResultPageSkeleton } from "@/components/ui/Skeleton";

import type { TrialDetails, TrialListItem } from "./_types";
import { TOTAL_QUESTIONS } from "./_types";
import {
  formatDateVN,
  formatDurationMMSS,
  computeAllAnswers,
  inferSubjectsFromRawScore,
  inferTotalCorrectFromRawScore,
  renderOverallScore,
  attachIrtScores,
  pickSubjectAdvice,
} from "./_utils";

// Color palette
const COLORS = {
  blue: "#2864D2",
  yellow: "#FFD700",
  red: "#CE3838",
  gray: "#9CA3AF",
};

// Section card colors mapping
const SECTION_COLORS: Record<string, string> = {
  language: COLORS.red,
  literature: COLORS.red,
  math: COLORS.blue,
  science: COLORS.yellow,
};

export default function ResultsPage() {
  const router = useRouter();

  // SWR: Instant loading with cached data
  const { userId, isLoading: userLoading, isError: userError } = useCurrentUser();
  const { trials: rawTrials, isLoading: trialsLoading, isError: trialsError } = useStudentTrials(userId);

  // Filter & sort trials: exam trials only visible after due_time AND with processed_score
  const trials = useMemo(() => {
    const now = new Date();
    return [...rawTrials]
      .filter((t) => {
        // Practice trials: always visible
        if (t.test?.type !== 'exam') return true;
        // Exam trials: only show after due_time AND with processed_score
        const dueTime = t.test?.due_time ? new Date(t.test.due_time) : null;
        const hasDuePassed = dueTime ? now > dueTime : true;
        const hasProcessedScore =
          t.processed_score &&
          typeof t.processed_score === 'object' &&
          Object.keys(t.processed_score).length > 0;
        return hasDuePassed && hasProcessedScore;
      })
      .sort(
        (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
      ) as TrialListItem[];
  }, [rawTrials]);

  // Selected trial state
  const [selectedTrialId, setSelectedTrialId] = useState<string>("");

  // If nothing is selected, default to the most recent trial once data arrives
  useEffect(() => {
    if (!selectedTrialId && trials.length) {
      setSelectedTrialId(trials[0].trial_id);
    }
  }, [selectedTrialId, trials]);

  // Auto-select first trial when trials load
  const effectiveTrialId = selectedTrialId || trials[0]?.trial_id || "";

  // ✅ SWR: Fetch trial details with caching
  const { details: selectedTrialDetails, isLoading: detailsLoading } = useTrialDetails(effectiveTrialId);

  // State for expanded section analysis - multiple cards can be expanded
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // State for analysis modal
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);

  const toggleSectionAnalysis = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  // Derived state
  const studentId = userId;

  // Selected trial (from list)
  const selectedTrial = useMemo(
    () => trials.find((t) => t.trial_id === effectiveTrialId) ?? null,
    [trials, effectiveTrialId],
  );

  const allAnswers = useMemo(() => {
    if (!selectedTrialDetails) {
      return Array.from({ length: TOTAL_QUESTIONS }, (_, idx) => ({
        number: idx + 1,
        answer: "-",
        correct: false,
        section: "Unknown",
      }));
    }

    return computeAllAnswers(
      selectedTrialDetails.responses || [],
      TOTAL_QUESTIONS,
    );
  }, [selectedTrialDetails]);

  const isExam = selectedTrial?.test?.type === "exam";

  const subjects = useMemo(() => {
    const base = inferSubjectsFromRawScore(selectedTrial?.raw_score);
    if (!isExam) return base;
    return attachIrtScores(base, selectedTrial?.processed_score);
  }, [isExam, selectedTrial?.raw_score, selectedTrial?.processed_score]);

  const totalCorrect = useMemo(
    () => inferTotalCorrectFromRawScore(selectedTrial?.raw_score),
    [selectedTrial?.raw_score],
  );

  const subjectAnalyses = useMemo(() => {
    return subjects.map((subject) => {
      const rawScore = subject.score0_300 ?? subject.correct * 10;
      const score = Number.isFinite(rawScore)
        ? Math.round(Number(rawScore))
        : null;
      return {
        id: subject.id,
        title: subject.title,
        correct: subject.correct,
        score,
        advice: pickSubjectAdvice(subject.id, score),
        hasIrtScore: subject.score0_300 != null,
      };
    });
  }, [subjects]);

  // Tactic summary
  const tacticSummary = useMemo(() => {
    if (!selectedTrialDetails) return "Đang tải phân tích...";
    const t = selectedTrialDetails.tactic as any;
    return (
      (t?.summary && String(t.summary).trim()) || "Chưa có dữ liệu phân tích."
    );
  }, [selectedTrialDetails]);

  const hasAdditionalSummary = useMemo(
    () =>
      tacticSummary &&
      !["Đang tải phân tích...", "Chưa có dữ liệu phân tích."].includes(
        tacticSummary,
      ),
    [tacticSummary],
  );

  // ✅ SWR: Show skeleton immediately while loading (no more blank screen!)
  const isInitialLoading = userLoading || (trialsLoading && trials.length === 0);

  if (isInitialLoading) {
    return (
      <DashboardLayout>
        <ResultPageSkeleton />
      </DashboardLayout>
    );
  }

  if (userError || trialsError) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-brand-bg px-6 py-6 text-sm text-red-600">
          Lỗi: {userError?.message || trialsError?.message || "Failed to load data"}
        </div>
      </DashboardLayout>
    );
  }

  if (!trials.length) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex justify-center text-sm">
          <p>
            Không có dữ liệu, bạn vui lòng{" "}
            <Link
              href="/exam"
              className="text-blue-600 hover:underline font-medium"
            >
              vào thi
            </Link>{" "}
            để có kết quả.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex min-h-screen bg-brand-bg">
        <div className="flex flex-1 flex-col">
          {/* Main layout */}
          <div className="flex flex-col px-[1rem] pb-[1.5rem] pt-[0.75rem] lg:px-[1.5rem] gap-[1rem]">
            {/* ========== TOP ROW: Tổng điểm (left) + Điểm từng phần (right) ========== */}
            <div className="flex gap-[1rem]">
              {/* Tổng điểm + Tổng điểm năng lực - Left side */}
              <div className="w-[33rem] flex-shrink-0">
                <div className="rounded-2xl bg-white p-[1.25rem] shadow-sm h-full flex flex-col">
                  {/* Tổng điểm năng lực - Top row: Icon - Label - Score */}
                  <div className="flex items-center justify-center gap-[0.75rem] py-[1rem] mb-[1rem] border-b border-slate-100">
                    <Image
                      src="/assets/logos/total_score.png"
                      alt="Total Score"
                      width={100}
                      height={100}
                      className="object-contain"
                    />
                    <p className="text-xl text-brand-muted">
                      {isExam ? "Tổng điểm năng lực:" : "Tổng điểm năng lực quy đổi:"}
                    </p>
                    <p className="text-6xl font-bold text-brand-text">
                      {renderOverallScore(
                        selectedTrialDetails?.test.type === "exam",
                        selectedTrial?.raw_score,
                        selectedTrial?.processed_score,
                      )}
                    </p>
                  </div>

                  <h2 className="text-lg font-bold text-brand-text mb-[0.25rem] line-clamp-2">
                    {selectedTrial?.test?.title ?? "Kết quả bài thi"}
                  </h2>
                  <p className="text-xs text-brand-muted mb-[0.75rem]">Điểm tổng</p>

                  <div className="flex items-start gap-[1.25rem] mb-[1rem]">
                    {/* Circular score display */}
                    <div className="relative w-[5.625rem] h-[5.625rem] flex-shrink-0">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 90 90">
                        <circle
                          cx="45"
                          cy="45"
                          r="38"
                          stroke="#E5E7EB"
                          strokeWidth="6"
                          fill="none"
                        />
                        <circle
                          cx="45"
                          cy="45"
                          r="38"
                          stroke={COLORS.yellow}
                          strokeWidth="6"
                          fill="none"
                          strokeDasharray={`${(totalCorrect / TOTAL_QUESTIONS) * 239} 239`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xl font-bold text-brand-text">{totalCorrect}</span>
                        <span className="text-[0.625rem] text-brand-muted">/{TOTAL_QUESTIONS}</span>
                      </div>
                    </div>

                    {/* Section progress bars */}
                    <div className="flex-1 space-y-[0.5rem] pt-[0.25rem]">
                      {subjects.map((subject) => (
                        <div key={subject.id} className="flex items-center gap-[0.5rem]">
                          <span className="text-xs text-brand-muted w-[4.0625rem] truncate">{subject.title}</span>
                          <div className="flex-1 h-[0.5rem] bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${(subject.correct / 30) * 100}%`,
                                backgroundColor: subject.id === 'vie' ? COLORS.red :
                                  subject.id === 'eng' ? COLORS.yellow :
                                    subject.id === 'math' ? '#CBD5E1' : COLORS.blue
                              }}
                            />
                          </div>
                          <span className="text-xs text-brand-muted w-[2rem] text-right">{subject.correct}/30</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setShowAnalysisModal(true)}
                    className="w-full py-[0.75rem] rounded-xl text-sm font-medium text-white transition-colors mt-auto"
                    style={{ backgroundColor: COLORS.blue }}
                  >
                    Phân tích chi tiết
                  </button>
                </div>
              </div>

              {/* Điểm từng phần - Right */}
              <div className="flex gap-[0.5rem] flex-1">
                {subjectAnalyses.map((subject, index) => {
                  // Background images for each subject
                  const bgImages = [
                    "/assets/background/vi_card.png",
                    "/assets/background/eng_card.png",
                    "/assets/background/math_card.png",
                    "/assets/background/sci_card.png"
                  ];
                  const bgImage = bgImages[index % bgImages.length];

                  // Text colors per subject:
                  // Tiếng Việt: white
                  // Tiếng Anh: blue
                  // Toán: red
                  // Tư duy khoa học: yellow
                  const textColors = ["#FFFFFF", COLORS.blue, COLORS.red, COLORS.yellow];
                  const mainTextColor = textColors[index % textColors.length];

                  // Sub text slightly transparent version of main color
                  const subTextOpacity = index === 0 ? "text-white/70" :
                    index === 1 ? "text-blue-600/70" :
                      index === 2 ? "text-red-600/70" : "text-yellow-400/70";

                  return (
                    <div
                      key={subject.id}
                      className="flex-1 rounded-2xl px-[1rem] py-[1.25rem] flex flex-col items-center justify-center bg-cover bg-center bg-no-repeat overflow-hidden"
                      style={{
                        backgroundImage: `url(${bgImage})`,
                      }}
                    >
                      <p className={`text-base font-bold ${subTextOpacity} mb-[0.25rem]`}>
                        {subject.hasIrtScore ? "Năng lực" : "Năng lực quy đổi"}
                      </p>
                      <h3 className="text-2xl font-bold text-center mb-[0.75rem] leading-tight" style={{ color: mainTextColor }}>
                        {subject.title}
                      </h3>
                      <p className="text-6xl font-bold" style={{ color: mainTextColor }}>
                        {subject.score ?? subject.correct * 10}
                      </p>
                      <p className={`text-base font-bold ${subTextOpacity} mt-[0.5rem]`}>
                        trên 300
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ========== BOTTOM ROW: 2 columns ========== */}
            <div className="flex gap-[1rem]">
              {/* Đáp án 120 câu - Left */}
              <div className="w-[46.875rem] flex-shrink-0">
                <div className="rounded-2xl bg-white p-[1.25rem] shadow-sm h-full">
                  <div className="flex items-center justify-between mb-[0.75rem]">
                    <h2 className="text-lg font-bold text-brand-text">
                      Đáp án 120 câu
                    </h2>
                    <button
                      onClick={() => router.push(`/review/trial/${selectedTrialId}`)}
                      className="text-sm font-medium hover:underline"
                      style={{ color: COLORS.blue }}
                    >
                      Xem chi tiết →
                    </button>
                  </div>
                  <p className="text-xs text-brand-muted mb-[0.75rem]">
                    Màu xanh: đúng, màu đỏ: sai, dấu &quot;-&quot; là chưa chọn
                  </p>

                  <div className="max-h-[21.875rem] overflow-y-auto pr-[0.25rem]">
                    <div className="grid grid-cols-10 gap-[0.25rem]">
                      {allAnswers.slice(0, 120).map((item) => (
                        <div
                          key={item.number}
                          className="flex flex-col items-center"
                        >
                          <span className="text-[0.5625rem] text-brand-muted mb-[0.125rem]">
                            {item.number}
                          </span>
                          <span
                            className="flex h-[2rem] w-[2rem] items-center justify-center rounded-full text-[0.75rem] font-semibold text-white"
                            style={{
                              backgroundColor:
                                item.answer === "-"
                                  ? COLORS.gray
                                  : item.correct
                                    ? COLORS.blue
                                    : COLORS.red,
                            }}
                          >
                            {item.answer}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Lịch sử thi - Right */}
              <div className="flex-1">
                <section className="rounded-2xl bg-white p-[1.25rem] shadow-sm h-full">
                  <h2 className="text-xl font-bold text-brand-text mb-[1rem]">
                    Lịch sử thi
                  </h2>

                  <div className="max-h-[21.875rem] overflow-y-auto pr-[0.25rem]">
                    <div className="grid grid-cols-[0.8fr_1.8fr_1fr_1fr] border-b border-slate-100 pb-[0.5rem] font-semibold text-brand-muted text-sm">
                      <div className="text-center">Số câu đúng</div>
                      <div>Tên bài thi</div>
                      <div className="text-center">Ngày làm</div>
                      <div className="text-center">Thời gian làm bài</div>
                    </div>

                    {trials.map((t) => {
                      const isActive = t.trial_id === effectiveTrialId;
                      const [datePart = ""] = formatDateVN(t.start_time).split(" ");
                      const durationSec = (() => {
                        if (!t.start_time || !t.end_time) return null;
                        const diffSec =
                          (new Date(t.end_time).getTime() -
                            new Date(t.start_time).getTime()) /
                          1000;
                        if (!Number.isFinite(diffSec)) return null;
                        return Math.max(0, Math.round(diffSec));
                      })();

                      return (
                        <div
                          key={t.trial_id}
                          onClick={() => setSelectedTrialId(t.trial_id)}
                          className={`grid w-full grid-cols-[0.8fr_1.8fr_1fr_1fr]
                          items-center
                          border-b border-slate-100 py-[0.625rem] transition cursor-pointer text-sm
                          ${isActive
                              ? "rounded-lg bg-[#eef4ff] font-semibold"
                              : "bg-transparent hover:bg-slate-50"
                            }`}
                        >
                          <div className="text-center">
                            {inferTotalCorrectFromRawScore(t.raw_score)}/{TOTAL_QUESTIONS}
                          </div>
                          <div className="truncate pr-[0.5rem]">
                            {t.test?.title ?? t.test_id}
                          </div>
                          <div className="text-center">
                            {datePart}
                          </div>
                          <div className="text-center">
                            {formatDurationMMSS(durationSec)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Analysis Modal */}
      {showAnalysisModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl w-[90%] max-w-3xl max-h-[80vh] overflow-hidden shadow-xl">
            <div className="flex items-center justify-between p-[1.25rem] border-b border-slate-200">
              <h2 className="text-xl font-bold text-brand-text">Phân tích chi tiết</h2>
              <button
                onClick={() => setShowAnalysisModal(false)}
                className="p-[0.5rem] hover:bg-slate-100 rounded-full transition-colors"
              >
                <svg className="w-[1.25rem] h-[1.25rem] text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-[1.25rem] overflow-y-auto max-h-[calc(80vh-5rem)]">
              <div className="space-y-[1rem]">
                {subjectAnalyses.map((subject, index) => {
                  const colors = [COLORS.red, COLORS.yellow, "#94A3B8", COLORS.blue];
                  const bgColor = colors[index % colors.length];

                  return (
                    <div
                      key={subject.id}
                      className="rounded-xl p-[1rem] border border-slate-200"
                    >
                      <div className="flex items-center gap-[0.75rem] mb-[0.75rem]">
                        <div
                          className="w-[0.75rem] h-[2rem] rounded"
                          style={{ backgroundColor: bgColor }}
                        />
                        <div>
                          <h3 className="font-semibold text-brand-text">{subject.title}</h3>
                          <p className="text-sm text-brand-muted">
                            {subject.correct}/30 câu đúng
                            {subject.score != null && ` · ${subject.score} điểm`}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-brand-muted leading-relaxed pl-[1.5rem]">
                        {subject.advice
                          ? subject.advice.split("\n").map((line, idx, arr) => (
                            <span key={idx}>
                              {line}
                              {idx < arr.length - 1 && <br />}
                            </span>
                          ))
                          : "Chưa có dữ liệu lời khuyên cho phần thi này."}
                      </p>
                    </div>
                  );
                })}

                {hasAdditionalSummary && (
                  <div className="rounded-xl p-[1rem] border border-slate-200 bg-slate-50">
                    <h3 className="font-semibold text-brand-text mb-[0.5rem]">Ghi chú thêm</h3>
                    <p className="text-sm text-brand-muted leading-relaxed">
                      {tacticSummary}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
