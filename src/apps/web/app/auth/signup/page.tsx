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
    <div className="min-h-screen flex font-sans">
      
      {/* --- LEFT PANEL (Copy hệt từ Login) --- */}
      <div className="hidden md:flex w-1/2 bg-[#2563EB] text-white flex-col items-center px-12 py-10 relative overflow-hidden">
        
        {/* 1. Logo Section (Logo + Text) */}
        <div className="flex flex-col items-center gap-2 mt-8 z-10">
          <div className="w-20 h-20 relative">
             {/* Logo vàng */}
            <img 
              src="/assets/logos/logo.png" 
              alt="BAILEARN Logo"
              className="w-full h-full object-contain"
              style={{ filter: 'brightness(0) saturate(100%) invert(75%) sepia(56%) saturate(3006%) hue-rotate(1deg) brightness(106%) contrast(104%)' }}
            />
          </div>
          <span className="font-bold text-2xl tracking-widest text-[#FFD700] uppercase mt-1 drop-shadow-md">
            BAILEARN
          </span>
        </div>

        {/* 2. Main Illustration */}
        <div className="flex-1 flex items-center justify-center w-full z-10 pb-20">
           <div className="relative w-full max-w-md h-64 md:h-80 flex items-center justify-center">
              <img 
                src="/assets/logos/vaothingay.png"
                alt="Illustration"
                className="w-full h-full object-contain drop-shadow-xl transform hover:scale-105 transition-transform duration-500"
              />
           </div>
        </div>

        {/* 3. Text 'Chào bạn!' */}
        <div className="absolute bottom-28 left-12 z-10">
           <h2 className="text-4xl font-normal">Chào bạn!</h2>
           <p className="opacity-90 max-w-xs mt-2 text-lg font-light">Xin chào — đăng ký để tiếp tục.</p>
        </div>

        {/* 4. Pagination Dots (Centered Bottom) */}
        <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 z-10 flex gap-4">
             <div className="w-3 h-3 rounded-full bg-white cursor-pointer hover:bg-gray-200 transition-colors" />
             <div className="w-3 h-3 border border-white cursor-pointer hover:bg-white/20 transition-colors rounded-sm" />
             <div className="w-3 h-3 border border-white cursor-pointer hover:bg-white/20 transition-colors transform rotate-45 rounded-sm" />
        </div>
      </div>


      {/* --- RIGHT PANEL (Form Đăng Ký) --- */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-8">
          
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Đăng ký tài khoản mới</h1>
            <p className="text-sm text-gray-500 mb-6">Câu này có thể là tagline hoặc mục đích của app này nha</p>
          </div>
          
          {/* Google Sign-in */}
          <button
            type="button"
            className="w-full flex items-center justify-center gap-3 border border-gray-300 bg-white py-3.5 rounded-full text-gray-700 font-medium hover:bg-gray-50 transition-all mb-6"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Đăng ký bằng tài khoản Google
          </button>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">Hoặc đăng ký tài khoản mới</span>
            <div className="flex-grow border-t border-gray-300"></div>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            
            {/* Tên & Họ */}
            <div className="grid grid-cols-2 gap-4">
              <input
                required
                placeholder="Họ"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-6 py-3.5 border border-gray-300 rounded-full text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              <input
                required
                placeholder="Tên"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-6 py-3.5 border border-gray-300 rounded-full text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Email */}
            <input
              required
              placeholder="Tên đăng nhập / Email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-6 py-3.5 border border-gray-300 rounded-full text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />

            {/* Password */}
            <div className="relative">
              <input
                required
                placeholder="Mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? 'text' : 'password'}
                className="w-full px-6 py-3.5 border border-gray-300 rounded-full text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-12"
              />
              <button
                type="button"
                aria-label="Toggle password"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-5 top-3.5 text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>

            <div className="flex items-start gap-2 mt-2">
                <input type="checkbox" className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" id="terms" required />
                <label htmlFor="terms" className="text-xs text-gray-500 leading-tight">
                    Bằng cách tích vào ô này, bạn đã đồng ý với <Link href="#" className="text-blue-600 hover:underline">điều khoản</Link> và <Link href="#" className="text-blue-600 hover:underline">chính sách bảo mật</Link> của BaiLearn.
                </label>
            </div>

            {error && <div className="text-sm text-red-600 text-center bg-red-50 p-2 rounded">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#2563EB] text-white py-3.5 rounded-full font-medium shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-70 mt-4"
            >
              {loading ? 'Đang đăng ký…' : 'Đăng ký'}
            </button>

            <div className="text-center text-sm text-gray-500 mt-4">
              Bạn đã có tài khoản? <Link href="/auth/login" className="text-blue-600 font-semibold hover:underline">Đăng nhập ngay</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}