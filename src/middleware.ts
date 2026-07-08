import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken, TokenPayload } from './lib/auth-helper';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  console.log('Middleware triggered for pathname:', pathname); // Debugging
  
  // Daftar path publik yang boleh diakses tanpa token sesi
  const publicPaths = [
    '/login',
    '/display-qr',
    '/manifest.json',
    '/service-worker.js',
    '/api/auth/login',
    '/api/attendance/live-stream',
    '/api/attendance/auto-alpha',
    '/api/cron/wa-digest'
  ];

  const isPublic = publicPaths.some(path => pathname === path);
  if (isPublic) {
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
