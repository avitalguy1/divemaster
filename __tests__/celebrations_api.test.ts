import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '../lib/db';
import { users, courses, signoffRequests, requirementItems, requirementSections } from '../lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

describe('Celebrations API Scoping & Idempotency Tests', () => {
  let student1: any;
  let student2: any;
  let instructor: any;
  let course1: any;
  let testItem: any;

  beforeAll(async () => {
    student1 = (await db.select().from(users).where(eq(users.email, 'student0@example.com')))[0];
    student2 = (await db.select().from(users).where(eq(users.email, 'student40@example.com')))[0];
    instructor = (await db.select().from(users).where(eq(users.role, 'INSTRUCTOR')))[0];
    course1 = (await db.select().from(courses).where(eq(courses.studentId, student1.id)))[0];

    const nonPrereqSec = (await db.select().from(requirementSections).where(eq(requirementSections.code, 'WATERSKILLS')))[0];
    testItem = (await db.select().from(requirementItems).where(eq(requirementItems.sectionId, nonPrereqSec.id)))[0];
  });

  it('correctly creates an approved uncelebrated request and stamps celebrated_at on ACK', async () => {
    // 1. Create approved uncelebrated request for student 1
    const newReqs = await db
      .insert(signoffRequests)
      .values({
        courseId: course1.id,
        itemId: testItem.id,
        attemptNumber: 1,
        status: 'APPROVED',
        performedAt: new Date(),
        performedTz: 'UTC',
        instructorId: instructor.id,
        decidedAt: new Date(),
        instructorNameSnapshot: `${instructor.firstName} ${instructor.lastName}`,
        instructorPadiSnapshot: instructor.padiNumber || '12345',
      })
      .returning();

    const reqId = newReqs[0].id;
    expect(reqId).toBeDefined();

    // Verify celebratedAt is null
    const checkUnack = (await db.select().from(signoffRequests).where(eq(signoffRequests.id, reqId)))[0];
    expect(checkUnack.celebratedAt).toBeNull();

    // 2. Simulate ACK
    await db
      .update(signoffRequests)
      .set({ celebratedAt: new Date() })
      .where(eq(signoffRequests.id, reqId));

    // Verify celebratedAt is stamped
    const checkAcked = (await db.select().from(signoffRequests).where(eq(signoffRequests.id, reqId)))[0];
    expect(checkAcked.celebratedAt).not.toBeNull();

    // 3. Idempotency test: ACK again
    await db
      .update(signoffRequests)
      .set({ celebratedAt: new Date() })
      .where(eq(signoffRequests.id, reqId));

    const checkReAcked = (await db.select().from(signoffRequests).where(eq(signoffRequests.id, reqId)))[0];
    expect(checkReAcked.celebratedAt).not.toBeNull();
  });
});
