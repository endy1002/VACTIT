import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import convertPdfAndUpload from '@/lib/pdfConvert';
import dotenv from 'dotenv';
import path from 'path';
import { getToken } from 'next-auth/jwt';
import { devStore } from '@/lib/devMock';

// Ensure this route runs in a Node.js runtime (required for Buffer and supabase-js)
export const runtime = 'nodejs';

const isAdminRole = (role: unknown) => String(role ?? '').trim().toLowerCase() === 'admin';

// Attempt to load service env file from a few likely locations when vars are missing
try {
  const need = !process.env.SUPABASE_SERVICE_ROLE_KEY || !(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_API);
  if (need) {
    const candidates = [
      path.resolve(process.cwd(), 'src/services/api/.env'),
      path.resolve(process.cwd(), '../services/api/.env'),
      path.resolve(process.cwd(), '../../services/api/.env'),
      path.resolve(process.cwd(), 'services/api/.env'),
      path.resolve(process.cwd(), '../../../../../src/services/api/.env'),
    ];
    let loaded: string | null = null;
    for (const p of candidates) {
      try {
        const res = dotenv.config({ path: p });
        if (!res.error) {
          loaded = p;
          break;
        }
      } catch (e) {
        // ignore
      }
    }
    console.log('process.cwd()=', process.cwd());
    if (loaded) console.log('Loaded env from', loaded);
    else console.warn('No service .env loaded from candidates', candidates);
  }
} catch (e) {
  console.warn('Failed to attempt loading service env file', e);
}

// Log current Supabase env presence for debugging
console.log('Supabase env check:', { SUPABASE_URL: !!process.env.SUPABASE_URL, NEXT_PUBLIC_API: !!process.env.NEXT_PUBLIC_API, SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY });

// Helper: ensure requester is authenticated and has role 'Admin'
async function checkAdmin(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    // prefer email for lookup (safer across different id fields), fallback to id/sub
    const email = (token as any).email as string | undefined;
    const id = ((token as any).id ?? (token as any).sub) as string | undefined;

    const prisma = await getPrisma();
    const user = email
      ? await prisma.user.findUnique({ where: { email } })
      : id
        ? await prisma.user.findUnique({ where: { user_id: id } })
        : null;

    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    if (!isAdminRole(user.role)) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
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
    const prisma = await getPrisma();
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
    // accept either JSON or multipart/form-data (for file uploads)
    const contentType = req.headers.get('content-type') ?? '';

    let fields: any = {};
    let file: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      // extract expected fields
      form.forEach((v, k) => {
        if (k === 'file' && v instanceof File) file = v as File;
        else fields[k] = typeof v === 'string' ? v : v.toString();
      });
    } else {
      fields = await req.json();
    }

    const { title, start_time, due_time, type, status, duration, author_id, answers, num_questions } = fields;

    // Normalize incoming `type` and `status` and parse times accordingly
    const allowedTypes = ['practice', 'exam'];
    const incomingType = typeof type === 'string' ? type.toLowerCase() : '';
    const normType = allowedTypes.includes(incomingType) ? incomingType : 'practice';

    const incomingStatus = typeof status === 'string' ? status.toLowerCase() : '';
    const normStatus = incomingStatus === 'premium' ? 'Premium' : 'Regular';

    // generate a simple test_id — in production you may want a nicer format
    const test_id = String(Date.now());

    // If using dev mock, mimic behavior
    if (process.env.USE_DEV_MOCK === '1') {
      const created = await devStore.create({ test_id, title, start_time, due_time, type, status, url: fields.url ?? '', duration });
      // also create questions locally (devStore not supporting that currently)
      return NextResponse.json({ ok: true, data: created }, { status: 201 });
    }

    // If a file was uploaded, try to upload to Supabase Storage (if configured)
    let publicUrl = fields.url ?? '';

    try {
      if (file && (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_API) && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_API || '').replace(/\/$/, '');
        const bucket = 'pdf_files';
        const bucket_img = 'test_images';
        const objectPath = `${test_id}.pdf`;

        // Prefer using the official Supabase JS client server-side for uploads
        try {
          const { createClient } = await import('@supabase/supabase-js');
          const supa = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!);

          // Convert File to Buffer for Node upload
          const buf = Buffer.from(await (file as any).arrayBuffer());

          const uploadRes = await supa.storage.from(bucket).upload(objectPath, buf, { contentType: (file as any).type || 'application/pdf', upsert: true });
          console.log('Supabase client upload result:', { status: (uploadRes as any)?.status, error: (uploadRes as any)?.error });
          if ((uploadRes as any)?.error) {
            console.error('Supabase client upload error', (uploadRes as any).error);
          } else {
            const publicRes = supa.storage.from(bucket).getPublicUrl(objectPath);
            console.log('Supabase getPublicUrl result:', { data: publicRes?.data, error: (publicRes as any)?.error });
            publicUrl = publicRes?.data?.publicUrl ?? `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectPath}`;
            console.log('Uploaded file to supabase (client), publicUrl=', publicUrl);


            // Convert PDF -> images and upload them back to storage (best-effort)
            try {
              const res = await convertPdfAndUpload(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!, bucket, objectPath, 'png', bucket_img);
              if (res && res.uploaded && res.uploaded.length) {
                console.log('PDF converted and images uploaded:', res.uploaded.length);
              } else {
                console.log('PDF conversion result:', res);
              }
            } catch (convErr) {
              console.error('PDF conversion/upload failed', convErr);
            }
          }
        } catch (clientErr) {
          console.warn('Supabase client not available or upload failed, falling back to REST PUT', clientErr);
          // Fallback: REST PUT to storage endpoint
          const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${objectPath}`;
          const resp = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              apikey: `${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              'x-upsert': 'true',
              'Content-Type': (file as any).type || 'application/pdf',
            },
            body: await (file as any).arrayBuffer(),
          });

          const respText = await resp.text().catch(() => '<no-body>');
          if (!resp.ok) {
            console.error('Supabase upload failed', resp.status, resp.statusText, respText);
          } else {
            publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectPath}`;
            console.log('Uploaded file to supabase (fallback), publicUrl=', publicUrl);

            try {
              const res = await convertPdfAndUpload(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!, bucket, objectPath, 'png');
              if (res && res.uploaded?.length) console.log('PDF converted and images uploaded (fallback):', res.uploaded.length);
              else console.log('PDF conversion result (fallback):', res);
            } catch (convErr) {
              console.error('PDF conversion/upload failed (fallback)', convErr);
            }
          }
        }
      }
    } catch (e) {
      console.error('File upload error', e);
    }

    // obtain Prisma client (deferred)
    const prisma = await getPrisma();

    // ensure we have a valid author_id that exists in Users (avoid FK violation)
    let authorId = author_id;
    if (!authorId) {
      const adminUser = await prisma.user.findFirst({ where: { role: 'Admin' } });
      if (adminUser) authorId = adminUser.user_id;
      else {
        // create a fallback system user if none exists
        const sys = await prisma.user.upsert({
          where: { user_id: 'system' },
          update: {},
          create: {
            user_id: 'system',
            name: 'System',
            email: 'system@local',
            role: 'Admin',
            membership: 'Regular',
            created_at: new Date(),
            hash_password: '',
          },
        });
        authorId = sys.user_id;
      }
    }

    // parse start/due times according to normalized type
    const parsedStart = normType === 'practice' ? null : start_time ? new Date(start_time) : null;
    const parsedDue = normType === 'practice' ? null : due_time ? new Date(due_time) : null;

    // create Test record (use normalized type/status and parsed times)
    const created = await prisma.test.create({
      data: {
        test_id,
        title: title ?? 'Untitled',
        start_time: parsedStart,
        due_time: parsedDue,
        type: normType,
        status: normStatus,
        url: publicUrl ?? '',
        duration: typeof duration === 'number' ? duration : (typeof duration === 'string' && duration ? Number(duration) : null),
        author_id: authorId,
      },
    });

    // LOGIC TẠO THÔNG BÁO (NOTIFICATION)
    if (created.type === 'exam') {
        try {
            // Kiểm tra xem prisma.notification có tồn tại không
            if ((prisma as any).notification) {
                await (prisma as any).notification.create({
                    data: {
                        title: 'Đề thi mới đã lên kệ! 📝',
                        message: `Thử sức ngay với đề thi: ${created.title}`,
                        type: 'exam',
                        link: `/exam`, // Link trỏ tới trang bài thi
                        user_id: null, // Broadcast
                    }
                });
                console.log(`[Notification] Created broadcast for test: ${created.test_id}`);
            } else {
                console.warn('[Notification] Prisma Notification model not found. Run npx prisma generate.');
            }
        } catch (notifErr) {
            console.error('[Notification] Failed to create notification:', notifErr);
            // Không throw error để tránh làm lỗi API tạo test
        }
    }

    // If answers string present, create Question records
    if (answers && num_questions) {
      // debug: ensure Prisma client includes Question delegate
      try {
        console.log('Prisma delegates available:', Object.keys((prisma as any)._dmmf?.modelMap ?? {}));
        console.log('prisma.question exists?', typeof (prisma as any).question !== 'undefined');
      } catch (dbgErr) {
        console.error('Prisma debug error', dbgErr);
      }
      try {
        const n = Number(num_questions);
        const cleaned = String(answers).replace(/[^A-Za-z]/g, '').toUpperCase();
        const items = [] as Array<any>;
        for (let i = 0; i < n; i++) {
          const opt = cleaned[i] ?? null;
          // use test_id + ordinal (e.g. test01_1) to avoid previous format issues
          items.push({
            question_id: `${test_id}_${i + 1}`,
            relative_score: 1,
            test_id,
            correct_option: opt,
          });
        }
        if (items.length) {
          const modelMap = (prisma as any)?._dmmf?.modelMap ?? {};
          console.log('Prisma delegates available:', Object.keys(modelMap));
          console.log('prisma.question exists?', typeof (prisma as any).question !== 'undefined');
          console.log('Upload debug: filePresent=', !!file, 'SUPABASE_URL=', !!process.env.SUPABASE_URL || !!process.env.NEXT_PUBLIC_API, 'SUPABASE_KEY=', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

          function esc(s: any) {
            if (s === null || s === undefined) return null;
            return String(s).replace(/'/g, "''");
          }

          try {
            if ((prisma as any).question) {
              try {
                const res = await (prisma as any).question.createMany({ data: items });
                console.log('Created questions count:', (res as any).count ?? res);
              } catch (qmErr) {
                console.error('createMany questions error', qmErr);
                for (const it of items) {
                  try {
                    await (prisma as any).question.create({ data: it });
                  } catch (iErr) {
                    console.error('Failed creating question', it.question_id, iErr);
                  }
                }
              }
            } else {
              console.warn('Prisma Question delegate missing; inserting via raw SQL fallback');
              const vals = items
                .map((it) => {
                  const qid = esc(it.question_id);
                  const score = (it.relative_score ?? 0);
                  const tid = esc(it.test_id);
                  const opt = it.correct_option == null ? 'NULL' : `'${esc(it.correct_option)}'`;
                  return `('${qid}', ${score}, '${tid}', ${opt})`;
                })
                .join(', ');

              if (vals.length > 0) {
                const sql = `INSERT INTO "Question" ("question_id","relative_score","test_id","correct_option") VALUES ${vals};`;
                await prisma.$executeRawUnsafe(sql);
                console.log('Inserted questions via raw SQL fallback:', items.length);
              }
            }
          } catch (e) {
            console.error('questions creation overall error', e);
          }
        }
      } catch (e) {
        console.error('Failed to create questions:', e);
      }
    }

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

    const prisma = await getPrisma();
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

    const prisma = await getPrisma();
    // delete dependent questions first to avoid FK constraint violations
    try {
      await prisma.$transaction([
        (prisma as any).question.deleteMany({ where: { test_id } }),
        prisma.test.delete({ where: { test_id } }),
      ]);
    } catch (txErr) {
      // If transaction fails, try a safer sequence: delete questions then delete test
      try {
        await (prisma as any).question.deleteMany({ where: { test_id } });
      } catch (qErr) {
        console.error('Failed to delete questions for test', test_id, qErr);
      }
      await prisma.test.delete({ where: { test_id } });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/admin/tests error', err);
    return NextResponse.json({ ok: false, error: 'Failed to delete test' }, { status: 500 });
  }
}
