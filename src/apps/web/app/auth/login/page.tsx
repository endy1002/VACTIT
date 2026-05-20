'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn, getSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '@/lib/api-client';
import ReCAPTCHA from 'react-google-recaptcha';

const schema = z.object({
  email: z.string().email({ message: 'Email không hợp lệ' }),
  password: z.string().min(6, { message: 'Mật khẩu tối thiểu 6 ký tự' }),
});
type FormData = z.infer<typeof schema>;

type Slide = {
  id: string;
  image: string;
  title: string;
  description?: string;
  dot: 'circle' | 'square' | 'triangle';
};

const slides: Slide[] = [
  {
    id: 'welcome',
    image: '/assets/logos/LoginLogo1.png',
    title: 'Chào bạn!',
    description: undefined,
    dot: 'circle',
  },
  {
    id: 'practice',
    image: '/assets/logos/LoginLogo2.png',
    title: 'Chào bạn đã đến với',
    description: undefined,
    dot: 'square',
  },
  {
    id: 'progress',
    image: '/assets/logos/LoginLogo3.png',
    title: 'Chào bạn đã đến với web thi thử ĐGNL của BaiLearn!',
    description: undefined,
    dot: 'triangle',
  },
];

function DotIcon({ type, active }: { type: Slide['dot']; active: boolean }) {
  const color = active ? '#FFFFFF' : 'rgba(255,255,255,0.6)';
  switch (type) {
    case 'square':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="1.5" y="1.5" width="11" height="11" rx="2" stroke={color} strokeWidth="2" />
        </svg>
      );
    case 'triangle':
      return (
        <svg width="16" height="14" viewBox="0 0 16 14" fill="none">
          <path d="M2 12.5L8 1.5L14 12.5H2Z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
        </svg>
      );
    default:
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="5" stroke={color} strokeWidth="2" />
        </svg>
      );
  }
}

type ForgotStep = 'email' | 'otp' | 'password' | 'success';

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const recaptchaRef = useRef<ReCAPTCHA | null>(null);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<ForgotStep>('email');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotPassword, setForgotPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotInfo, setForgotInfo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const currentSlide = slides[activeSlide];

  async function onSubmit(data: FormData) {
    setServerError(null);

    if (!captchaToken) {
      setServerError('Hãy hoàn thành captcha trước khi đăng nhập.');
      return;
    }

    try {
      console.log('[Login] Attempting signIn with:', data.email);
      const res = await signIn('credentials', {
        redirect: false,
        email: data.email,
        password: data.password,
        captchaToken,
      });

      console.log('[Login] signIn response:', { 
        ok: res?.ok, 
        status: res?.status, 
        error: res?.error,
        url: res?.url 
      });

      if (res?.error) {
        console.error('[Login] signIn error:', res.error);
        setServerError(res.error);
        return;
      }

      // Important: make sure session is refreshed AFTER successful signIn
      // (sometimes the first getSession() is stale right after login)
      console.log('[Login] Fetching session...');
      const session = await getSession();

      console.log('[Login] Session data:', session ? {
        hasUser: !!session.user,
        email: (session.user as any)?.email,
        role: (session.user as any)?.role,
        id: (session.user as any)?.id
      } : 'null');

      if (!session) {
        console.error('[Login] No session token found after login');
        setServerError('Login succeeded but session was not created. Please try again.');
        return;
      }
      console.log('Session found after login:', !!session);

      const role = String((session.user as any)?.role ?? '').trim().toLowerCase();
      console.log('[Login] Redirecting to:', role === 'admin' ? '/admin' : '/');
      if (role === 'admin') router.replace('/admin');
      else router.replace('/');
    } finally {
      // Non-negotiable: token is single-use
      // Reset BOTH the captcha widget + the state token
      recaptchaRef.current?.reset();
      setCaptchaToken(null);
    }
  }

  // Forgot password handlers
  function openForgotModal() {
    setShowForgotModal(true);
    setForgotStep('email');
    setForgotEmail('');
    setForgotOtp('');
    setForgotPassword('');
    setForgotConfirmPassword('');
    setForgotError(null);
    setForgotInfo(null);
  }

  function closeForgotModal() {
    setShowForgotModal(false);
    setForgotStep('email');
    setForgotError(null);
    setForgotInfo(null);
  }

  async function handleForgotSubmit(e: React.FormEvent) {
    e.preventDefault();
    setForgotError(null);
    setForgotInfo(null);

    if (forgotStep === 'email') {
      if (!forgotEmail.trim()) {
        setForgotError('Vui lòng nhập email.');
        return;
      }
      setForgotLoading(true);
      try {
        const res = await api.auth.forgotPasswordSendOtp({ email: forgotEmail.trim().toLowerCase() });
        if (res.error) {
          setForgotError(res.error);
        } else {
          setForgotStep('otp');
          setForgotInfo('Mã xác nhận đã được gửi tới email của bạn.');
        }
      } catch (err: any) {
        setForgotError(err.message || 'Không thể gửi mã xác nhận.');
      }
      setForgotLoading(false);
      return;
    }

    if (forgotStep === 'otp') {
      if (forgotOtp.trim().length !== 6) {
        setForgotError('Mã xác nhận cần đủ 6 chữ số.');
        return;
      }
      setForgotLoading(true);
      try {
        const res = await api.auth.forgotPasswordVerifyOtp({ 
          email: forgotEmail.trim().toLowerCase(), 
          code: forgotOtp.trim() 
        });
        if (res.error) {
          setForgotError(res.error);
        } else {
          setForgotStep('password');
          setForgotInfo('Email đã được xác minh. Hãy đặt mật khẩu mới.');
        }
      } catch (err: any) {
        setForgotError(err.message || 'Mã xác nhận không hợp lệ.');
      }
      setForgotLoading(false);
      return;
    }

    if (forgotStep === 'password') {
      if (forgotPassword.length < 8) {
        setForgotError('Mật khẩu cần tối thiểu 8 ký tự.');
        return;
      }
      if (forgotPassword !== forgotConfirmPassword) {
        setForgotError('Mật khẩu xác nhận không khớp.');
        return;
      }
      setForgotLoading(true);
      try {
        const res = await api.auth.forgotPasswordReset({ 
          email: forgotEmail.trim().toLowerCase(), 
          password: forgotPassword 
        });
        if (res.error) {
          setForgotError(res.error);
        } else {
          setForgotStep('success');
          setForgotInfo('Mật khẩu đã được đặt lại thành công!');
        }
      } catch (err: any) {
        setForgotError(err.message || 'Không thể đặt lại mật khẩu.');
      }
      setForgotLoading(false);
    }
  }

  async function handleForgotResendOtp() {
    setForgotError(null);
    setForgotLoading(true);
    try {
      const res = await api.auth.forgotPasswordSendOtp({ email: forgotEmail.trim().toLowerCase() });
      if (res.error) {
        setForgotError(res.error);
      } else {
        setForgotInfo('Đã gửi lại mã xác nhận.');
      }
    } catch (err: any) {
      setForgotError(err.message || 'Không thể gửi lại mã.');
    }
    setForgotLoading(false);
  }

  return (
    <div className="min-h-screen flex font-sans">
      {/* --- LEFT PANEL --- */}
      <div className="hidden md:flex w-1/2 bg-[#2563EB] text-white px-8 py-8 relative overflow-hidden">
        <div className="flex flex-col w-full h-full z-10 items-center justify-start gap-4">
          {/* 1. Logo Section (Logo + Text) */}
          <div className="flex flex-col items-center gap-3 w-full">
            <div className="w-28 h-28 relative flex items-center justify-center mx-auto">
              {/* Sử dụng file logo.png và ép màu vàng bằng CSS Filter */}
              <img 
                src="/assets/logos/BaiLearnLogo.png" 
                alt="BAILEARN Logo"
                className="w-full h-full object-contain"
              />
            </div>
          </div>

           {/* 2. Main Illustration slider */}
            <div className="w-full flex items-start justify-center pt-1 mb-6">
             <div className="relative w-full max-w-md h-56 md:h-84 flex items-center justify-center">
                <img 
                  key={currentSlide.id}
                  src={currentSlide.image}
                  alt="Illustration"
                  className="w-full h-full object-contain drop-shadow-xl transition-all duration-700 ease-out animate-slide-in"
                />
             </div>
          </div>

          {/* 3. Dynamic Slide Copy + dots */}
           <div className="w-full px-1 mt-6">
             <h2 className="text-[28px] text-white font-normal text-start">{currentSlide.title}</h2>
             <div className="mt-4 flex gap-6 justify-center">
              {slides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => setActiveSlide(index)}
                  aria-label={`Chuyển sang slide ${index + 1}`}
                  className="transition-opacity duration-200"
                  style={{ opacity: index === activeSlide ? 1 : 0.6 }}
                >
                  <DotIcon type={slide.dot} active={index === activeSlide} />
                </button>
              ))}
             </div>
          </div>
        </div>
      </div>

      {/* --- RIGHT PANEL --- */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-8">

          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Đăng nhập</h1>
            <p className="text-sm text-gray-500 max-w-xs mx-auto">
              Chào bạn đã đến với web thi thử ĐGNL HCM của BaiLearn !
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
              <button type="button" onClick={openForgotModal} className="text-gray-500 underline hover:text-blue-600">
                Quên mật khẩu?
              </button>
            </div>

            {/* Captcha */}
            <div className="flex justify-center">
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!}
                onChange={(token) => setCaptchaToken(token)}
              />
            </div>

            {serverError && <div className="text-sm text-red-600 text-center">Email hoặc mật khẩu không đúng</div>}

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
              onClick={() => signIn('google', { callbackUrl: '/' })}
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

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-slate-900/60" onClick={closeForgotModal} />
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">BaiLearn</p>
                <h2 className="text-lg font-semibold text-slate-900">Quên mật khẩu</h2>
              </div>
              <button
                type="button"
                onClick={closeForgotModal}
                className="rounded-full p-2 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Đóng"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-slate-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleForgotSubmit} className="px-6 py-5 space-y-4">
              {/* Step indicators */}
              <div className="flex items-center justify-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                <span className={`px-3 py-1 rounded-full ${forgotStep === 'email' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}>Email</span>
                <span className={`px-3 py-1 rounded-full ${forgotStep === 'otp' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}>Xác nhận</span>
                <span className={`px-3 py-1 rounded-full ${forgotStep === 'password' || forgotStep === 'success' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}>Mật khẩu</span>
              </div>

              {/* Email Step */}
              {forgotStep === 'email' && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 text-center">Nhập email đã đăng ký để nhận mã xác nhận.</p>
                  <input
                    type="email"
                    placeholder="Email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full px-6 py-3.5 border border-gray-300 rounded-full text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              )}

              {/* OTP Step */}
              {forgotStep === 'otp' && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 text-center">
                    Nhập mã xác nhận 6 số được gửi tới <span className="font-semibold">{forgotEmail}</span>.
                    <button 
                      type="button" 
                      onClick={() => { setForgotStep('email'); setForgotOtp(''); setForgotError(null); setForgotInfo(null); }} 
                      className="text-blue-600 hover:underline ml-1"
                    >
                      Đổi email
                    </button>
                  </p>
                  <input
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="Nhập mã 6 số"
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-6 py-3.5 border border-gray-300 rounded-full text-center tracking-[0.6em] text-lg font-semibold text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                    <span>Không nhận được mã?</span>
                    <button type="button" onClick={handleForgotResendOtp} className="text-blue-600 font-semibold hover:underline" disabled={forgotLoading}>Gửi lại</button>
                  </div>
                </div>
              )}

              {/* Password Step */}
              {forgotStep === 'password' && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 text-center">Đặt mật khẩu mới cho tài khoản của bạn.</p>
                  <div className="relative">
                    <input
                      type={showForgotPassword ? 'text' : 'password'}
                      placeholder="Mật khẩu mới"
                      value={forgotPassword}
                      onChange={(e) => setForgotPassword(e.target.value)}
                      className="w-full px-6 py-3.5 border border-gray-300 rounded-full text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword((s) => !s)}
                      className="absolute right-5 top-3.5 text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      {showForgotPassword ? (
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
                  <input
                    type={showForgotPassword ? 'text' : 'password'}
                    placeholder="Xác nhận mật khẩu mới"
                    value={forgotConfirmPassword}
                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    className="w-full px-6 py-3.5 border border-gray-300 rounded-full text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              )}

              {/* Success Step */}
              {forgotStep === 'success' && (
                <div className="space-y-3 text-center py-4">
                  <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-green-600">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                  <p className="text-lg font-semibold text-gray-900">Đặt lại mật khẩu thành công!</p>
                  <p className="text-sm text-gray-600">Bạn có thể đăng nhập bằng mật khẩu mới.</p>
                </div>
              )}

              {/* Error/Info messages */}
              {forgotError && <div className="text-sm text-red-600 text-center bg-red-50 p-2 rounded">{forgotError}</div>}
              {forgotInfo && !forgotError && <div className="text-sm text-green-700 text-center bg-green-50 p-2 rounded">{forgotInfo}</div>}

              {/* Submit Button */}
              {forgotStep !== 'success' ? (
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full bg-[#2563EB] text-white py-3.5 rounded-full font-medium shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-70"
                >
                  {forgotStep === 'email' && (forgotLoading ? 'Đang gửi...' : 'Gửi mã xác nhận')}
                  {forgotStep === 'otp' && (forgotLoading ? 'Đang xác nhận...' : 'Xác nhận')}
                  {forgotStep === 'password' && (forgotLoading ? 'Đang lưu...' : 'Đặt lại mật khẩu')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={closeForgotModal}
                  className="w-full bg-[#2563EB] text-white py-3.5 rounded-full font-medium shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
                >
                  Đóng và đăng nhập
                </button>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
