'use client'; // Required for usePathname

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// We map IDs to specific URL paths here
const MENU_ITEMS = [
  { id: 'overview', label: 'Tổng quan', path: '/' }, // Overview is the homepage
  { id: 'exam', label: 'Vào thi', path: '/exam' },
  { id: 'result', label: 'Kết quả', path: '/result' },
  { id: 'leaderboard', label: 'Bảng xếp hạng', path: '/leaderboard' },
  { id: 'teachers', label: 'Giáo viên', path: '/teachers' },
  { id: 'guide', label: 'Hướng dẫn thi', path: '/guide' },
  { id: 'faq', label: 'Câu hỏi thường gặp', path: '/faq' },
  { id: 'news', label: 'Tin tức mới nhất', path: '/news' },
  { id: 'settings', label: 'Cài đặt', path: '/settings' },
];

export default function Sidebar() {
  const pathname = usePathname(); // Get the current URL (e.g., "/exam")

  // Function to check if a menu item is active
  const isActive = (path: string) => {
    // If it's the home page, strictly check for "/"
    if (path === '/') return pathname === '/';
    // For other pages, check if the URL starts with the path (e.g., /exam/123 is still active)
    return pathname.startsWith(path);
  };

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
          <Link
            key={item.id}
            href={item.path}
            className={`sidebar__nav-item ${
              isActive(item.path) ? 'sidebar__nav-item--active' : ''
            }`}
          >
            {item.label}
          </Link>
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