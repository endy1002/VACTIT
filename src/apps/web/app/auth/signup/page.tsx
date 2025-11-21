// ...existing code...
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${firstName} ${lastName}`.trim(),
          email: username,
          password,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || 'Signup failed');
        setLoading(false);
        return;
      }
      // Redirect to login after successful signup
      router.push('/auth/login');
    } catch (err) {
      setError('Network error');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left illustration panel */}
      <div className="hidden md:flex w-1/2 bg-blue-600 text-white flex-col items-center justify-between p-12">
        {/* logo placeholder */}
        <div className="w-full flex justify-start">
          <div className="w-28 h-12 bg-yellow-300 rounded flex items-center justify-center">
            {/* add logo image later */}
            <span className="font-semibold text-blue-700">LOGO</span>
          </div>
        </div>

        {/* central illustration and greeting */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-72 h-72 bg-yellow-300 rounded-xl shadow-lg mb-8 flex items-center justify-center">
            {/* illustration placeholder */}
            <span className="text-2xl font-bold text-blue-700">Illustration</span>
          </div>
          <h2 className="text-4xl font-semibold mb-3">Chào bạn!</h2>
          <p className="opacity-90 max-w-xs text-center">Xin chào — đăng ký để tiếp tục.</p>
        </div>

        {/* pager dots */}
        <div className="w-full flex justify-center gap-3 pb-6">
          <div className="w-3 h-3 rounded-full bg-white" />
          <div className="w-3 h-3 rounded border border-white/60" />
          <div className="w-3 h-3 rounded border border-white/60" />
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-semibold mb-3">Đăng ký tài khoản mới</h1>
          <p className="text-sm text-gray-500 mb-6">Câu này có thể là tagline hoặc mục đích của app này nha</p>

          {/* Google sign-in placeholder */}
          <button
            type="button"
            className="w-full flex items-center justify-center gap-3 border rounded-lg py-3 mb-6 hover:shadow-sm"
            // integrate OAuth later
          >
            <span className="w-5 h-5 bg-gray-200 rounded-full" /> Đăng nhập bằng tài khoản Google
          </button>

          <div className="text-center text-sm text-gray-400 mb-6">Hoặc đăng ký tài khoản mới</div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <input
                required
                placeholder="Tên của bạn"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="px-3 py-2 border rounded-md"
              />
              <input
                required
                placeholder="Họ của bạn"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="px-3 py-2 border rounded-md"
              />
            </div>

            <input
              required
              placeholder="Tên đăng nhập / Email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            />

            <div className="relative">
              <input
                required
                placeholder="Mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? 'text' : 'password'}
                className="w-full px-3 py-2 border rounded-md pr-10"
              />
              <button
                type="button"
                aria-label="Toggle password"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
              >
                {/* eye icon placeholder */}
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>

            <div className="text-xs text-gray-500">
              Bằng cách tích vào ô này, bạn đã đồng ý với <Link href="#">điều khoản</Link> và <Link href="#">bảo mật</Link> của BaiLearn.
            </div>

            {error && <div className="text-sm text-red-600">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg shadow-sm disabled:opacity-60"
            >
              {loading ? 'Đang đăng ký…' : 'Đăng ký'}
            </button>

            <div className="text-center text-sm text-gray-500 mt-3">
              Bạn đã có tài khoản? <Link href="/auth/login">Đăng nhập ngay</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
// ...existing code...