import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const SESSION_COOKIE_NAME = 'session';

const getSecretKey = () => {
  const secret = process.env.JWT_SECRET || 'fallback-secret-key-change-me-in-production';
  return new TextEncoder().encode(secret);
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow static files, Next.js internals, and public auth endpoints
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname === '/favicon.ico' ||
    pathname === '/api/auth/login' ||
    pathname === '/api/auth/signup'
  ) {
    return NextResponse.next();
  }

  // Get session token from cookie
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  let sessionPayload: any = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, getSecretKey());
      sessionPayload = payload;
    } catch {
      sessionPayload = null;
    }
  }

  // Unauthenticated users trying to access protected pages
  if (!sessionPayload && pathname !== '/login' && pathname !== '/signup') {
    const loginUrl = new URL('/login', req.url);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated users trying to access /login, /signup, or /
  if (sessionPayload && (pathname === '/login' || pathname === '/signup' || pathname === '/')) {
    const targetPath =
      sessionPayload.role === 'ADMIN'
        ? '/admin'
        : sessionPayload.role === 'INSTRUCTOR'
        ? '/instructor'
        : '/dashboard';
    return NextResponse.redirect(new URL(targetPath, req.url));
  }

  // Role-based protection for specific route prefixes
  if (sessionPayload) {
    if (pathname.startsWith('/instructors') || pathname.startsWith('/reports')) {
      if (sessionPayload.role !== 'ADMIN' && sessionPayload.role !== 'INSTRUCTOR') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
      return NextResponse.next();
    }

    if (pathname.startsWith('/admin') && sessionPayload.role !== 'ADMIN') {
      const fallback = sessionPayload.role === 'INSTRUCTOR' ? '/instructor' : '/dashboard';
      return NextResponse.redirect(new URL(fallback, req.url));
    }

    if (pathname.startsWith('/instructor') && sessionPayload.role !== 'INSTRUCTOR') {
      const fallback = sessionPayload.role === 'ADMIN' ? '/admin' : '/dashboard';
      return NextResponse.redirect(new URL(fallback, req.url));
    }

    if (pathname.startsWith('/dashboard') && sessionPayload.role !== 'STUDENT') {
      const fallback = sessionPayload.role === 'ADMIN' ? '/admin' : '/instructor';
      return NextResponse.redirect(new URL(fallback, req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api/auth/login|api/auth/signup|_next/static|_next/image|favicon.ico).*)'],
};
