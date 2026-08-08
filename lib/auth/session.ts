import { SignJWT, jwtVerify } from 'jose';
import { cookies, headers } from 'next/headers';
import { NextRequest } from 'next/server';

export interface UserSessionPayload {
  userId: string;
  diveCenterId: string;
  role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';
  email: string;
}

const getSecretKey = () => {
  const secret = process.env.JWT_SECRET || 'fallback-secret-key-change-me-in-production';
  return new TextEncoder().encode(secret);
};

export const SESSION_COOKIE_NAME = 'session';

export async function signAccessToken(payload: UserSessionPayload, expiresIn: string = '7d'): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSecretKey());
}

export async function signRefreshToken(payload: UserSessionPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecretKey());
}

export async function verifyToken(token: string): Promise<UserSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return {
      userId: payload.userId as string,
      diveCenterId: payload.diveCenterId as string,
      role: payload.role as 'STUDENT' | 'INSTRUCTOR' | 'ADMIN',
      email: payload.email as string,
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string): Promise<void> {
  try {
    const cookieStore = await cookies();
    let isHttps = false;
    try {
      const reqHeaders = await headers();
      const proto = reqHeaders.get('x-forwarded-proto');
      const referer = reqHeaders.get('referer');
      isHttps = proto === 'https' || (referer ? referer.startsWith('https://') : false) || process.env.COOKIE_SECURE === 'true';
    } catch {
      isHttps = process.env.COOKIE_SECURE === 'true';
    }

    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days session duration
    });
  } catch {
    // Safe fallback for execution outside Next.js request store (e.g. unit tests)
  }
}

export async function clearSessionCookie(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
  } catch {
    // Safe fallback for execution outside Next.js request store
  }
}

export async function getSessionFromRequest(req?: Request | NextRequest): Promise<UserSessionPayload | null> {
  let token: string | undefined;

  if (req) {
    if ('cookies' in req && typeof (req as NextRequest).cookies?.get === 'function') {
      token = (req as NextRequest).cookies.get(SESSION_COOKIE_NAME)?.value;
    }
    if (!token) {
      const cookieHeader = req.headers.get('cookie') || req.headers.get('Cookie');
      if (cookieHeader) {
        const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
        if (match) token = match[1];
      }
    }
  }

  if (!token) {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    } catch {
      token = undefined;
    }
  }

  if (!token) return null;
  return await verifyToken(token);
}
