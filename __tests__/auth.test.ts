import { describe, it, expect, beforeAll } from 'vitest';
import { hashPassword, verifyPassword } from '../lib/auth/password';
import { signAccessToken, verifyToken } from '../lib/auth/session';
import { POST as loginHandler } from '../app/api/auth/login/route';
import { POST as signupHandler } from '../app/api/auth/signup/route';
import { GET as meHandler } from '../app/api/auth/me/route';
import { createApiHandler, ApiError } from '../lib/api/handler';
import { NextRequest } from 'next/server';

describe('Authentication & Authorization Unit Tests', () => {
  describe('Password Hashing (argon2)', () => {
    it('should hash and verify passwords correctly', async () => {
      const plain = 'SecretPassword123!';
      const hash = await hashPassword(plain);
      
      expect(hash).toContain('$argon2');
      
      const isValid = await verifyPassword(plain, hash);
      expect(isValid).toBe(true);

      const isInvalid = await verifyPassword('WrongPassword', hash);
      expect(isInvalid).toBe(false);
    });
  });

  describe('JWT Session Tokens (jose)', () => {
    it('should sign and verify access tokens', async () => {
      const payload = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        diveCenterId: '123e4567-e89b-12d3-a456-426614174001',
        role: 'STUDENT' as const,
        email: 'student0@example.com',
      };

      const token = await signAccessToken(payload);
      expect(typeof token).toBe('string');

      const verified = await verifyToken(token);
      expect(verified).not.toBeNull();
      expect(verified?.userId).toBe(payload.userId);
      expect(verified?.role).toBe(payload.role);
    });

    it('should return null for tampered or invalid tokens', async () => {
      const verified = await verifyToken('invalid.jwt.token');
      expect(verified).toBeNull();
    });
  });

  describe('Login Route Handler (/api/auth/login)', () => {
    it('should login successfully with correct credentials', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'student0@example.com',
          password: 'Password123!',
        }),
      });

      const res = await loginHandler(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.user).toBeDefined();
      expect(json.user.email).toBe('student0@example.com');
    });

    it('should reject wrong password with 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'student0@example.com',
          password: 'IncorrectPassword',
        }),
      });

      const res = await loginHandler(req);
      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject unknown email with 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          password: 'Password123!',
        }),
      });

      const res = await loginHandler(req);
      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('DMT Registration Signup Route Handler (/api/auth/signup)', () => {
    it('should register a new DMT candidate and provision active course', async () => {
      const testEmail = `dmt.signup.${Date.now()}@example.com`;
      const req = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          firstName: 'New',
          lastName: 'Candidate',
          email: testEmail,
          password: 'Password123!',
        }),
      });

      const res = await signupHandler(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.user).toBeDefined();
      expect(json.user.email).toBe(testEmail);
      expect(json.user.role).toBe('STUDENT');
    });
  });

  describe('Role Guard Enforcement (403 Forbidden)', () => {
    it('should return 401 when calling a protected handler without session', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/me', {
        method: 'GET',
      });

      const res = await meHandler(req);
      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json.error.code).toBe('UNAUTHENTICATED');
    });

    it('should return 403 when user role is not authorized', async () => {
      const adminOnlyHandler = createApiHandler({
        requireAuth: true,
        roles: ['ADMIN'],
        handler: async () => ({ secretData: 42 }),
      });

      // Mock session as STUDENT
      const studentSessionToken = await signAccessToken({
        userId: '123e4567-e89b-12d3-a456-426614174000',
        diveCenterId: '123e4567-e89b-12d3-a456-426614174001',
        role: 'STUDENT',
        email: 'student0@example.com',
      });

      const req = new NextRequest('http://localhost:3000/api/admin/secret', {
        method: 'GET',
        headers: {
          cookie: `session=${studentSessionToken}`,
        },
      });

      const res = await adminOnlyHandler(req);
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.error.code).toBe('FORBIDDEN');
    });
  });
});
