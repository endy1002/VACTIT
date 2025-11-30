"use client";

import React, { useEffect, useState } from 'react';

export default function AdminOverview() {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    try {
      const data = localStorage.getItem('vactit_admin_profile');
      if (data) {
        const parsed = JSON.parse(data);
        setName(parsed.name || '');
        setSavedAt(parsed.savedAt || null);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (password && password !== confirm) {
      alert('Mật khẩu xác nhận không khớp');
      return;
    }

    const payload = { name, savedAt: new Date().toISOString() };
    localStorage.setItem('vactit_admin_profile', JSON.stringify(payload));
    setSavedAt(payload.savedAt);
    setPassword('');
    setConfirm('');
    alert('Đã lưu thay đổi (chỉ lưu local, sẽ sync với database sau)');
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="card mb-6">
        <h2 className="text-xl font-semibold">Tổng quan Admin</h2>
        <p className="text-sm text-slate-500">Cập nhật thông tin tài khoản quản trị. Hiện tại dữ liệu được lưu tạm local.</p>
      </div>

      <div className="card">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Tên hiển thị</label>
            <input value={name} onChange={e=>setName(e.target.value)} className="w-full border p-2 rounded mt-1" />
          </div>

          <div>
            <label className="block text-sm font-medium">Đổi mật khẩu</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mật khẩu mới" className="w-full border p-2 rounded mt-1" />
            <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Xác nhận mật khẩu" className="w-full border p-2 rounded mt-2" />
            <div className="text-xs text-slate-500 mt-1">Mật khẩu chưa được gửi lên server trong môi trường dev.</div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <div className="text-sm text-slate-500">{savedAt ? `Lần cuối lưu: ${new Date(savedAt).toLocaleString()}` : 'Chưa lưu'}</div>
            <button type="submit" className="btn btn--primary">Lưu thay đổi</button>
          </div>
        </form>
      </div>
    </div>
  );
}
