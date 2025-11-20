import Image from "next/image";

export default function HomePage() {
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
          <button className="sidebar__nav-item sidebar__nav-item--active">
            Tổng quan
          </button>
          <button className="sidebar__nav-item">Vào thi</button>
          <button className="sidebar__nav-item">Kết quả</button>
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

        <main className="content">
          <h1 className="page-title">Tổng quan</h1>

          {/* Hero welcome card */}
          <section className="card card--hero">
            <div className="card--hero__left">
              <p className="hero__subtitle">Chào mừng đã trở lại, Thanh!</p>
              <p className="hero__text">
                Tiếp tục làm bài thôi nào, bạn còn 10 bài chưa làm trong tuần vừa
                rồi
              </p>
              <button className="btn btn--primary hero__button">
                Bắt đầu ngay
              </button>
            </div>
            <div className="card--hero__right hero-illustration-wrapper">
              <Image
                src="/assets/logos/hero-illustration.png"
                alt="Welcome"
                width={260}
                height={200}
                className="hero-illustration"
              />
            </div>
          </section>

          {/* Second row: “Vào thi ngay” + Daily Quiz */}
          <section className="grid grid--two-cols">
            {/* Vào thi ngay */}
            <article className="card card--exam-now">
              <div className="card__title">Vào thi ngay</div>
              <div className="card--exam-now__body">
                <div className="card--exam-now__text">
                  <p>
                    Hiện tại có 36 bạn đang làm bài thi ĐGNL hay cái gì đó
                  </p>
                </div>
                <div className="card--exam-now__illustration">
                  <Image
                    src="/assets/logos/vaothingay.png"
                    alt="Vào thi ngay"
                    width={240}
                    height={220}
                  />
                </div>
              </div>
            </article>

            {/* Daily Quiz */}
            <article className="card card--daily-quiz">
              <header className="card--daily-quiz__header">
                <h2>Daily Quiz</h2>
              </header>
              <div className="card--daily-quiz__question">
                <p>
                  Dòng nào sau đây nêu tên những tác phẩm cùng phong cách sáng
                  tác của trường phái văn học hiện thực?
                </p>
              </div>
              <div className="card--daily-quiz__options">
                <button className="quiz-option">
                  Tắt đèn (Ngô Tất Tố), Số đỏ (Vũ Trọng Phụng), Chí Phèo (Nam
                  Cao).
                </button>
                <button className="quiz-option quiz-option--selected">
                  Chữ người tử tù (Nguyễn Tuân), Giông tố (Vũ Trọng Phụng), Lão
                  Hạc (Nam Cao).
                </button>
                <button className="quiz-option">
                  Hai đứa trẻ (Thạch Lam), Tắt đèn (Ngô Tất Tố), Số đỏ (Vũ
                  Trọng Phụng)
                </button>
                <button className="quiz-option">
                  Lão Hạc (Nam Cao), Số đỏ (Vũ Trọng Phụng), Chữ người tử tù
                  (Nguyễn Tuân)
                </button>
              </div>
            </article>
          </section>

          {/* Third row: Leaderboard + Statistics */}
          <section className="grid grid--two-cols grid--leaderboard">
            {/* Leaderboard */}
            <section className="card card--leaderboard">
              <header className="card__header">
                <h2>Bảng xếp hạng</h2>
                <button className="link-button">Xem tất cả</button>
              </header>
              <div className="table">
                <div className="table__row table__row--header">
                  <div className="table__cell table__cell--small">#</div>
                  <div className="table__cell">Họ và tên</div>
                  <div className="table__cell">Điểm thi</div>
                  <div className="table__cell">Thời gian làm bài</div>
                  <div className="table__cell">Ngày thi</div>
                </div>

                {[
                  {
                    rank: 1,
                    name: "Trần Bảo Quyên",
                    score: 1047,
                    time: "45:12",
                    date: "April 5, 2025",
                  },
                  {
                    rank: 2,
                    name: "Nguyễn Thị Hồng",
                    score: 1023,
                    time: "78:34",
                    date: "April 12, 2025",
                  },
                  {
                    rank: 3,
                    name: "Lê Văn Minh",
                    score: 1015,
                    time: "52:47",
                    date: "April 19, 2025",
                  },
                  {
                    rank: 4,
                    name: "Phạm Thị Lan",
                    score: 932,
                    time: "29:58",
                    date: "April 23, 2025",
                  },
                  {
                    rank: 5,
                    name: "Trần Văn An",
                    score: 910,
                    time: "51:40",
                    date: "April 30, 2025",
                  },
                  {
                    rank: 6,
                    name: "Đỗ Thị Mai",
                    score: 876,
                    time: "11:22",
                    date: "April 15, 2025",
                  },
                  {
                    rank: 7,
                    name: "Nguyễn Văn Tùng",
                    score: 849,
                    time: "67:09",
                    date: "April 28, 2025",
                  },
                ].map((row) => (
                  <div className="table__row" key={row.rank}>
                    <div className="table__cell table__cell--small">
                      {row.rank}
                    </div>
                    <div className="table__cell table__cell--user">
                      <span className="avatar-circle">
                        <Image
                          src="/assets/logos/trophy.png"
                          alt="Rank"
                          width={24}
                          height={24}
                        />
                      </span>
                      <span>{row.name}</span>
                    </div>
                    <div className="table__cell">{row.score}</div>
                    <div className="table__cell">{row.time}</div>
                    <div className="table__cell">{row.date}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* Statistics */}
            <section className="card card--stats">
              <header className="card__header card__header--stats">
                <h2>Thống kê</h2>
                <button className="link-button">Xem chi tiết</button>
              </header>

              {/* Progress card */}
              <div className="stats__top">
                <div className="stats__progress">
                  <div className="progress-ring">
                    <div className="progress-ring__inner">
                      <span className="progress-ring__value">36%</span>
                    </div>
                  </div>
                </div>
                <div className="stats__summary">
                  <h3>Tiến độ hoàn thành bài tập</h3>
                  <p>Số bài đã làm: 10/13</p>
                  <p>Thời gian làm: 125:39</p>
                  <p>Cái gì đó nữa: abc:123</p>
                </div>
              </div>

              {/* Frequency chart */}
              <div className="stats__chart">
                <div className="stats__chart-header">
                  <span>Tần suất học</span>
                </div>
                <div className="stats__chart-body">
                  <div className="chart-bars">
                    <div className="chart-bar chart-bar--h1" />
                    <div className="chart-bar chart-bar--h2" />
                    <div className="chart-bar chart-bar--h3" />
                    <div className="chart-bar chart-bar--h4" />
                    <div className="chart-bar chart-bar--h5" />
                  </div>
                  <div className="chart-axis">
                    <span>w</span>
                  </div>
                </div>
              </div>
            </section>
          </section>
        </main>
      </div>
    </div>
  );
}
