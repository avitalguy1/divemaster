import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '../lib/db';
import {
  users,
  courses,
  requirementItems,
  signoffRequests,
  auditLog,
  notifications,
  diveCenters,
} from '../lib/db/schema';
import { eq, and } from 'drizzle-orm';
import {
  createSignoffRequest,
  approveSignoffRequest,
  rejectSignoffRequest,
  withdrawSignoffRequest,
  updateSignoffRequest,
  getSignoffRequestById,
} from '../lib/db/queries/requests';
import { ApiError } from '../lib/api/handler';

describe('Sign-off Requests & Approval Domain Rules Test', () => {
  let studentUser: any;
  let instructorUser: any;
  let diveCenter: any;
  let testCourse: any;
  let testItemSingle: any; // requiredCount = 1
  let testItemMulti: any; // requiredCount = 2 (e.g. PA_SKILL3)

  const dummySignatureData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  beforeAll(async () => {
    // Query existing dev fixtures
    const dcs = await db.select().from(diveCenters);
    diveCenter = dcs[0];

    const studentRows = await db.select().from(users).where(eq(users.role, 'STUDENT'));
    studentUser = studentRows[0];

    const instructorRows = await db.select().from(users).where(eq(users.role, 'INSTRUCTOR'));
    instructorUser = instructorRows[0];

    const courseRows = await db.select().from(courses).where(eq(courses.studentId, studentUser.id));
    testCourse = courseRows[0];

    const singleRows = await db.select().from(requirementItems).where(eq(requirementItems.code, 'PRE_MEDICAL'));
    testItemSingle = singleRows[0];

    const multiRows = await db.select().from(requirementItems).where(eq(requirementItems.code, 'PA_SKILL3'));
    testItemMulti = multiRows[0];
  });

  it('should reject a request with a future performedAt timestamp', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);

    await expect(
      createSignoffRequest(studentUser.id, diveCenter.id, {
        itemId: testItemSingle.id,
        performedAt: futureDate,
        instructorId: instructorUser.id,
      })
    ).rejects.toThrow(ApiError);
  });

  it('should submit a request and calculate attempt_number correctly', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // Clear any previous test requests for testItemMulti
    await db
      .delete(signoffRequests)
      .where(and(eq(signoffRequests.courseId, testCourse.id), eq(signoffRequests.itemId, testItemMulti.id)));

    const req1 = await createSignoffRequest(studentUser.id, diveCenter.id, {
      itemId: testItemMulti.id,
      performedAt: yesterday,
      instructorId: instructorUser.id,
      studentNote: 'Completed Briefing Practice 1',
    });

    expect(req1.attemptNumber).toBe(1);
    expect(req1.status).toBe('PENDING');

    // Trying to open a second request while attempt 1 is PENDING should be rejected
    await expect(
      createSignoffRequest(studentUser.id, diveCenter.id, {
        itemId: testItemMulti.id,
        performedAt: yesterday,
        instructorId: instructorUser.id,
      })
    ).rejects.toThrow(ApiError);
  });

  it('should atomically approve a request, store signature, and snapshot instructor name & PADI number', async () => {
    // Find open PENDING request for testItemMulti
    const pendingRows = await db
      .select()
      .from(signoffRequests)
      .where(and(eq(signoffRequests.courseId, testCourse.id), eq(signoffRequests.itemId, testItemMulti.id)));

    const requestToApprove = pendingRows[0];
    expect(requestToApprove).toBeDefined();

    const originalInstructorName = `${instructorUser.firstName} ${instructorUser.lastName}`.trim();
    const originalPadiNumber = instructorUser.padiNumber;

    // Execute approval
    const result = await approveSignoffRequest(
      requestToApprove.id,
      instructorUser.id,
      diveCenter.id,
      {
        signature: dummySignatureData,
        comment: 'Great briefing structure!',
      }
    );

    expect(result.success).toBe(true);

    // Verify snapshot persistence
    const updatedReq = await getSignoffRequestById(requestToApprove.id);
    expect(updatedReq?.request.status).toBe('APPROVED');
    expect(updatedReq?.request.instructorNameSnapshot).toBe(originalInstructorName);
    expect(updatedReq?.request.instructorPadiSnapshot).toBe(originalPadiNumber);

    // Domain Rule Test: Renaming instructor profile DOES NOT affect the historic snapshot
    await db
      .update(users)
      .set({ firstName: 'RenamedFirst', lastName: 'RenamedLast' })
      .where(eq(users.id, instructorUser.id));

    const reCheckedReq = await getSignoffRequestById(requestToApprove.id);
    expect(reCheckedReq?.request.instructorNameSnapshot).toBe(originalInstructorName);

    // Revert instructor name
    await db
      .update(users)
      .set({ firstName: instructorUser.firstName, lastName: instructorUser.lastName })
      .where(eq(users.id, instructorUser.id));
  });

  it('should enforce immutable approved requests (rejecting subsequent approval/rejection attempts)', async () => {
    const approvedRows = await db
      .select()
      .from(signoffRequests)
      .where(and(eq(signoffRequests.courseId, testCourse.id), eq(signoffRequests.status, 'APPROVED')));

    const approvedReq = approvedRows[0];
    expect(approvedReq).toBeDefined();

    // Re-approving must fail
    await expect(
      approveSignoffRequest(approvedReq.id, instructorUser.id, diveCenter.id, {
        signature: dummySignatureData,
      })
    ).rejects.toThrow(ApiError);

    // Rejecting an approved request must fail
    await expect(
      rejectSignoffRequest(approvedReq.id, instructorUser.id, diveCenter.id, 'No longer valid')
    ).rejects.toThrow(ApiError);
  });

  it('should allow student to edit or reassign instructor for a pending request', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // Clear any existing request for testItemMulti first
    await db
      .delete(signoffRequests)
      .where(and(eq(signoffRequests.courseId, testCourse.id), eq(signoffRequests.itemId, testItemMulti.id)));

    const pendingReq = await createSignoffRequest(studentUser.id, diveCenter.id, {
      itemId: testItemMulti.id,
      performedAt: yesterday,
      instructorId: instructorUser.id,
      studentNote: 'Initial note',
    });

    const otherInstructors = await db
      .select()
      .from(users)
      .where(and(eq(users.diveCenterId, diveCenter.id), eq(users.role, 'INSTRUCTOR')));
    const secondInstructor = otherInstructors.find((i) => i.id !== instructorUser.id) || instructorUser;

    const updateRes = await updateSignoffRequest(pendingReq.id, studentUser.id, diveCenter.id, {
      instructorId: secondInstructor.id,
      studentNote: 'Updated note with correct instructor',
    });

    expect(updateRes.success).toBe(true);

    const updated = await getSignoffRequestById(pendingReq.id);
    expect(updated?.request.instructorId).toBe(secondInstructor.id);
    expect(updated?.request.studentNote).toBe('Updated note with correct instructor');
  });

  it('should allow student to withdraw a pending request', async () => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    await db
      .delete(signoffRequests)
      .where(and(eq(signoffRequests.courseId, testCourse.id), eq(signoffRequests.itemId, testItemMulti.id)));

    const reqToWithdraw = await createSignoffRequest(studentUser.id, diveCenter.id, {
      itemId: testItemMulti.id,
      performedAt: twoDaysAgo,
      instructorId: instructorUser.id,
    });

    const withdrawResult = await withdrawSignoffRequest(reqToWithdraw.id, studentUser.id);
    expect(withdrawResult.success).toBe(true);

    const check = await getSignoffRequestById(reqToWithdraw.id);
    expect(check).toBeNull();
  });
});
