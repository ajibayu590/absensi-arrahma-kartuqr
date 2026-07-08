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
  console.log('Middleware triggered for pathname:', pathname); // Debugging
  
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
    if (payload) {
      console.log('Middleware: Token verified, Payload:', payload); // Debugging
    } else {
      console.log('Middleware: Token invalid or expired.'); // Debugging
    }
  } else {
    console.log('Middleware: No token found in cookies.'); // Debugging
  }

  // Jika tidak ada token atau token tidak valid, redirect ke halaman login
  if (!payload) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Jika token valid, tambahkan payload ke header request agar bisa diakses di API Routes/pages
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-user-payload', JSON.stringify(payload));
  
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  return response;
}

// Konfigurasi matcher untuk middleware
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.webp|.*\\.svg|.*\\.gif|login|display-qr|api/cron-alpha|api/attendance/live-stream).*)',
  ],
};
