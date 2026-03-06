"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = authRoutes;
const zod_1 = require("zod");
const node_crypto_1 = require("node:crypto");
const password_1 = require("../utils/password");
const logger_1 = require("../utils/logger");
// ----- Gmail SMTP for sending OTP emails -----
const EMAIL_USER = process.env.EMAIL_USER;
// ----- Mailtrap (HTTP API) for development/testing -----
const MAILTRAP_API_TOKEN = process.env.MAILTRAP_API_TOKEN;
const DEFAULT_FROM = process.env.EMAIL_FROM ?? EMAIL_USER ?? 'no-reply@vactit.app';
const mailtrapEnabled = !!MAILTRAP_API_TOKEN;
async function sendViaMailtrap(to, subject, html, fromAddress = DEFAULT_FROM) {
    if (!MAILTRAP_API_TOKEN)
        throw new Error('Mailtrap API token not configured');
    const body = {
        from: { email: fromAddress },
        to: [{ email: to }],
        subject,
        html,
    };
    const res = await fetch('https://send.api.mailtrap.io/api/send', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Api-Token': MAILTRAP_API_TOKEN,
        },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Mailtrap send failed: ${res.status} ${res.statusText} ${text}`);
    }
    return await res.json();
}
console.log('[Auth] Email configured:', { mailtrap: mailtrapEnabled, from: DEFAULT_FROM });
async function sendOtpEmail(to, code, name) {
    const fromAddress = DEFAULT_FROM;
    // 1) Mailtrap (dev/test via HTTP API), Supabase SMTP (preferred in some infra)
    if (mailtrapEnabled) {
        try {
            console.log(`[OTP] Sending to ${to} via Mailtrap API...`);
            await sendViaMailtrap(to, 'Mã xác nhận đăng ký VACTIT', `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Xin chào ${name}!</h2>
          <p>Mã xác nhận của bạn là:</p>
          <div style="background: #f5f5f5; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2563eb;">${code}</span>
          </div>
          <p style="color: #666;">Mã này có hiệu lực trong 10 phút.</p>
          <p style="color: #999; font-size: 12px;">Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.</p>
        </div>
      `, fromAddress);
            console.log(`[OTP] Email sent via Mailtrap to ${to}`);
            return true;
        }
        catch (err) {
            console.error('[OTP] Mailtrap API error:', err);
            // fallthrough to other options
        }
    }
    // 4) Dev fallback
    console.log(`[DEV] OTP for ${to}: ${code}`);
    return true;
}
function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}
const otpStore = new Map();
const resetOtpStore = new Map();
const otpAttempts = new Map();
const MAX_OTP_ATTEMPTS = 5;
const LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes
function checkOtpAttempts(email) {
    const entry = otpAttempts.get(email);
    if (!entry) {
        return { allowed: true, attemptsLeft: MAX_OTP_ATTEMPTS };
    }
    // Check if locked
    if (entry.lockedUntil && Date.now() < entry.lockedUntil) {
        const remainingTime = Math.ceil((entry.lockedUntil - Date.now()) / 1000 / 60);
        return { allowed: false, remainingTime };
    }
    // Reset if lock expired
    if (entry.lockedUntil && Date.now() >= entry.lockedUntil) {
        otpAttempts.delete(email);
        return { allowed: true, attemptsLeft: MAX_OTP_ATTEMPTS };
    }
    return { allowed: true, attemptsLeft: MAX_OTP_ATTEMPTS - entry.count };
}
function recordFailedAttempt(email) {
    const entry = otpAttempts.get(email) || { count: 0, lockedUntil: null };
    entry.count += 1;
    if (entry.count >= MAX_OTP_ATTEMPTS) {
        entry.lockedUntil = Date.now() + LOCKOUT_DURATION;
        otpAttempts.set(email, entry);
        return { locked: true, attemptsLeft: 0 };
    }
    otpAttempts.set(email, entry);
    return { locked: false, attemptsLeft: MAX_OTP_ATTEMPTS - entry.count };
}
function resetAttempts(email) {
    otpAttempts.delete(email);
}
function cleanupExpiredEntries() {
    const now = Date.now();
    for (const [email, entry] of otpStore) {
        if (entry.expiresAt < now)
            otpStore.delete(email);
    }
    // Cleanup expired lockouts
    for (const [email, entry] of otpAttempts) {
        if (entry.lockedUntil && entry.lockedUntil < now)
            otpAttempts.delete(email);
    }
    for (const [email, entry] of resetOtpStore) {
        if (entry.expiresAt < now)
            resetOtpStore.delete(email);
    }
}
// Run cleanup every 5 minutes
setInterval(cleanupExpiredEntries, 5 * 60 * 1000);
// ----- Zod schemas -----
const sendOtpSchema = zod_1.z.object({
    email: zod_1.z.string().email('Email không hợp lệ'),
    name: zod_1.z.string().min(1, 'Tên không được để trống'),
});
const verifyOtpSchema = zod_1.z.object({
    email: zod_1.z.string().email('Email không hợp lệ'),
    code: zod_1.z.string().length(6, 'Mã xác nhận phải có 6 chữ số'),
});
const completeSignupSchema = zod_1.z.object({
    email: zod_1.z.string().email('Email không hợp lệ'),
    password: zod_1.z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
});
// Forgot password schemas
const forgotPasswordSchema = zod_1.z.object({
    email: zod_1.z.string().email('Email không hợp lệ'),
});
const verifyResetOtpSchema = zod_1.z.object({
    email: zod_1.z.string().email('Email không hợp lệ'),
    code: zod_1.z.string().length(6, 'Mã xác nhận phải có 6 chữ số'),
});
const resetPasswordSchema = zod_1.z.object({
    email: zod_1.z.string().email('Email không hợp lệ'),
    password: zod_1.z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
});
const signupSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Tên không được để trống'),
    email: zod_1.z.string().email('Sai cú pháp email'),
    password: zod_1.z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Sai cú pháp email'),
    password: zod_1.z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
    captchaToken: zod_1.z.string().min(1, 'Yêu cầu xác thực captcha'),
});
async function verifyRecaptcha(token) {
    const secret = process.env.RECAPTCHA_SECRET_KEY;
    console.log('Secret exists:', !!secret);
    if (!secret)
        return { ok: false, error: 'Captcha not configured' };
    if (!token)
        return { ok: false, error: 'Missing captcha token' };
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ secret, response: token }).toString(),
    });
    if (!response.ok) {
        return { ok: false, error: 'Captcha verification failed' };
    }
    const json = await response.json();
    // Runtime guard (no interface, no type)
    if (typeof json !== 'object' ||
        json === null ||
        !('success' in json) ||
        typeof json.success !== 'boolean') {
        return { ok: false, error: 'Invalid captcha response' };
    }
    if (json.success !== true) {
        console.error('reCAPTCHA error codes:', json['error-codes']);
        return { ok: false, error: 'Invalid captcha' };
    }
    return { ok: true };
}
// OAuth (Google) - we only need enough info to ensure a User exists in DB.
// NextAuth handles Google verification + web session; this endpoint upserts the user record.
const googleOAuthSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    name: zod_1.z.string().min(1).optional(),
    picture: zod_1.z.string().url().optional(),
});
async function authRoutes(server) {
    // ========== SEND OTP ==========
    server.post('/api/auth/send-otp', async (request, reply) => {
        try {
            const parsed = sendOtpSchema.safeParse(request.body);
            if (!parsed.success) {
                reply.status(422);
                return { error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ' };
            }
            const { email, name } = parsed.data;
            const normalizedEmail = email.toLowerCase();
            // Check if email already registered in our DB
            const existing = await server.prisma.user.findUnique({ where: { email: normalizedEmail } });
            if (existing) {
                reply.status(409);
                return { error: 'Email đã được đăng ký. Vui lòng đăng nhập.' };
            }
            // Generate OTP
            const code = generateOtp();
            const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
            // Store OTP with user data
            otpStore.set(normalizedEmail, { code, name, expiresAt });
            // Send OTP email
            const sent = await sendOtpEmail(normalizedEmail, code, name);
            if (!sent) {
                reply.status(500);
                return { error: 'Không thể gửi email. Vui lòng thử lại sau.' };
            }
            console.log(`[OTP] Sent to ${normalizedEmail}`);
            return { success: true, message: 'Mã xác nhận đã được gửi tới email của bạn.' };
        }
        catch (error) {
            console.error('send-otp error:', error);
            reply.status(500);
            return { error: 'Không thể gửi mã OTP. Vui lòng thử lại.' };
        }
    });
    // ========== VERIFY OTP ==========
    server.post('/api/auth/verify-otp', async (request, reply) => {
        try {
            const parsed = verifyOtpSchema.safeParse(request.body);
            if (!parsed.success) {
                reply.status(422);
                return { error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ' };
            }
            const { email, code } = parsed.data;
            const normalizedEmail = email.toLowerCase();
            // Check rate limiting
            const attemptCheck = checkOtpAttempts(normalizedEmail);
            if (!attemptCheck.allowed) {
                reply.status(429);
                return {
                    error: `Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau ${attemptCheck.remainingTime} phút.`,
                    locked: true,
                    remainingTime: attemptCheck.remainingTime
                };
            }
            // Check we have OTP data for this email
            const entry = otpStore.get(normalizedEmail);
            if (!entry) {
                reply.status(400);
                return { error: 'Không tìm thấy mã xác nhận. Vui lòng yêu cầu gửi lại.' };
            }
            if (Date.now() > entry.expiresAt) {
                otpStore.delete(normalizedEmail);
                resetAttempts(normalizedEmail);
                reply.status(400);
                return { error: 'Mã xác nhận đã hết hạn. Vui lòng yêu cầu gửi lại.' };
            }
            if (entry.code !== code) {
                const result = recordFailedAttempt(normalizedEmail);
                reply.status(400);
                if (result.locked) {
                    return {
                        error: 'Bạn đã nhập sai 5 lần. Vui lòng thử lại sau 30 phút.',
                        locked: true,
                        remainingTime: 30
                    };
                }
                return {
                    error: `Mã xác nhận không đúng. Còn ${result.attemptsLeft} lần thử.`,
                    attemptsLeft: result.attemptsLeft
                };
            }
            // Success - reset attempts
            resetAttempts(normalizedEmail);
            console.log(`[OTP] Verified for ${normalizedEmail}`);
            return {
                success: true,
                verified: true,
                message: 'Email đã được xác minh thành công.'
            };
        }
        catch (error) {
            console.error('verify-otp error:', error);
            reply.status(500);
            return { error: 'Không thể xác minh mã. Vui lòng thử lại.' };
        }
    });
    // ========== COMPLETE SIGNUP (after OTP verified) ==========
    server.post('/api/auth/complete-signup', async (request, reply) => {
        try {
            const parsed = completeSignupSchema.safeParse(request.body);
            if (!parsed.success) {
                reply.status(422);
                return { error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ' };
            }
            const { email, password } = parsed.data;
            const normalizedEmail = email.toLowerCase();
            // Check we have OTP data (means they verified)
            const entry = otpStore.get(normalizedEmail);
            if (!entry) {
                reply.status(400);
                return { error: 'Phiên đăng ký đã hết hạn. Vui lòng bắt đầu lại.' };
            }
            if (Date.now() > entry.expiresAt) {
                otpStore.delete(normalizedEmail);
                reply.status(400);
                return { error: 'Phiên đăng ký đã hết hạn. Vui lòng bắt đầu lại.' };
            }
            // Check if user already exists in our DB
            const existing = await server.prisma.user.findUnique({ where: { email: normalizedEmail } });
            if (existing) {
                otpStore.delete(normalizedEmail);
                reply.status(409);
                return { error: 'Email đã được đăng ký.' };
            }
            // Create user in our database
            const hashed = await (0, password_1.hashPassword)(password);
            const user = await server.prisma.user.create({
                data: {
                    user_id: normalizedEmail,
                    name: entry.name,
                    email: normalizedEmail,
                    hash_password: hashed,
                    created_at: new Date(),
                    role: 'Student',
                },
                select: {
                    user_id: true,
                    email: true,
                    name: true,
                    role: true,
                    membership: true,
                },
            });
            // Clean up
            otpStore.delete(normalizedEmail);
            reply.status(201);
            return {
                success: true,
                data: { user },
                message: 'Tài khoản đã được tạo thành công!'
            };
        }
        catch (error) {
            console.error('complete-signup error:', error);
            reply.status(500);
            return { error: 'Không thể tạo tài khoản. Vui lòng thử lại.' };
        }
    });
    // Register/Signup endpoint
    server.post('/api/auth/signup', async (request, reply) => {
        try {
            console.log('Signup request body:', request.body);
            const parsed = signupSchema.safeParse(request.body);
            if (!parsed.success) {
                reply.status(422);
                console.log('Full error:', JSON.stringify(parsed.error, null, 2));
                // Zod uses 'issues' not 'errors'
                const errors = parsed.error.issues;
                if (errors && errors.length > 0) {
                    // Return the first error's custom message
                    const errorMessage = errors[0].message;
                    console.log('Returning error:', errorMessage);
                    return { error: errorMessage };
                }
                return { error: 'Dữ liệu không nhập không hợp lệ !' };
            }
            const { name, email, password } = parsed.data;
            // Check if user exists
            const existing = await server.prisma.user.findUnique({
                where: { email },
            });
            if (existing) {
                reply.status(409);
                return { error: 'Email đã tồn tại' };
            }
            const hashed = await (0, password_1.hashPassword)(password);
            const user = await server.prisma.user.create({
                data: {
                    user_id: email, // Using email as user_id
                    name,
                    email,
                    hash_password: hashed,
                    created_at: new Date(),
                    role: 'Student',
                    // membership defaults to "Regular" in schema
                },
                select: {
                    user_id: true,
                    email: true,
                    name: true,
                    role: true,
                    membership: true,
                },
            });
            reply.status(201);
            return { data: user };
        }
        catch (error) {
            reply.status(500);
            return {
                error: error instanceof Error ? error.message : 'Failed to create user',
            };
        }
    });
    // Login endpoint
    server.post('/api/auth/login', async (request, reply) => {
        try {
            const parsed = loginSchema.safeParse(request.body);
            if (!parsed.success) {
                reply.status(422);
                // Zod uses 'issues' not 'errors'
                const errors = parsed.error.issues;
                if (errors && errors.length > 0) {
                    // Return the first error's custom message
                    return { error: errors[0].message };
                }
                return { error: 'Dữ liệu nhập không hợp lệ !' };
            }
            const { email, password, captchaToken } = parsed.data;
            const captcha = await verifyRecaptcha(captchaToken);
            if (!captcha.ok) {
                reply.status(captcha.error ? 500 : 403);
                return { error: captcha.error || 'Invalid captcha' };
            }
            console.log('[Login] Finding user with email:', email);
            const startDbQuery = Date.now();
            const user = await server.prisma.user.findUnique({
                where: { email },
            });
            console.log('[Login] DB query took:', Date.now() - startDbQuery, 'ms');
            console.log('[Login] User found:', !!user, 'Has password:', !!user?.hash_password);
            if (user?.hash_password) {
                console.log('[Login] Hash format check:', {
                    length: user.hash_password.length,
                    startsWith: user.hash_password.substring(0, 4),
                    isBcrypt: user.hash_password.startsWith('$2a$') || user.hash_password.startsWith('$2b$')
                });
            }
            if (!user || !user.hash_password) {
                reply.status(401);
                return { error: 'Email hoặc mật khẩu không đúng' };
            }
            console.log('[Login] Verifying password...');
            const isValid = await (0, password_1.verifyPassword)(password, user.hash_password);
            console.log('[Login] Password valid:', isValid);
            if (!isValid) {
                (0, logger_1.logAuth)('login', email, false, { reason: 'invalid_password' });
                reply.status(401);
                return { error: 'Email hoặc mật khẩu không đúng' };
            }
            (0, logger_1.logAuth)('login', user.user_id, true, { email, role: user.role });
            return {
                data: {
                    user: {
                        user_id: user.user_id,
                        email: user.email,
                        name: user.name,
                        role: user.role,
                        membership: user.membership,
                    },
                },
            };
        }
        catch (error) {
            (0, logger_1.logError)(error, { context: 'login', email: request.body?.email });
            reply.status(500);
            return {
                error: error instanceof Error ? error.message : 'Đăng nhập thất bại'
            };
        }
    });
    // Google OAuth upsert endpoint
    // Called by the web app (NextAuth callback) after Google authenticates.
    // Purpose: ensure a User row exists in our Postgres DB.
    server.post('/api/auth/oauth/google', async (request, reply) => {
        try {
            const parsed = googleOAuthSchema.safeParse(request.body);
            if (!parsed.success) {
                reply.status(422);
                return {
                    error: 'invalid_input',
                    details: parsed.error.flatten(),
                };
            }
            const { email, name } = parsed.data;
            // 1) If user exists: DO NOT update any fields
            const existing = await server.prisma.user.findUnique({
                where: { email },
                select: {
                    user_id: true,
                    email: true,
                    name: true,
                    role: true,
                    membership: true,
                },
            });
            if (existing) {
                (0, logger_1.logAuth)('oauth', existing.user_id, true, { email, provider: 'google', action: 'existing_user' });
                return { data: { user: existing } };
            }
            // 2) If user does NOT exist: create
            // Must satisfy schema's required hash_password.
            const randomSecret = (0, node_crypto_1.randomBytes)(32).toString('hex');
            const hashed = await (0, password_1.hashPassword)(randomSecret);
            const created = await server.prisma.user.create({
                data: {
                    user_id: email, // keep consistent with your existing signup convention
                    email,
                    name: name ?? email.split('@')[0],
                    role: 'Student',
                    membership: 'Regular',
                    created_at: new Date(),
                    hash_password: hashed,
                },
                select: {
                    user_id: true,
                    email: true,
                    name: true,
                    role: true,
                    membership: true,
                },
            });
            (0, logger_1.logAuth)('oauth', created.user_id, true, { email, provider: 'google', action: 'new_user' });
            return { data: { user: created } };
        }
        catch (error) {
            (0, logger_1.logError)(error, { context: 'oauth_google', email: request.body?.email });
            reply.status(500);
            return {
                error: error instanceof Error ? error.message : 'OAuth create failed',
            };
        }
    });
    // ========== FORGOT PASSWORD - SEND OTP ==========
    server.post('/api/auth/forgot-password/send-otp', async (request, reply) => {
        try {
            const parsed = forgotPasswordSchema.safeParse(request.body);
            if (!parsed.success) {
                reply.status(422);
                return { error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ' };
            }
            const { email } = parsed.data;
            const normalizedEmail = email.toLowerCase();
            // Check if user exists
            const user = await server.prisma.user.findUnique({ where: { email: normalizedEmail } });
            if (!user) {
                reply.status(404);
                return { error: 'Email chưa được đăng ký trong hệ thống.' };
            }
            // Generate OTP
            const code = generateOtp();
            const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
            // Store reset OTP
            resetOtpStore.set(normalizedEmail, { code, verified: false, expiresAt });
            // Send OTP email (prefer Supabase SMTP, then Resend, then Gmail)
            const fromAddress = DEFAULT_FROM;
            // Prefer Mailtrap API for dev/testing
            if (mailtrapEnabled) {
                try {
                    await sendViaMailtrap(normalizedEmail, 'Đặt lại mật khẩu VACTIT', `
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
                  <h2 style="color: #333;">Xin chào ${user.name}!</h2>
                  <p>Bạn đã yêu cầu đặt lại mật khẩu. Mã xác nhận của bạn là:</p>
                  <div style="background: #f5f5f5; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2563eb;">${code}</span>
                  </div>
                  <p style="color: #666;">Mã này có hiệu lực trong 10 phút.</p>
                  <p style="color: #999; font-size: 12px;">Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
                </div>
              `, fromAddress);
                    console.log(`[RESET] OTP sent to ${normalizedEmail} via Mailtrap`);
                }
                catch (emailErr) {
                    console.error('[RESET] Mailtrap API error:', emailErr);
                    reply.status(500);
                    return { error: 'Không thể gửi email. Vui lòng thử lại sau.' };
                }
            }
            else {
                console.log(`[DEV] Reset OTP for ${normalizedEmail}: ${code}`);
            }
            return { success: true, message: 'Mã xác nhận đã được gửi tới email của bạn.' };
        }
        catch (error) {
            console.error('forgot-password send-otp error:', error);
            reply.status(500);
            return { error: 'Không thể gửi mã xác nhận. Vui lòng thử lại.' };
        }
    });
    // ========== FORGOT PASSWORD - VERIFY OTP ==========
    server.post('/api/auth/forgot-password/verify-otp', async (request, reply) => {
        try {
            const parsed = verifyResetOtpSchema.safeParse(request.body);
            if (!parsed.success) {
                reply.status(422);
                return { error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ' };
            }
            const { email, code } = parsed.data;
            const normalizedEmail = email.toLowerCase();
            const attemptKey = `reset:${normalizedEmail}`; // Separate key for reset attempts
            // Check rate limiting
            const attemptCheck = checkOtpAttempts(attemptKey);
            if (!attemptCheck.allowed) {
                reply.status(429);
                return {
                    error: `Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau ${attemptCheck.remainingTime} phút.`,
                    locked: true,
                    remainingTime: attemptCheck.remainingTime
                };
            }
            const entry = resetOtpStore.get(normalizedEmail);
            if (!entry) {
                reply.status(400);
                return { error: 'Không tìm thấy mã xác nhận. Vui lòng yêu cầu gửi lại.' };
            }
            if (Date.now() > entry.expiresAt) {
                resetOtpStore.delete(normalizedEmail);
                resetAttempts(attemptKey);
                reply.status(400);
                return { error: 'Mã xác nhận đã hết hạn. Vui lòng yêu cầu gửi lại.' };
            }
            if (entry.code !== code) {
                const result = recordFailedAttempt(attemptKey);
                reply.status(400);
                if (result.locked) {
                    return {
                        error: 'Bạn đã nhập sai 5 lần. Vui lòng thử lại sau 30 phút.',
                        locked: true,
                        remainingTime: 30
                    };
                }
                return {
                    error: `Mã xác nhận không đúng. Còn ${result.attemptsLeft} lần thử.`,
                    attemptsLeft: result.attemptsLeft
                };
            }
            // Mark as verified and reset attempts
            entry.verified = true;
            resetOtpStore.set(normalizedEmail, entry);
            resetAttempts(attemptKey);
            console.log(`[RESET] OTP verified for ${normalizedEmail}`);
            return { success: true, verified: true, message: 'Mã xác nhận hợp lệ.' };
        }
        catch (error) {
            console.error('forgot-password verify-otp error:', error);
            reply.status(500);
            return { error: 'Không thể xác minh mã. Vui lòng thử lại.' };
        }
    });
    // ========== FORGOT PASSWORD - RESET PASSWORD ==========
    server.post('/api/auth/forgot-password/reset', async (request, reply) => {
        try {
            const parsed = resetPasswordSchema.safeParse(request.body);
            if (!parsed.success) {
                reply.status(422);
                return { error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ' };
            }
            const { email, password } = parsed.data;
            const normalizedEmail = email.toLowerCase();
            // Check OTP was verified
            const entry = resetOtpStore.get(normalizedEmail);
            if (!entry || !entry.verified) {
                reply.status(400);
                return { error: 'Vui lòng xác minh email trước khi đặt lại mật khẩu.' };
            }
            if (Date.now() > entry.expiresAt) {
                resetOtpStore.delete(normalizedEmail);
                reply.status(400);
                return { error: 'Phiên đã hết hạn. Vui lòng bắt đầu lại.' };
            }
            // Update password
            const hashed = await (0, password_1.hashPassword)(password);
            await server.prisma.user.update({
                where: { email: normalizedEmail },
                data: { hash_password: hashed },
            });
            // Clean up
            resetOtpStore.delete(normalizedEmail);
            console.log(`[RESET] Password updated for ${normalizedEmail}`);
            return { success: true, message: 'Mật khẩu đã được đặt lại thành công!' };
        }
        catch (error) {
            console.error('forgot-password reset error:', error);
            reply.status(500);
            return { error: 'Không thể đặt lại mật khẩu. Vui lòng thử lại.' };
        }
    });
}
