import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/validations/prisma';
import { hashPassword } from '@/lib/validations/passwordhelpers';

const bodySchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(req: Request) {
  const raw = await req.text().catch(() => '');
  if (process.env.NODE_ENV !== 'production') console.debug('RAW BODY:', raw);
  let body;
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch (e) {
    body = {};
  }
  const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
    // return validation details in dev to help debugging
    const details =
      process.env.NODE_ENV !== 'production'
        ? { issues: parsed.error.format(), flat: parsed.error.flatten() }
        : undefined;
    if (process.env.NODE_ENV !== 'production') console.debug('Validation failed:', parsed.error.flatten());
    return NextResponse.json({ error: 'invalid_input', details }, { status: 422 });
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: 'email_exists' }, { status: 409 });

  const hashed = await hashPassword(password);

  const user = await prisma.user.create({
    data: { name, email, password: hashed },
    select: { id: true, email: true, name: true },
  });

  return NextResponse.json({ user }, { status: 201 });
}