import React from 'react';
import '../globals.css';
import Sidebar from '../../components/admin/Sidebar';

export const metadata = {
  title: 'Admin - VACTIT',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-root">
      <Sidebar />

      <main className="main">
        <header className="topbar card" style={{ padding: '12px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: 12 }}>
            {/* Left area: title + subtitle replaces the previous 'Bai Learn Admin' pill */}
            <div style={{ flex: '0 0 auto', marginRight: 12 }}>
              <div style={{ background: 'transparent', padding: '6px 12px', borderRadius: 12 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--color-text-main)' }}>Quản lý Đề thi Thử VACT</h2>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Quản lý đăng tải, chỉnh sửa và xem thống kê đề thi</div>
              </div>
            </div>

            <div style={{ flex: 1 }} />

            {/* Right area: keep compact profile */}
            <div className="topbar__profile">
              <div className="topbar__avatar">BL</div>
              <div className="topbar__profile-info">
                <div className="topbar__profile-name">Bai Learn</div>
                <div className="topbar__profile-id">Admin</div>
              </div>
            </div>
          </div>
        </header>

        <div className="content">{children}</div>
      </main>
    </div>
  );
}
