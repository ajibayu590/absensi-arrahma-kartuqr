import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken, TokenPayload } from './lib/auth-helper';

// Daftar path yang dilindungi dan memerlukan otentikasi
const protectedPaths = [
  '/student',
  '/dashboard',
  '/dashboard/(.*)',
  '/api/attendance/(.*)',
  '/api/admin/(.*)',
  '/api/settings/(.*)',
  '/api/reports/(.*)',
  '/api/student/(.*)',
  '/api/token-qr', // Token QR hanya bisa diambil oleh siswa yang login
  '/api/picket-schedules/today' // Guru piket today juga butuh auth
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Cek apakah path saat ini adalah path yang dilindungi
  const isProtected = protectedPaths.some(path => {
    if (path.endsWith('(.*)')) {
      const base = path.slice(0, -4); // Remove (.*)
      return pathname.startsWith(base);
    }
    return pathname === path;
  });

  if (!isProtected) {
    return NextResponse.next();
  }

  const token = req.cookies.get('token')?.value;
  let payload: TokenPayload | null = null;

  if (token) {
    payload = verifyToken(token);
  }

  // Jika tidak ada token atau token tidak valid, redirect ke halaman login
  if (!payload) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Jika token valid, tambahkan payload ke header request agar bisa diakses di API Routes/pages
  const response = NextResponse.next();
  response.headers.set('x-user-payload', JSON.stringify(payload));
  return response;
}

// Konfigurasi matcher untuk middleware
export const config = {
  matcher: [
    /*
     * Match semua request path kecuali:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets (.png, .webp, dll)
     * - /login (halaman login)
     * - /display-qr (display QR publik)
     * - /api/cron-alpha (sudah ada proteksi X-Scheduler-Secret)
     * - /api/attendance/live-stream (SSE stream for public display after initial auth)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.webp|.*\\.svg|.*\\.gif|login|display-qr|api/cron-alpha|api/attendance/live-stream).*)',
  ],
};
