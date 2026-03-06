import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const PUBLIC_PATHS = ['/auth/login', '/auth/signup', '/terms', '/_next', '/favicon.ico', '/assets'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ============ MAINTENANCE MODE ============
  // Set MAINTENANCE_MODE=true on Vercel to block all users
  if (process.env.MAINTENANCE_MODE === 'true' && pathname !== '/maintenance') {
    return NextResponse.rewrite(new URL('/maintenance', req.url));
  }
  // Allow access to maintenance page even when not in maintenance mode
  if (pathname === '/maintenance' && process.env.MAINTENANCE_MODE !== 'true') {
    return NextResponse.redirect(new URL('/', req.url));
  }
  // ============================================

  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.redirect(new URL('/auth/login', req.url));

  // Optional role check
  if (token.role !== 'Student') return NextResponse.redirect(new URL('/auth/login', req.url));

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
