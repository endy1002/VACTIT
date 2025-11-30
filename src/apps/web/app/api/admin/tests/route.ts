import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';
import { devStore } from '@/lib/devMock';

// Helper: ensure requester is authenticated and has role 'Admin'
async function checkAdmin(req: NextRequest) {
  try {
    // Dev bypass: when using dev mock, allow access for convenience
    // (developer can enable by setting USE_DEV_MOCK=1 in local environment)
    if (process.env.USE_DEV_MOCK === '1') {
      return null;
    }
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    // prefer email for lookup (safer across different id fields), fallback to id/sub
    const email = (token as any).email as string | undefined;
    const id = ((token as any).id ?? (token as any).sub) as string | undefined;

    const user = email
      ? await prisma.user.findUnique({ where: { email } })
      : id
      ? await prisma.user.findUnique({ where: { user_id: id } })
      : null;

    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'Admin') return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
    return null;
  } catch (err) {
    console.error('checkAdmin error', err);
    return NextResponse.json({ ok: false, error: 'Auth check failed' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const authErr = await checkAdmin(req);
  if (authErr) return authErr;

  try {
    if (process.env.USE_DEV_MOCK === '1') {
      const tests = await devStore.findMany();
      return NextResponse.json({ ok: true, data: tests });
    }
    const tests = await prisma.test.findMany({ orderBy: { start_time: 'desc' } });
    return NextResponse.json({ ok: true, data: tests });
  } catch (err) {
    console.error('GET /api/admin/tests error', err);
    return NextResponse.json({ ok: false, error: 'Failed to list tests' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authErr = await checkAdmin(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { title, start_time, due_time, type, status, url, duration } = body;

    // generate a simple test_id — in production you may want a nicer format
    const test_id = String(Date.now());

    if (process.env.USE_DEV_MOCK === '1') {
      const created = await devStore.create({ test_id, title, start_time, due_time, type, status, url, duration });
      return NextResponse.json({ ok: true, data: created }, { status: 201 });
    }

    const created = await prisma.test.create({
      data: {
        test_id,
        title: title ?? 'Untitled',
        start_time: start_time ? new Date(start_time) : null,
        due_time: due_time ? new Date(due_time) : null,
        type: type ?? 'practice',
        status: status ?? 'Regular',
        url: url ?? '',
        duration: typeof duration === 'number' ? duration : null,
        // author_id can be set later from session
        author_id: body.author_id ?? 'system',
      },
    });

    return NextResponse.json({ ok: true, data: created }, { status: 201 });
  } catch (err) {
    console.error('POST /api/admin/tests error', err);
    return NextResponse.json({ ok: false, error: 'Failed to create test' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const authErr = await checkAdmin(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { test_id, title, start_time, due_time, type, status, url, duration } = body;
    if (!test_id) return NextResponse.json({ ok: false, error: 'test_id is required' }, { status: 400 });

    if (process.env.USE_DEV_MOCK === '1') {
      const updated = await devStore.update(test_id, { title, start_time, due_time, type, status, url, duration });
      return NextResponse.json({ ok: true, data: updated });
    }

    const updated = await prisma.test.update({
      where: { test_id },
      data: {
        title,
        start_time: start_time ? new Date(start_time) : null,
        due_time: due_time ? new Date(due_time) : null,
        type,
        status,
        url,
        duration: typeof duration === 'number' ? duration : null,
      },
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (err) {
    console.error('PUT /api/admin/tests error', err);
    return NextResponse.json({ ok: false, error: 'Failed to update test' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const authErr = await checkAdmin(req);
  if (authErr) return authErr;

  try {
    const { searchParams } = new URL(req.url);
    const test_id = searchParams.get('test_id');
    if (!test_id) return NextResponse.json({ ok: false, error: 'test_id query required' }, { status: 400 });

    if (process.env.USE_DEV_MOCK === '1') {
      await devStore.delete(test_id);
      return NextResponse.json({ ok: true });
    }

    await prisma.test.delete({ where: { test_id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/admin/tests error', err);
    return NextResponse.json({ ok: false, error: 'Failed to delete test' }, { status: 500 });
  }
}
