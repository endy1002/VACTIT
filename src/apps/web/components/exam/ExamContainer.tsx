'use client';

import React, { useEffect, useState } from 'react';
import ViewerPane from '@/components/exam/ViewerPane';
import AnswerPanel from '@/components/exam/AnswerPanel';
import { api } from '@/lib/api-client';
import { useRouter } from 'next/navigation';

//Chức năng: Giao diện làm bài

// Định nghĩa types ngay đây hoặc import từ file types chung
export type Question = {
  id: number;
  text?: string;
  options: string[];
};

type ExamContainerProps = {
  testId: string;
  initialPages: string[]; // Data được truyền từ Server Component
  totalQuestions?: number;
  testTitle?: string;
  durationMinutes?: number;
  realTestId?: string; // The test_id from database (e.g. 1767...)
  trialType?: string;
};

export default function ExamContainer({
  testId,
  initialPages,
  totalQuestions = 120,
  testTitle,
  durationMinutes,
  realTestId,
  trialType: initialTrialType,
}: ExamContainerProps) {
  // State
  const [zoom, setZoom] = useState(1);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [flags, setFlags] = useState<Record<number, boolean>>({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  // Handling variables for Exit, and Expire events
  const [showExpireModal, setShowExpireModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  //Get test type for exit handling
  const [trialType, setTrialType] = useState<string | undefined>(initialTrialType);

  // Giả lập câu hỏi (hoặc nhận từ props nếu API trả về chi tiết câu hỏi)
  // Re-generate questions with correct IDs if realTestId is present?
  // Actually, UI uses 1..120. We only need to map at submission time.
  const questions: Question[] = Array.from({ length: totalQuestions }).map((_, i) => ({
    id: i + 1,
    text: undefined,
    options: ['A', 'B', 'C', 'D'],
  }));

  const testData = {
    title: testTitle || 'Đề thi thử ĐGNL',
    durationSeconds: (durationMinutes || 150) * 60,
    testId: testId,
  };

  // 1. Sync với LocalStorage khi component mount
  useEffect(() => {
    const savedAnswers = localStorage.getItem(`exam_${testId}_answers`);
    const savedFlags = localStorage.getItem(`exam_${testId}_flags`);
    if (savedAnswers) setAnswers(JSON.parse(savedAnswers));
    if (savedFlags) setFlags(JSON.parse(savedFlags));
  }, [testId]);

  const router = useRouter();
  useEffect(() => {
    const state = { isExam: true };

    if (!history.state?.isExam) {
    history.pushState(state, '', window.location.href);
  } else {
    history.replaceState(state, '', window.location.href);
  }

    const onPopState = () => {
      setShowExitModal(true);
      history.pushState(state, '', window.location.href);
    };

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      console.log('trial type on before unload', trialType);  
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    window.addEventListener('popstate', onPopState);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, []);
  // 2. Logic Handlers
  function handleSelect(qid: number, value: string) {
    setAnswers((prev) => {
      const updated = { ...prev, [qid]: value };
      localStorage.setItem(`exam_${testId}_answers`, JSON.stringify(updated));
      return updated;
    });
  }

  function handleToggleFlag(qid: number) {
    setFlags((prev) => {
      const updated = { ...prev, [qid]: !prev[qid] };
      localStorage.setItem(`exam_${testId}_flags`, JSON.stringify(updated));
      return updated;
    });
  }

  async function submitAnswers(force = false) {
    if (!force) {
      setShowConfirmModal(true);
      return;
    }

    const trialId = testId;
    const responsesPayload = questions.map((q) => ({
      questionId: realTestId ? `${realTestId}_${q.id}` : String(q.id),
      chosenOption: answers[q.id] ?? '-',
      responseTime: 0,
    }));

    // Immediately show success modal & clear local storage (optimistic UI)
    sessionStorage.setItem(`exam_cleared_${testId}`, '1');
    localStorage.removeItem(`exam_${testId}_answers`);
    localStorage.removeItem(`exam_${testId}_flags`);
    localStorage.removeItem(`exam_${testId}_endtime`);

    setShowConfirmModal(false);
    setShowExpireModal(false);
    setShowExitModal(false);
    setShowLoadingModal(true);
    
    // Show success modal after a short delay for better UX
    setTimeout(() => {
      setShowLoadingModal(false);
      setShowSuccessModal(true);
    }, 1500);

    // Submit to server in background
    try {
      const res = await api.responses.create({
        trialId: trialId,
        responses: responsesPayload,
      });
      if (res.error) {
        console.error('Submit error:', res.error);
        // Modal already shown, just log the error
      }
    } catch (err) {
      console.error('Submit network error:', err);
      // Modal already shown, submission will be retried or handled separately
    }
  }

  function handleSuccessRedirect() {
    router.replace('/overview');
  }

  function handleExpire() {
    // alert('Hết giờ! Hệ thống đang tự động nộp bài.'); // Maybe remove alert if prefer modal
    // But alert is blocking.
    setShowExpireModal(true);
    submitAnswers(true);
  }
  async function handleExit() {
    setShowExitModal(true);
  }
  function cancelExpire() {
    setShowExpireModal(false);
  }

  async function confirmExitLeaveWithoutSubmit() {
    setShowExitModal(false);
    // clear local cache for this exam so user returns in clean state
    try {
      sessionStorage.setItem(`exam_cleared_${testId}`, '1');
      localStorage.removeItem(`exam_${testId}_endtime`);
      localStorage.removeItem(`exam_${testId}_answers`);
      localStorage.removeItem(`exam_${testId}_flags`);
    } catch (e) {
      // ignore storage errors
    }

    try {
      if (trialType === 'practice') {
        await api.trials.cleanup(testId);
      }
    } catch (err) {
      console.error('Failed to remove practice trial on exit:', err);
    }

    router.replace('/exam');
  }
  function cancelExit() {
    setShowExitModal(false);
  }
  return (
    <div className="h-full flex flex-col relative bg-[#F1F6FF]">
      {/* Main Content - Two Panel Layout */}
      <div className="flex flex-row gap-4 p-4 flex-1 overflow-hidden">
        <ViewerPane
          pages={initialPages}
          zoom={zoom}
          testData={testData}
          startAt={Date.now()}
          onExpire={handleExpire}
          onExit={handleExit}
        />
        <AnswerPanel
          questions={questions}
          answers={answers}
          onSelect={handleSelect}
          onSubmit={() => submitAnswers(false)}
          onClear={() => {
            if (confirm("Bạn có chắc muốn xóa hết đáp án?")) {
              setAnswers({});
              localStorage.removeItem(`exam_${testId}_answers`);
            }
          }}
          flags={flags}
          onToggleFlag={handleToggleFlag}
        />
      </div>

      {/* Loading Modal */}
      {showLoadingModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="min-w-[40vw] bg-white rounded-xl shadow-2xl p-8 flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-200">
            {/* Spinner */}
            <div className="w-12 h-12 border-4 border-gray-200 border-t-[#2864D2] rounded-full animate-spin"></div>
            <p className="text-lg font-medium text-gray-700">Đang nộp bài...</p>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 ">
          <div className="min-w-[40vw] bg-white rounded-xl shadow-2xl p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Xác nhận nộp bài</h3>
            <p className="text-sm text-gray-600 mb-6">
              Bạn có chắc chắn muốn nộp bài thi? <br />
              Hãy kiểm tra kỹ các câu trả lời trước khi xác nhận.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
                type="button"
              >
                Hủy
              </button>
              <button
                onClick={() => submitAnswers(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-[#2864D2] hover:bg-[#1e4fc0] rounded-lg shadow-sm transition-colors cursor-pointer"
                type="button"
              >
                Đồng ý nộp bài
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50">
          {/* Wrapper for modal + decorative shapes */}
          <div className="relative">
            {/* Decorative shapes - outside modal */}
            <img 
              src="/assets/logos/SuccessLeftShape.svg" 
              alt="" 
              className="absolute -left-36 -bottom-36 w-50 h-auto pointer-events-none z-10"
            />
            <img 
              src="/assets/logos/SuccessRightShape.svg" 
              alt="" 
              className="absolute -right-36 -top-36 w-50 h-auto pointer-events-none z-10"
            />

            {/* Modal content */}
            <div className="min-w-[50vw] bg-white rounded-3xl shadow-2xl px-4 ">
              <div className="text-center py-2">
              <h3 className="text-2xl font-bold text-[#1c2250] mt-2 mb-2">
                Đã nộp bài thi thành công
              </h3>
              <p className="text-gray-500 mb-4">
                Chúc mừng bạn đã hoàn thành bài thi. Cảm ơn bạn đã tham gia!
              </p>

              <button
                onClick={() => router.replace('/result')}
                className="w-full px-6 py-3 text-base font-semibold text-[#FFD700] bg-[#2864d2] hover:bg-[#1e4fc0] cursor-pointer rounded-lg transition-colors mb-4"
                type="button"
              >
                Xem kết quả
              </button>

              <button
                onClick={handleSuccessRedirect}
                className="w-full px-6 py-3 text-base font-normal text-black bg-[#EFF5FF] hover:bg-[#D6E4FF] cursor-pointer rounded-lg transition-colors mb-4"
                type="button"
              >
                Về trang chủ
              </button>
            </div>
            </div>
          </div>
        </div>
      )}

       {/* Expire Modal */}
      {showExpireModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 rounded-lg">
          <div className="min-w-[40vw] bg-white rounded-xl shadow-2xl p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Hết giờ</h3>
            <p className="text-sm text-gray-600 mb-6">Thời gian làm bài đã kết thúc. Hệ thống sẽ tự động nộp bài cho bạn.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelExpire}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-yellow-500 hover:bg-gray-200 rounded-lg"
                type="button"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exit Modal */}
      {showExitModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="min-w-[40vw] bg-white rounded-xl shadow-2xl p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Thoát khỏi bài thi</h3>
            <p className="text-sm text-gray-600 mb-6">Bạn chưa nộp bài, nếu rời đi bạn sẽ mất tất cả các câu trả lời đã điền.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelExit}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer"
                type="button"
              >
                Ở lại
              </button>
              <button
                onClick={confirmExitLeaveWithoutSubmit}
                className="px-4 py-2 text-sm font-medium text-white bg-[#CE3838] hover:bg-red-700 rounded-lg cursor-pointer"
                type="button"
              >
                Thoát
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}