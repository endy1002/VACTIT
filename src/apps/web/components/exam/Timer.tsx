'use client';

import React, { useEffect, useRef, useState } from 'react';

export default function Timer({
  startAt,
  durationSeconds,
  onExpire,
}: {
  // startAt: ISO string or epoch milliseconds when the exam started
  startAt: string | number;
  // total duration of exam in seconds
  durationSeconds: number;
  // callback invoked once when timer reaches zero
  onExpire?: () => void;
}) {
  const startMs = typeof startAt === 'number' ? startAt : Date.parse(startAt);
  const [remaining, setRemaining] = useState<number>(() => {
    const now = Date.now();
    const elapsed = Math.floor(Math.max(0, now - startMs) / 1000);
    return Math.max(0, durationSeconds - elapsed);
  });
  const expiredRef = useRef(false);

  useEffect(() => {
    // recompute immediately in case startAt changed
    const now = Date.now();
    const elapsed = Math.floor(Math.max(0, now - startMs) / 1000);
    const initial = Math.max(0, durationSeconds - elapsed);
    setRemaining(initial);
    if (initial === 0 && !expiredRef.current) {
      expiredRef.current = true;
      onExpire?.();
    }
    // tick
    const id = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor(Math.max(0, now - startMs) / 1000);
      const next = Math.max(0, durationSeconds - elapsed);
      setRemaining(next);
      if (next === 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpire?.();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [startAt, durationSeconds, onExpire, startMs]);

  function formatTime(sec: number) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  return (
    <div role="timer" aria-live="polite" className={`px-3 py-1 rounded font-medium ${remaining <= 60 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-800'}`}>
      {formatTime(remaining)}
    </div>
  );
}