"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

// ---------- Mock data for all taken tests ----------
// IMPORTANT: Tests are ordered from newest → oldest.
// The FIRST element is what user sees by default.
const TESTS = [
  {
    id: "test-4",
    name: "Đề thi nền tảng số 4",
    score: 800,
    targetScore: 1100,
    percent: 75,
    duration: "60:00",
    date: "12.04.2025",
    analysis:
      "Bạn đã đạt mức điểm khá, đặc biệt là ở phần Tư duy khoa học. Vẫn còn một số câu sai ở phần Ngôn ngữ, chủ yếu liên quan đến từ vựng học thuật và suy luận ngữ cảnh.",
    subjects: [
      { id: "math", title: "Toán", correct: 55, total: 60 },
      { id: "verbal", title: "Ngôn ngữ", correct: 52, total: 60 },
      { id: "logic", title: "Tư duy khoa học", correct: 55, total: 60 },
    ],
    // chỉ demo vài câu – sau này bạn có thể thay bằng đủ 60 câu
    answers: [
      { number: 1, answer: "A", correct: true },
      { number: 2, answer: "C", correct: true },
      { number: 3, answer: "E", correct: false },
      { number: 4, answer: "B", correct: true },
      { number: 5, answer: "A", correct: true },
      { number: 6, answer: "C", correct: true },
      { number: 7, answer: "D", correct: false },
    ],
  },
  {
    id: "test-3",
    name: "Đề thi nền tảng số 3",
    score: 750,
    targetScore: 1100,
    percent: 68,
    duration: "120:00",
    date: "03.03.2025",
    analysis:
      "Kết quả cho thấy phần Toán còn khá nhiều câu sai ở dạng bài đọc biểu đồ và bài toán suy luận. Ngôn ngữ và Tư duy khoa học ở mức ổn định.",
    subjects: [
      { id: "math", title: "Toán", correct: 48, total: 60 },
      { id: "verbal", title: "Ngôn ngữ", correct: 50, total: 60 },
      { id: "logic", title: "Tư duy khoa học", correct: 52, total: 60 },
    ],
    answers: [
      { number: 1, answer: "B", correct: false },
      { number: 2, answer: "C", correct: true },
      { number: 3, answer: "D", correct: true },
      { number: 4, answer: "A", correct: true },
      { number: 5, answer: "E", correct: false },
      { number: 6, answer: "B", correct: true },
      { number: 7, answer: "C", correct: true },
    ],
  },
  {
    id: "test-2",
    name: "Đề thi nền tảng số 2",
    score: 900,
    targetScore: 1100,
    percent: 82,
    duration: "90:00",
    date: "20.02.2025",
    analysis:
      "Đây là một trong những bài có kết quả tốt nhất, đặc biệt là phần Ngôn ngữ. Tuy nhiên vẫn còn một số câu khó ở Tư duy khoa học.",
    subjects: [
      { id: "math", title: "Toán", correct: 57, total: 60 },
      { id: "verbal", title: "Ngôn ngữ", correct: 58, total: 60 },
      { id: "logic", title: "Tư duy khoa học", correct: 54, total: 60 },
    ],
    answers: [
      { number: 1, answer: "A", correct: true },
      { number: 2, answer: "B", correct: true },
      { number: 3, answer: "C", correct: true },
      { number: 4, answer: "D", correct: true },
      { number: 5, answer: "E", correct: true },
      { number: 6, answer: "A", correct: true },
      { number: 7, answer: "B", correct: false },
    ],
  },
  {
    id: "test-1",
    name: "Đề thi nền tảng số 1",
    score: 850,
    targetScore: 1100,
    percent: 77,
    duration: "120:00",
    date: "01.02.2025",
    analysis:
      "Bài thi đầu tiên cho thấy nền tảng tương đối tốt. Các sai sót chủ yếu đến từ việc quản lý thời gian và đọc chưa kỹ đề.",
    subjects: [
      { id: "math", title: "Toán", correct: 53, total: 60 },
      { id: "verbal", title: "Ngôn ngữ", correct: 55, total: 60 },
      { id: "logic", title: "Tư duy khoa học", correct: 52, total: 60 },
    ],
    answers: [
      { number: 1, answer: "C", correct: true },
      { number: 2, answer: "D", correct: true },
      { number: 3, answer: "E", correct: true },
      { number: 4, answer: "B", correct: false },
      { number: 5, answer: "A", correct: true },
      { number: 6, answer: "C", correct: true },
      { number: 7, answer: "D", correct: true },
    ],
  },
];

// Map subject id → color (class CSS)
const SUBJECT_CLASS_MAP: Record<string, string> = {
  math: "results-subject-card--math",
  verbal: "results-subject-card--verbal",
  logic: "results-subject-card--logic",
};

export default function ResultsPage() {
  // Default = newest test → TESTS[0]
  const [selectedTestId, setSelectedTestId] = useState(TESTS[0].id);

  const selectedTest = TESTS.find((t) => t.id === selectedTestId)!;

  // Convert percentage to degrees for the conic gradient
  const progressDeg = (selectedTest.percent / 100) * 360;

  return (
    <div className="app-root">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar__logo">
          <Image
            src="/assets/logos/logo.png"
            alt="BAI-LEARN logo"
            width={40}
            height={40}
          />
          <span className="sidebar__logo-text">BAI-LEARN</span>
        </div>

        <nav className="sidebar__nav">
          <Link href="/" className="sidebar__nav-item">
            Tổng quan
          </Link>
          <button className="sidebar__nav-item">Vào thi</button>
          <Link
            href="/ket-qua"
            className="sidebar__nav-item sidebar__nav-item--active"
          >
            Kết quả
          </Link>
          <button className="sidebar__nav-item">Bảng xếp hạng</button>
          <button className="sidebar__nav-item">Giáo viên</button>
          <button className="sidebar__nav-item">Hướng dẫn thi</button>
          <button className="sidebar__nav-item">Câu hỏi thường gặp</button>
          <button className="sidebar__nav-item">Tin tức mới nhất</button>
          <button className="sidebar__nav-item">Cài đặt</button>
        </nav>

        <div className="sidebar__support-card">
          <div className="sidebar__support-illustration">
            <Image
              src="/assets/logos/support.png"
              alt="Liên hệ hỗ trợ"
              width={80}
              height={80}
            />
          </div>
          <div className="sidebar__support-text">
            <h3>Liên hệ hỗ trợ</h3>
            <p>Chúng mình sẽ hỗ trợ nhanh nhất có thể</p>
          </div>
          <button className="btn btn--secondary">Nhắn tin</button>
        </div>
      </aside>

      {/* Main content */}
      <div className="main">
        {/* Top bar */}
        <header className="topbar">
          <div className="topbar__search">
            <input
              type="text"
              placeholder="Tìm kiếm từ khóa/chức năng"
              className="topbar__search-input"
            />
            <button className="topbar__search-button">
              <Image
                src="/assets/logos/search.png"
                alt="Tìm kiếm"
                width={18}
                height={18}
              />
            </button>
          </div>

          <div className="topbar__profile">
            <button className="topbar__notif">
              <Image
                src="/assets/logos/bell.png"
                alt="Thông báo"
                width={18}
                height={18}
              />
            </button>
            <div className="topbar__avatar">
              <Image
                src="/assets/logos/avatar.png"
                alt="Quang Thanh"
                width={36}
                height={36}
              />
            </div>
            <div className="topbar__profile-info">
              <span className="topbar__profile-name">Quang Thanh</span>
              <span className="topbar__profile-id">ID: 012345</span>
            </div>
          </div>
        </header>

        {/* Results content */}
        <main className="content">
          {/* Title */}
          <section className="page-section">
            <h1 className="page-title">Kết quả bài thi</h1>
          </section>

          {/* Top row: score + subjects */}
          <section className="grid results-grid-top">
            {/* Score card */}
            <article className="card results-score-card">
              <div className="results-score-card__header">
                <div>
                  <p className="results-score-label">Điểm tổng</p>
                  <p className="results-score-value">{selectedTest.score}</p>
                </div>
                <div className="results-score-target">
                  <p className="results-score-target-label">Điểm mục tiêu</p>
                  <p className="results-score-target-value">
                    {selectedTest.targetScore}
                  </p>
                </div>
              </div>

              <div className="results-score-card__body">
                {/* Triangle “chart” – purely visual */}
                <div className="results-score-chart">
                  <div className="results-score-triangle results-score-triangle--large" />
                  <div className="results-score-triangle results-score-triangle--medium" />
                  <div className="results-score-triangle results-score-triangle--small" />
                </div>

                {/* Donut progress */}
                <div className="stats__progress">
                  <div
                    className="progress-ring"
                    style={{
                      background: `conic-gradient(#ffc83a 0 ${progressDeg}deg, #e6ebff ${progressDeg}deg 360deg)`,
                    }}
                  >
                    <div className="progress-ring__inner">
                      <span className="progress-ring__value">
                        {selectedTest.percent}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </article>

            {/* Subject summary cards */}
            <aside className="results-subjects">
              {selectedTest.subjects.map((subject) => (
                <article
                  key={subject.id}
                  className={
                    "results-subject-card " +
                    (SUBJECT_CLASS_MAP[subject.id] ?? "")
                  }
                >
                  <h3 className="results-subject-card__title">
                    {subject.title}
                  </h3>
                  <p className="results-subject-card__stat">
                    <span className="results-subject-card__number">
                      {subject.correct}
                    </span>
                    <span className="results-subject-card__text">
                      Câu đúng
                      <br />
                      Trên tổng {subject.total} câu
                    </span>
                  </p>
                  <button className="btn btn--white">Phân tích</button>
                </article>
              ))}
            </aside>
          </section>

          {/* Middle row: analysis + answers */}
          <section className="grid results-grid-middle">
            {/* Analysis */}
            <article className="card results-analysis-card">
              <header className="results-analysis-card__header">
                <div className="results-analysis-card__icon">★</div>
                <h2 className="section-title">Phân tích bài làm</h2>
              </header>
              <p className="results-analysis-card__text">
                {selectedTest.analysis}
              </p>
            </article>

            {/* Answer sheet */}
            <article className="card results-answers-card">
              <header className="results-answers-card__header">
                <h2 className="section-title">Đáp án chi tiết</h2>
                <p className="results-answers-card__legend">
                  <span className="results-answers-badge results-answers-badge--correct">
                    Đúng
                  </span>
                  <span className="results-answers-badge results-answers-badge--wrong">
                    Sai
                  </span>
                </p>
              </header>

              <div className="results-answers-grid">
                {selectedTest.answers.map((item) => (
                  <div key={item.number} className="results-answers-item">
                    <span className="results-answers-number">
                      {item.number}
                    </span>
                    <span
                      className={
                        "results-answers-bubble " +
                        (item.correct
                          ? "results-answers-bubble--correct"
                          : "results-answers-bubble--wrong")
                      }
                    >
                      {item.answer}
                    </span>
                  </div>
                ))}
              </div>
            </article>
          </section>

          {/* History */}
          <section className="card results-history-card">
            <header className="results-history-card__header">
              <h2 className="section-title">Lịch sử thi</h2>
            </header>

            <div className="results-history-table">
              <div className="results-history-row results-history-row--header">
                <div className="results-history-cell">Tên đề thi</div>
                <div className="results-history-cell">Điểm thi</div>
                <div className="results-history-cell">Thời gian làm bài</div>
                <div className="results-history-cell">Ngày thi</div>
              </div>

              {TESTS.map((test) => {
                const isActive = test.id === selectedTestId;
                return (
                  <button
                    key={test.id}
                    type="button"
                    className={
                      "results-history-row results-history-row--clickable " +
                      (isActive ? "results-history-row--active" : "")
                    }
                    onClick={() => setSelectedTestId(test.id)}
                  >
                    <div className="results-history-cell">{test.name}</div>
                    <div className="results-history-cell">{test.score}</div>
                    <div className="results-history-cell">{test.duration}</div>
                    <div className="results-history-cell">{test.date}</div>
                  </button>
                );
              })}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
