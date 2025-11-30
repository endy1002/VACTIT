"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname() || '';

  const items = [
    { href: '/admin', label: 'Tổng quan Admin' },
    { href: '/admin/tests', label: 'Quản lý đề thi' },
    { href: '/admin/stats', label: 'Thống kê' },
    { href: '/admin/users', label: 'Danh sách người dùng' },
    { href: '/admin/settings', label: 'Cài đặt hệ thống' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar__logo">
        <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center text-white font-bold">BL</div>
        <div>
          <div className="sidebar__logo-text">Bai Learn</div>
          <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Admin</div>
        </div>
      </div>

      <nav className="sidebar__nav" aria-label="Admin navigation">
        {items.map((it) => {
          // Avoid marking the parent '/admin' as active when on child routes like '/admin/tests'
          const active = it.href === '/admin'
            ? pathname === '/admin'
            : pathname === it.href || pathname.startsWith(it.href + '/');
          return (
            <Link key={it.href} href={it.href} className={`sidebar__nav-item ${active ? 'sidebar__nav-item--active' : ''}`}>
              {it.label}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar__support-card">
        <div className="sidebar__support-text">
          <h3>Hỗ trợ Admin</h3>
          <p>Liên hệ bộ phận kỹ thuật khi cần trợ giúp.</p>
        </div>
      </div>
    </aside>
  );
}
