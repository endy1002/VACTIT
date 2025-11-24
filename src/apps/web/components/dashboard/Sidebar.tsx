import React from 'react';
// Nếu cấu hình alias chưa chạy, bạn có thể dùng đường dẫn tương đối
// import Image from 'next/image'; 

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const MENU_ITEMS = [
  { id: 'overview', label: 'Tổng quan' },
  { id: 'exam', label: 'Vào thi' },
  { id: 'result', label: 'Kết quả' },
  { id: 'leaderboard', label: 'Bảng xếp hạng' },
  { id: 'teachers', label: 'Giáo viên' },
  { id: 'guide', label: 'Hướng dẫn thi' },
  { id: 'faq', label: 'Câu hỏi thường gặp' },
  { id: 'news', label: 'Tin tức mới nhất' },
  { id: 'settings', label: 'Cài đặt' },
];

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar__logo">
        <img
          src="/assets/logos/logo.png"
          alt="BAI-LEARN logo"
          width={40}
          height={40}
          style={{ objectFit: 'contain' }}
        />
        <span className="sidebar__logo-text">BAI-LEARN</span>
      </div>

      <nav className="sidebar__nav">
        {MENU_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`sidebar__nav-item ${
              activeTab === item.id ? 'sidebar__nav-item--active' : ''
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="sidebar__support-card">
        <div className="sidebar__support-illustration">
          <img
            src="/assets/logos/support.png"
            alt="Support"
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
  );
}