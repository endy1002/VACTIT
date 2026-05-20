import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

const SAFE_SELECT = {
  user_id: true,
  name: true,
  email: true,
  role: true,
  membership: true,
  created_at: true,
} as const;

const ALLOWED_ROLES = new Set(['Student', 'Admin']);

const isAdminRole = (role: unknown) => String(role ?? '').trim().toLowerCase() === 'admin';

function serializeUser(user: any) {
  return {
    user_id: user.user_id,
    name: user.name,
    email: user.email,
    role: user.role,
    membership: user.membership,
    created_at: user.created_at instanceof Date ? user.created_at.toISOString() : user.created_at,
  };
}

async function ensureAdmin(req: NextRequest) {
  if (process.env.USE_DEV_MOCK === '1') return null;

  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const email = (token as any)?.email as string | undefined;
    const id = ((token as any)?.id ?? (token as any)?.sub) as string | undefined;

    const prisma = await getPrisma();
    const user = email
      ? await prisma.user.findUnique({ where: { email }, select: { role: true } })
      : id
        ? await prisma.user.findUnique({ where: { user_id: id }, select: { role: true } })
        : null;

    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAdminRole(user.role)) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
    }
    return null;
  } catch (err) {
    console.error('ensureAdmin failed', err);
    return NextResponse.json({ ok: false, error: 'Auth check failed' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const authError = await ensureAdmin(req);
  if (authError) return authError;

  try {
    const prisma = await getPrisma();
    const users = await prisma.user.findMany({
      select: SAFE_SELECT,
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({ ok: true, data: users.map(serializeUser) });
  } catch (err) {
    console.error('GET /api/admin/users error', err);
    return NextResponse.json({ ok: false, error: 'Failed to load users' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const authError = await ensureAdmin(req);
  if (authError) return authError;

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body.userId !== 'string' || typeof body.role !== 'string') {
      return NextResponse.json({ ok: false, error: 'userId and role are required' }, { status: 400 });
    }

    const trimmedRole = body.role.trim();
    if (!ALLOWED_ROLES.has(trimmedRole)) {
      return NextResponse.json({ ok: false, error: 'Invalid role' }, { status: 400 });
    }

    const prisma = await getPrisma();
    const updated = await prisma.user.update({
      where: { user_id: body.userId },
      data: { role: trimmedRole },
      select: SAFE_SELECT,
    });

    return NextResponse.json({ ok: true, data: serializeUser(updated) });
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return NextResponse.json({ ok: false, error: 'User not found' }, { status: 404 });
    }
    console.error('PATCH /api/admin/users error', err);
    return NextResponse.json({ ok: false, error: 'Failed to update role' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  return NextResponse.json({ ok: false, error: 'Method not allowed' }, { status: 405 });
}

export async function POST(req: NextRequest) {
  return NextResponse.json({ ok: false, error: 'Method not allowed' }, { status: 405 });
}

export async function DELETE(req: NextRequest) {
  return NextResponse.json({ ok: false, error: 'Method not allowed' }, { status: 405 });
}
