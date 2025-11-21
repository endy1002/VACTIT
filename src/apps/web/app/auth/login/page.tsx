'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
    <div className="min-h-screen flex">
      {/* Left illustration panel */}
      <div className="hidden md:flex w-1/2 bg-blue-600 text-white flex-col items-center justify-between p-12">
        <div className="w-full flex justify-start">
          <div className="w-28 h-12 bg-yellow-300 rounded flex items-center justify-center">
            <span className="font-semibold text-blue-700">LOGO</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-72 h-72 bg-yellow-300 rounded-xl shadow-lg mb-8 flex items-center justify-center">
            <span className="text-2xl font-bold text-blue-700">Illustration</span>
          </div>
          <h2 className="text-4xl font-semibold mb-3">Chào bạn!</h2>
          <p className="opacity-90 max-w-xs text-center">Câu này có thể là tagline hoặc mục đích của app này nha</p>
        </div>

        <div className="w-full flex justify-center gap-3 pb-6">
          <div className="w-3 h-3 rounded-full bg-white" />
          <div className="w-3 h-3 rounded border border-white/60" />
          <div className="w-3 h-3 rounded border border-white/60" />
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-semibold mb-2">Đăng nhập</h1>
          <p className="text-sm text-gray-500 mb-6">Câu này có thể là tagline hoặc mục đích của app này nha</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 bg-white">
            <input
              {...register('email')}
              placeholder="Tên đăng nhập/Tài khoản email"
              className="w-full px-3 py-2 border rounded-md"
              type="email"
              aria-invalid={!!errors.email}
            />
            {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}

            <div className="relative">
              <input
                {...register('password')}
                placeholder="Mật khẩu"
                className="w-full px-3 py-2 border rounded-md pr-10"
                type="password"
                aria-invalid={!!errors.password}
              />
              {/* eye icon placeholder */}
              <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden>
                👁️
              </button>
            </div>
            {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={remember} onChange={() => setRemember((s) => !s)} className="w-4 h-4" />
                <span className="text-gray-600">Ghi nhớ tôi</span>
              </label>
              <Link href="/auth/forgot" className="text-blue-600">Quên mật khẩu?</Link>
            </div>

            {serverError && <div className="text-sm text-red-600">{serverError}</div>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white py-3 rounded-lg shadow-sm disabled:opacity-60"
            >
              {isSubmitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
            </button>

            <div className="flex items-center gap-3 my-2">
              <hr className="flex-1 border-t border-gray-200" />
              <span className="text-sm text-gray-400">hoặc</span>
              <hr className="flex-1 border-t border-gray-200" />
            </div>

            <button
              type="button"
              className="w-full flex items-center justify-center gap-3 border rounded-lg py-3 mb-2"
            >
              <span className="w-5 h-5 bg-gray-200 rounded-full" /> Đăng nhập bằng Google
            </button>

            <div className="text-center text-sm text-gray-500 mt-3">
              Bạn chưa có tài khoản? <Link href="/auth/signup" className="text-blue-600">Đăng ký từ đây</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
