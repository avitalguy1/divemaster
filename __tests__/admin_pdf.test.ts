import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '../lib/db';
import { users, courses, signoffRequests, auditLog, diveCenters } from '../lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateEvaluationPdf } from '../lib/pdf/generator';
import { voidSignoffRequest } from '../lib/db/queries/requests';
import { getAuditLogs } from '../lib/db/queries/audit';
import { ApiError } from '../lib/api/handler';

describe('Admin, Void & PDF Export Unit Tests', () => {
  let adminUser: any;
  let instructorUser: any;
  let studentUser: any;
  let diveCenter: any;
  let candidateCourse: any;

  beforeAll(async () => {
    adminUser = (await db.select().from(users).where(eq(users.role, 'ADMIN')))[0];
    instructorUser = (await db.select().from(users).where(eq(users.role, 'INSTRUCTOR')))[0];
    studentUser = (await db.select().from(users).where(eq(users.email, 'student100@example.com')))[0];
    diveCenter = (await db.select().from(diveCenters))[0];
    candidateCourse = (await db.select().from(courses).where(eq(courses.studentId, studentUser.id)))[0];
  });

  it('should generate a valid PDF buffer starting with %PDF- header', async () => {
    const pdfBytes = await generateEvaluationPdf(candidateCourse.id);
    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(500);

    // Check %PDF- header magic bytes (0x25, 0x50, 0x44, 0x46, 0x2d)
    const header = String.fromCharCode(...pdfBytes.slice(0, 5));
    expect(header).toBe('%PDF-');
  });

  it('should reject voiding a sign-off without a reason', async () => {
    const approvedRows = await db
      .select()
      .from(signoffRequests)
      .where(and(eq(signoffRequests.courseId, candidateCourse.id), eq(signoffRequests.status, 'APPROVED')));

    const reqToVoid = approvedRows[0];
    expect(reqToVoid).toBeDefined();

    await expect(
      voidSignoffRequest(reqToVoid.id, adminUser.id, diveCenter.id, '')
    ).rejects.toThrow(ApiError);
  });

  it('should void a sign-off while preserving the original historical row and writing an audit log', async () => {
    const approvedRows = await db
      .select()
      .from(signoffRequests)
      .where(and(eq(signoffRequests.courseId, candidateCourse.id), eq(signoffRequests.status, 'APPROVED')));

    const reqToVoid = approvedRows[0];
    expect(reqToVoid).toBeDefined();

    const result = await voidSignoffRequest(
      reqToVoid.id,
      adminUser.id,
      diveCenter.id,
      'Administrative correction: duplicate sign-off entry'
    );

    expect(result.success).toBe(true);

    // Verify row still exists with status VOID and voidReason recorded
    const checkRow = (await db.select().from(signoffRequests).where(eq(signoffRequests.id, reqToVoid.id)))[0];
    expect(checkRow).toBeDefined();
    expect(checkRow.status).toBe('VOIDED');
    expect(checkRow.voidReason).toBe('Administrative correction: duplicate sign-off entry');

    // Restore status to APPROVED for downstream test data isolation
    await db
      .update(signoffRequests)
      .set({ status: 'APPROVED', voidReason: null })
      .where(eq(signoffRequests.id, reqToVoid.id));
  });

  it('should query timestamped audit log entries', async () => {
    const logs = await getAuditLogs();
    expect(logs.length).toBeGreaterThan(0);

    const voidLog = logs.find((l: any) => l.action === 'VOID');
    expect(voidLog).toBeDefined();
    expect(voidLog?.actor.role).toBe('ADMIN');
  });
});
