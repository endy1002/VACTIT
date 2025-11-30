"use client";

import React, { useEffect, useState } from 'react';

type Test = {
  test_id: string;
  title: string;
  start_time: string | null;
  due_time: string | null;
  type: string;
  status: string;
  url: string;
  duration: number | null;
};

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="inline-block px-2 py-1 text-xs rounded bg-emerald-100 text-emerald-800">{children}</span>;
}

export default function AdminTestsPage() {
  const [tests, setTests] = useState<Test[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showStats, setShowStats] = useState<Test | null>(null);
  const [editing, setEditing] = useState<Test | null>(null);
  const [form, setForm] = useState<any>({ title: '', start_date: '', start_time: '', due_date: '', due_time: '', type: 'regular', status: 'regular', url: '', duration: '' });

  // helpers for date/time conversion and display
  function isoToDateAndTime(iso?: string | null) {
    if (!iso) return { date: '', time: '' };
    const d = new Date(iso);
    if (isNaN(d.getTime())) return { date: '', time: '' };
    const pad = (n: number) => String(n).padStart(2, '0');
    const YYYY = d.getFullYear();
    const MM = pad(d.getMonth() + 1);
    const DD = pad(d.getDate());
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());
    // return date in YYYY-MM-DD for native date input prefill
    return { date: `${YYYY}-${MM}-${DD}`, time: `${hh}:${mm}` };
  }

  function localDateTimeToIso(dateStr?: string, timeStr?: string) {
    if (!dateStr) return null;
    const timePart = timeStr ?? '00:00';

    // accept date in either YYYY-MM-DD or DD/MM/YYYY
    let isoDate = '';
    if (dateStr.includes('/')) {
      // DD/MM/YYYY -> convert
      const parts = dateStr.split('/').map(s => s.trim());
      if (parts.length !== 3) return null;
      const [DD, MM, YYYY] = parts;
      if (!DD || !MM || !YYYY) return null;
      isoDate = `${YYYY}-${MM.padStart(2, '0')}-${DD.padStart(2, '0')}`;
    } else if (dateStr.includes('-')) {
      // assume already YYYY-MM-DD
      isoDate = dateStr;
    } else {
      // unknown format
      return null;
    }

    const local = `${isoDate}T${timePart}`; // treat missing time as midnight
    const d = new Date(local);
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  }

  // (no external date parser used; native date inputs use YYYY-MM-DD)

  function formatDisplayDate(iso?: string | null) {
    if (!iso) return '-';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    const DD = pad(d.getDate());
    const MM = pad(d.getMonth() + 1);
    const YYYY = d.getFullYear();
    return `${DD}/${MM}/${YYYY}`;
  }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/tests');
      const data = await res.json();
      if (data.ok) setTests(data.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm({ title: '', start_date: '', start_time: '', due_date: '', due_time: '', type: 'regular', status: 'regular', url: '', duration: '' });
    setShowForm(true);
  }

  // derived validation state
  const isFormValid = Boolean(
    form.title && form.start_date && form.start_time && form.due_date && form.due_time && form.duration && form.file
  );

  // enforce due date/time cannot be earlier than start date/time
  useEffect(() => {
    if (!form.start_date || !form.start_time) return;
    // if due_date is missing, do nothing
    if (!form.due_date) return;

    // if due_date < start_date, set due_date = start_date
    try {
      const sd = new Date(`${form.start_date}T${form.start_time}`);
      const dd = new Date(`${form.due_date}T${form.due_time ?? '00:00'}`);
      if (isNaN(sd.getTime())) return;
      if (isNaN(dd.getTime())) return;
      if (dd.getTime() <= sd.getTime()) {
        // set due_date/time to be at least start
        const newIso = sd.toISOString();
        const d = new Date(newIso);
        const pad = (n: number) => String(n).padStart(2, '0');
        const YYYY = d.getFullYear();
        const MM = pad(d.getMonth() + 1);
        const DD = pad(d.getDate());
        const hh = pad(d.getHours());
        const mm = pad(d.getMinutes());
        setForm((s:any) => ({ ...s, due_date: `${YYYY}-${MM}-${DD}`, due_time: `${hh}:${mm}` }));
      }
    } catch (e) {
      // ignore
    }
  }, [form.start_date, form.start_time]);

  function openEdit(t: Test) {
    setEditing(t);
    const s = isoToDateAndTime(t.start_time);
    const d = isoToDateAndTime(t.due_time);
    setForm({ ...t, start_date: s.date, start_time: s.time, due_date: d.date, due_time: d.time, duration: t.duration ?? '' });
    setShowForm(true);
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    // Prepare payload: do not send the File object directly. send filename as pdf_name.
    const payload = { ...form };
    if (payload.file) {
      payload.pdf_name = payload.file.name;
      delete payload.file;
    }

    // convert separate date/time inputs to ISO before sending
    if (payload.start_date) {
      payload.start_time = localDateTimeToIso(payload.start_date, payload.start_time);
      delete payload.start_date;
    }
    if (payload.due_date) {
      payload.due_time = localDateTimeToIso(payload.due_date, payload.due_time);
      delete payload.due_date;
    }

    // determine status from due_time: if due_time is in the future -> 'regular' (open), else 'practice' (closed)
    try {
      if (payload.due_time) {
        const dueMs = new Date(payload.due_time).getTime();
        payload.status = dueMs > Date.now() ? 'regular' : 'practice';
      } else {
        payload.status = 'practice';
      }
    } catch (e) {
      payload.status = 'practice';
    }

    // validation: ensure due is after start
    if (payload.start_time && payload.due_time) {
      const s = new Date(payload.start_time).getTime();
      const d = new Date(payload.due_time).getTime();
      if (d <= s) {
        alert('Thời gian kết thúc phải sau thời gian bắt đầu');
        return;
      }
    }

    // validation: required fields (title, start/due date+time, duration, file)
    if (!payload.title || !payload.start_time || !payload.due_time || !payload.duration || !(form.file)) {
      alert('Vui lòng điền đầy đủ: tên, thời gian bắt đầu/kết thúc, thời lượng và tệp đề (PDF).');
      return;
    }
    const method = editing ? 'PUT' : 'POST';
    if (editing) payload.test_id = editing.test_id;
    const res = await fetch('/api/admin/tests', { method, body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });
    const data = await res.json();
    if (data.ok) {
      setShowForm(false);
      await load();
    } else {
      alert('Error: ' + (data.error || 'unknown'));
    }
  }

  async function remove(test_id: string) {
    if (!confirm('Delete this test?')) return;
    const res = await fetch(`/api/admin/tests?test_id=${encodeURIComponent(test_id)}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.ok) load(); else alert('Delete failed');
  }

  const filteredTests = tests.filter(t => t.title.toLowerCase().includes(searchTerm.trim().toLowerCase()));

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-5">
          <button onClick={openCreate} className="btn btn--upload">Đăng tải đề thi mới</button>

          {/* page title is shown in the layout header now */}
        </div>

        <div className="topbar__search" style={{ maxWidth: 360 }}>
          <input
            className="topbar__search-input"
            placeholder="Tìm tên đề..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button type="button" className="topbar__search-button" onClick={() => { /* to optionally trigger something */ }}>
            🔍
          </button>
        </div>
      </div>

      <div style={{ height: 6 }} />

      <div className="bg-white rounded-xl shadow p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="p-3">Tên đề thi</th>
                <th className="p-3">Loại</th>
                <th className="p-3">Ngày bắt đầu</th>
                <th className="p-3">Ngày kết thúc</th>
                <th className="p-3">Trạng thái</th>
                <th className="p-3">Số thí sinh</th>
                <th className="p-3">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredTests.map(t => (
                <tr key={t.test_id} className="border-t align-middle">
                  <td className="p-3 align-middle">{t.title}</td>
                  <td className="p-3">{t.type === 'premium' ? 'VIP' : 'Thường'}</td>
                  <td className="p-3">{formatDisplayDate(t.start_time)}</td>
                  <td className="p-3">{formatDisplayDate(t.due_time)}</td>
                  <td className="p-3">
                    {(() => {
                      try {
                        const status = t.due_time
                          ? (new Date(t.due_time).getTime() > Date.now() ? 'regular' : 'practice')
                          : (t.status ?? 'practice');
                        return status === 'regular' ? <Badge>Đang mở</Badge> : <Badge>Tự luyện</Badge>;
                      } catch (e) {
                        return <Badge>{t.status}</Badge>;
                      }
                    })()}
                  </td>
                  <td className="p-3">—</td>
                  <td className="p-3">
                    <button className="mr-3 text-blue-600" onClick={() => openEdit(t)}>✏️</button>
                    <button className="mr-3 text-red-600" onClick={() => remove(t.test_id)}>🗑️</button>
                    <button className="text-slate-600" onClick={() => setShowStats(t)}>📊</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form onSubmit={submitForm} className="bg-white rounded-xl shadow-lg modal-dialog">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">{editing ? 'Chỉnh sửa đề thi' : 'Đăng tải đề thi mới'}</h3>
              <button type="button" onClick={() => setShowForm(false)}>✖︎</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm">Tên đề thi</label>
                <input value={form.title} onChange={e => setForm((s:any)=>({...s, title: e.target.value}))} className="w-full border p-2 rounded" />
              </div>
              <div>
                <label className="block text-sm">Mô tả</label>
                <textarea value={form.description ?? ''} onChange={e => setForm((s:any)=>({...s, description: e.target.value}))} className="w-full border p-2 rounded h-20" />
              </div>

              <div>
                <label className="block text-sm">Loại đề thi</label>
                <select value={form.type ?? 'regular'} onChange={e => setForm((s:any)=>({...s, type: e.target.value}))} className="w-full border p-2 rounded">
                  <option value="regular">Regular</option>
                  <option value="premium">Premium</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm">Thời gian bắt đầu</label>
                  <div className="field-inline no-overflow">
                    <input type="date" value={form.start_date ?? ''} onChange={e=>setForm((s:any)=>({...s, start_date: e.target.value}))} className="date-input border p-2 rounded no-overflow" />
                    <input type="time" value={form.start_time ?? ''} onChange={e=>setForm((s:any)=>({...s, start_time: e.target.value}))} className="time-input border p-2 rounded" />
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{(() => { const iso = localDateTimeToIso(form.start_date, form.start_time); if (!iso) return ''; const d = new Date(iso); if (isNaN(d.getTime())) return ''; return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`; })()}</div>
                </div>
                <div>
                  <label className="block text-sm">Thời gian kết thúc</label>
                  <div className="field-inline no-overflow">
                    <input type="date" value={form.due_date ?? ''} min={form.start_date ?? undefined} onChange={e=>setForm((s:any)=>({...s, due_date: e.target.value}))} className="date-input border p-2 rounded no-overflow" />
                    <input type="time" value={form.due_time ?? ''} min={(form.due_date && form.start_date && form.due_date === form.start_date) ? form.start_time : undefined} onChange={e=>setForm((s:any)=>({...s, due_time: e.target.value}))} className="time-input border p-2 rounded" />
                    </div>
                  <div className="text-xs text-slate-500 mt-1">{(() => { const iso = localDateTimeToIso(form.due_date, form.due_time); if (!iso) return ''; const d = new Date(iso); if (isNaN(d.getTime())) return ''; return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`; })()}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm">Thời lượng (phút)</label>
                  <input type="number" value={form.duration ?? ''} onChange={e=>setForm((s:any)=>({...s, duration: Number(e.target.value)}))} className="w-full border p-2 rounded" />
                </div>
                <div>
                  <label className="block text-sm">Tệp đề thi (PDF)</label>
                  <div className="mt-2">
                    <input
                      id="pdf-upload"
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files ? e.target.files[0] : null;
                        setForm((s: any) => ({ ...s, file: f, url: f ? f.name : '' }));
                      }}
                    />

                    <label htmlFor="pdf-upload" className="inline-flex items-center gap-2 px-3 py-2 border rounded cursor-pointer text-sm bg-white hover:bg-slate-50">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                        <path d="M12 3v10" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M8 7l4-4 4 4" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M20 21H4" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span className="text-blue-600 font-medium">Upload đề thi</span>
                    </label>

                    <div className="mt-2 text-sm text-slate-600">
                      {form.file ? (
                        <div className="flex items-center gap-3">
                          <div className="text-sm">{form.file.name}</div>
                          <button type="button" className="text-sm text-red-600" onClick={() => setForm((s:any)=>({...s, file: null, url: ''}))}>Xóa</button>
                        </div>
                      ) : (
                        <div className="text-sm text-slate-400">Chưa có tệp. (Chỉ PDF)</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button type="button" onClick={()=>setShowForm(false)} className="px-4 py-2">Hủy</button>
              <button
                type="submit"
                disabled={!isFormValid}
                className={`px-4 py-2 rounded ${isFormValid ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
                Lưu đề thi
              </button>
            </div>
          </form>
        </div>
      )}

      {showStats && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-[520px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Xem Thống kê</h3>
              <button onClick={() => setShowStats(null)}>✖︎</button>
            </div>

            <div className="mb-4">
              <h4 className="text-sm text-slate-600 mb-2">Phổ điểm {showStats.title}</h4>
              <div className="w-full h-40 bg-slate-100 rounded flex items-end gap-2 p-4">
                {/* simple mock histogram */}
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="flex-1 bg-blue-600" style={{ height: `${20 + i * 6}px` }} />
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Danh sách điểm</h4>
              <table className="w-full text-sm">
                <thead className="text-slate-500 text-left">
                  <tr><th className="p-2">Học sinh</th><th className="p-2">Điểm</th><th className="p-2">Thời gian làm</th></tr>
                </thead>
                <tbody>
                  <tr className="border-t"><td className="p-2">Trần Thanh</td><td className="p-2">850</td><td className="p-2">30.06.2025</td></tr>
                  <tr className="border-t"><td className="p-2">Nguyễn A</td><td className="p-2">720</td><td className="p-2">30.06.2025</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
