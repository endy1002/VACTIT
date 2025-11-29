import React from 'react';
import Timer from './Timer';
export default function Controls({
  zoom,
  setZoom,
  pageNumber,
  setPageNumber,
  totalPages,
  startAt,
  durationSeconds,
  onExpire,
}: {
  zoom: number;
  setZoom: (fn: (z: number) => number) => void;
  pageNumber: number;
  setPageNumber: (n: number | ((p:number)=>number)) => void;
  totalPages: number;
  startAt: string | number;
  // exam duration in seconds
  durationSeconds: number;
  // callback when timer expires
  onExpire?: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-4">
         <Timer startAt={startAt} durationSeconds={durationSeconds} onExpire={onExpire} />
        <h3 className="text-lg font-semibold">Tên đề thi / thông tin bài thi</h3>
      </div>

      <div className="flex items-center gap-2">
        {/* <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))} className="px-3 py-1 border rounded">-</button>
        <span>{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom((z) => Math.min(2, z + 0.1))} className="px-3 py-1 border rounded">+</button>

        <button onClick={() => setPageNumber(1)} className="px-3 py-1 border rounded">Giải lại</button> */}
        <button onClick={() => setPageNumber((p) => Math.max(1, p - 1))} className="px-3 py-1 border rounded">Trang trước</button>
        <button onClick={() => setPageNumber((p) => Math.min(totalPages, p + 1))} className="px-3 py-1 border rounded">Trang sau</button>
        <div className="ml-3">
          Page {pageNumber} {totalPages ? `of ${totalPages}` : ''}
        </div>
      </div>
    </div>
  );
}