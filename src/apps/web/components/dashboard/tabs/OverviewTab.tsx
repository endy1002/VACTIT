import React from 'react';

export default function OverviewTab() {
  return (
    <>
      <h1 className="page-title mb-6">Tổng quan</h1>
      <section className="card card--hero mb-6">
        <div className="card--hero__left">
          <p className="hero__subtitle">Chào mừng đã trở lại, Thanh!</p>
          <p className="hero__text">
            Tiếp tục làm bài thôi nào, bạn còn 10 bài chưa làm trong tuần vừa rồi
          </p>
          <button className="btn btn--primary hero__button">
            Bắt đầu ngay
          </button>
        </div>
        <div className="card--hero__right">
          <img
            src="/assets/logos/hero-illustration.png"
            alt="Hero"
            className="hero-illustration"
            width={260}
          />
        </div>
      </section>

      <section className="grid grid--two-cols mb-6">
        <article className="card card--exam-now">
          <div className="card__title">Vào thi ngay</div>
          <div className="card--exam-now__body">
            <div className="card--exam-now__text">
              <p>Hiện tại có 36 bạn đang làm bài thi ĐGNL hay cái gì đó</p>
            </div>
            <div className="card--exam-now__illustration">
              <img
                src="/assets/logos/vaothingay.png"
                alt="Exam Now"
                width={180}
              />
            </div>
          </div>
        </article>

        <article className="card card--daily-quiz">
          <header className="card--daily-quiz__header">
            <h2>Daily Quiz</h2>
          </header>
          <div className="card--daily-quiz__question">
            <p>
              Dòng nào sau đây nêu tên những tác phẩm cùng phong cách sáng tác
              của trường phái văn học hiện thực?
            </p>
          </div>
          <div className="card--daily-quiz__options">
            <button className="quiz-option">
              Tắt đèn, Số đỏ, Chí Phèo.
            </button>
            <button className="quiz-option quiz-option--selected">
              Chữ người tử tù, Giông tố, Lão Hạc.
            </button>
          </div>
        </article>
      </section>
      
      {/* Bạn có thể move phần Leaderboard/Stats vào đây hoặc tách ra component riêng nữa nếu muốn */}
    </>
  );
}