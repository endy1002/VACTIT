'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { signIn } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const schema = z.object({
  email: z.string().email({ message: 'Email không hợp lệ' }),
  password: z.string().min(6, { message: 'Mật khẩu tối thiểu 6 ký tự' }),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // Thêm state quản lý ẩn/hiện mật khẩu

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setServerError(null);
    const res = await signIn('credentials', {
      redirect: false,
      email: data.email,
      password: data.password,
    });
    if (res?.error) {
      setServerError(res.error);
      return;
    }
    router.push('/');
  }

  return (
    <div className="min-h-screen flex font-sans">
      {/* --- LEFT PANEL --- */}
      <div className="hidden md:flex w-1/2 bg-[#2563EB] text-white flex-col items-center px-12 py-10 relative overflow-hidden">
        
        {/* 1. Logo Section (Logo + Text) */}
        <div className="flex flex-col items-center gap-2 mt-8 z-10">
          <div className="w-20 h-20 relative">
             {/* Sử dụng file logo.png và ép màu vàng bằng CSS Filter */}
            <img 
              src="/assets/logos/logo.png" 
              alt="BAILEARN Logo"
              className="w-full h-full object-contain"
              // Filter này chuyển đổi màu gốc của ảnh (thường là đen/trắng) sang màu Vàng (#FFD700)
              style={{ filter: 'brightness(0) saturate(100%) invert(75%) sepia(56%) saturate(3006%) hue-rotate(1deg) brightness(106%) contrast(104%)' }}
            />
          </div>
          {/* Chữ BAILEARN màu vàng */}
          <span className="font-bold text-2xl tracking-widest text-[#FFD700] uppercase mt-1 drop-shadow-md">
            BAILEARN
          </span>
        </div>

        {/* 2. Main Illustration (vaothingay.png) */}
        {/* Đẩy hình lên một chút bằng pb-20 để không đè vào chữ Chào bạn ở dưới */}
        <div className="flex-1 flex items-center justify-center w-full z-10 pb-20">
           <div className="relative w-full max-w-md h-64 md:h-80 flex items-center justify-center">
              <img 
                src="/assets/logos/vaothingay.png"
                alt="Illustration"
                className="w-full h-full object-contain drop-shadow-xl transform hover:scale-105 transition-transform duration-500"
              />
           </div>
        </div>

        {/* 3. Text 'Chào bạn!' - Nằm góc dưới bên trái */}
        <div className="absolute bottom-28 left-12 z-10">
           <h2 className="text-4xl font-normal">Chào bạn!</h2>
        </div>

        {/* 4. Pagination Dots - CĂN GIỮA VÀ NẰM DƯỚI CÙNG */}
        <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 z-10 flex gap-4">
             <div className="w-3 h-3 rounded-full bg-white cursor-pointer hover:bg-gray-200 transition-colors" />
             <div className="w-3 h-3 border border-white cursor-pointer hover:bg-white/20 transition-colors rounded-sm" />
             <div className="w-3 h-3 border border-white cursor-pointer hover:bg-white/20 transition-colors transform rotate-45 rounded-sm" />
        </div>
      </div>

      {/* --- RIGHT PANEL --- */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-8">
          
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Đăng nhập</h1>
            <p className="text-sm text-gray-500 max-w-xs mx-auto">
              Câu này có thể là tagline hoặc mục đích của app này nha
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email Input */}
            <div className="space-y-1">
              <input
                {...register('email')}
                placeholder="Tên đăng nhập/Tài khoản email"
                className="w-full px-6 py-3.5 border border-gray-300 rounded-full text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                type="email"
                aria-invalid={!!errors.email}
              />
              {errors.email && <p className="text-sm text-red-500 px-4">{errors.email.message}</p>}
            </div>

            {/* Password Input */}
            <div className="relative space-y-1">
              <input
                {...register('password')}
                placeholder="Mật khẩu"
                className="w-full px-6 py-3.5 border border-gray-300 rounded-full text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-12"
                type={showPassword ? "text" : "password"} // Thay đổi type dựa trên state
                aria-invalid={!!errors.password}
              />
              {/* Eye Icon Button */}
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} // Thêm sự kiện click
                className="absolute right-5 top-3.5 text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {showPassword ? (
                  // Icon Mắt gạch chéo (Ẩn mật khẩu)
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  // Icon Mắt mở (Hiện mật khẩu)
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
              {errors.password && <p className="text-sm text-red-500 px-4">{errors.password.message}</p>}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between text-sm px-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={remember} 
                  onChange={() => setRemember((s) => !s)} 
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                />
                <span className="text-gray-500">Ghi nhớ tôi khi đăng nhập</span>
              </label>
              <Link href="/auth/forgot" className="text-gray-500 underline hover:text-blue-600">
                Quên mật khẩu?
              </Link>
            </div>

            {serverError && <div className="text-sm text-red-600 text-center">{serverError}</div>}

            {/* Login Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#2563EB] text-white py-3.5 rounded-full font-medium shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-70"
            >
              {isSubmitting ? 'Đang xử lý...' : 'Đăng nhập'}
            </button>

            {/* Google Login Button */}
            <button
              type="button"
              className="w-full flex items-center justify-center gap-3 border border-gray-300 bg-white py-3.5 rounded-full text-gray-700 font-medium hover:bg-gray-50 transition-all"
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
              Đăng nhập bằng tài khoản Google
            </button>

            {/* Register Link */}
            <div className="text-center text-sm text-gray-500 pt-2">
              Bạn chưa có tài khoản? <Link href="/auth/signup" className="text-gray-900 font-semibold hover:underline">Đăng ký tại đây</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}