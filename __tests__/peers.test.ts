import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '../lib/db';
import { users } from '../lib/db/schema';
import { eq } from 'drizzle-orm';
import { GET as peersHandler } from '../app/api/peers/route';
import { signAccessToken } from '../lib/auth/session';
import { NextRequest } from 'next/server';

describe('My Peers API Endpoint Unit Tests', () => {
  let studentUser: any;
  let sessionToken: string;

  beforeAll(async () => {
    studentUser = (await db.select().from(users).where(eq(users.role, 'STUDENT')))[0];
    if (studentUser) {
      sessionToken = await signAccessToken({
        userId: studentUser.id,
        diveCenterId: studentUser.diveCenterId,
        role: 'STUDENT',
        email: studentUser.email || '',
      });
    }
  });

  it('should return 401 when calling GET /api/peers without auth cookie', async () => {
    const req = new NextRequest('http://localhost:3000/api/peers', { method: 'GET' });
    const res = await peersHandler(req);
    expect(res.status).toBe(401);
  });

  it('should return active DMT candidate peers when authenticated as a student', async () => {
    if (!studentUser) return;
    const req = new NextRequest('http://localhost:3000/api/peers', {
      method: 'GET',
      headers: {
        cookie: `session=${sessionToken}`,
      },
    });

    const res = await peersHandler(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.peers).toBeDefined();
    expect(Array.isArray(body.peers)).toBe(true);
    expect(body.peers.length).toBeGreaterThan(0);

    const selfPeer = body.peers.find((p: any) => p.isSelf);
    expect(selfPeer).toBeDefined();
    expect(selfPeer.studentId).toBe(studentUser.id);
    expect(selfPeer.approvedUnits).toBeDefined();
    expect(selfPeer.percentComplete).toBeDefined();
    expect(selfPeer.status).toBeDefined();
  });
});
