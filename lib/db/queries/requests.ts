import { db } from '../index';
import {
  signoffRequests,
  signoffScores,
  signatures,
  courses,
  users,
  requirementItems,
  scoreSheetLines,
  notifications,
  auditLog,
  diveCenters,
} from '../schema';
import { eq, and, inArray, count, sql, desc, asc } from 'drizzle-orm';
import { ApiError } from '@/lib/api/handler';

export interface CreateRequestInput {
  itemId: number;
  performedAt: string | Date;
  performedTz?: string;
  instructorId: string;
  studentNote?: string;
}

export interface ApproveRequestInput {
  signature: string; // base64 PNG data URI
  comment?: string;
  score?: number;
  lineScores?: { lineId: number; score: number }[];
  exam?: {
    part1?: number;
    part2?: number;
    diveTheoryOnline?: boolean;
  };
  satisfiedBy?: 'PERFORMANCE' | 'VERIFICATION' | 'SPECIALTY_CERT' | 'ONLINE_COURSE';
}

export interface RequestFilterOptions {
  status?: string;
  studentId?: string;
  instructorId?: string;
  mine?: boolean;
}

export async function createSignoffRequest(
  studentId: string,
  diveCenterId: string,
  input: CreateRequestInput,
  txClient?: any
) {
  const tx = txClient || db;

  // 1. Check performedAt date
  const performedAtDate = new Date(input.performedAt);
  if (isNaN(performedAtDate.getTime())) {
    throw new ApiError(400, 'INVALID_DATE', 'Invalid performed date');
  }
  if (performedAtDate > new Date()) {
    throw new ApiError(400, 'INVALID_DATE', 'Performed date cannot be in the future');
  }

  // 2. Find active course for student
  const courseRows = await tx
    .select()
    .from(courses)
    .where(and(eq(courses.studentId, studentId), eq(courses.status, 'ACTIVE')));

  const course = courseRows[0];
  if (!course) {
    throw new ApiError(404, 'COURSE_NOT_FOUND', 'Active course not found for student');
  }

  // 3. Find target item
  const itemRows = await tx
    .select()
    .from(requirementItems)
    .where(and(eq(requirementItems.id, input.itemId), eq(requirementItems.isActive, true)));

  const item = itemRows[0];
  if (!item) {
    throw new ApiError(404, 'ITEM_NOT_FOUND', 'Requirement item not found or inactive');
  }

  // 4. Check target instructor
  const instructorRows = await tx
    .select()
    .from(users)
    .where(
      and(
        eq(users.id, input.instructorId),
        eq(users.diveCenterId, diveCenterId),
        eq(users.isActive, true),
        inArray(users.role, ['INSTRUCTOR', 'ADMIN'])
      )
    );

  const instructor = instructorRows[0];
  if (!instructor) {
    throw new ApiError(400, 'INVALID_INSTRUCTOR', 'Selected instructor is not active at your dive center');
  }

  // 5. Calculate attempt number and check open requests
  const existingRequests = await tx
    .select()
    .from(signoffRequests)
    .where(and(eq(signoffRequests.courseId, course.id), eq(signoffRequests.itemId, item.id)));

  const approvedCount = existingRequests.filter((r: any) => r.status === 'APPROVED').length;
  const pendingCount = existingRequests.filter((r: any) => r.status === 'PENDING' || r.status === 'DRAFT').length;

  if (pendingCount > 0) {
    throw new ApiError(400, 'OPEN_REQUEST_EXISTS', 'An open request for this requirement is already pending review');
  }

  const attemptNumber = approvedCount + 1;
  if (attemptNumber > item.requiredCount) {
    throw new ApiError(400, 'REQUIRED_COUNT_EXCEEDED', 'Requirement has already satisfied all required completions');
  }

  // 6. Insert sign-off request
  const newRequests = await tx
    .insert(signoffRequests)
    .values({
      courseId: course.id,
      itemId: item.id,
      attemptNumber,
      status: 'PENDING',
      performedAt: performedAtDate,
      performedTz: input.performedTz || 'UTC',
      studentNote: input.studentNote || null,
      instructorId: instructor.id,
    })
    .returning();

  const newRequest = newRequests[0];

  // 7. Get student name for notification
  const studentUserRows = await tx.select().from(users).where(eq(users.id, studentId));
  const studentUser = studentUserRows[0];

  // 8. Create notification for target instructor
  await tx.insert(notifications).values({
    userId: instructor.id,
    type: 'REQUEST_SUBMITTED',
    requestId: newRequest.id,
    body: `Student ${studentUser.firstName} ${studentUser.lastName} submitted a request for ${item.title}`,
  });

  return newRequest;
}

export async function getSignoffRequests(
  sessionUserId: string,
  diveCenterId: string,
  userRole: string,
  filters: RequestFilterOptions,
  txClient?: any
) {
  const tx = txClient || db;

  let query = tx
    .select({
      request: signoffRequests,
      item: requirementItems,
      student: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      },
    })
    .from(signoffRequests)
    .innerJoin(courses, eq(signoffRequests.courseId, courses.id))
    .innerJoin(users, eq(courses.studentId, users.id))
    .innerJoin(requirementItems, eq(signoffRequests.itemId, requirementItems.id))
    .where(eq(courses.diveCenterId, diveCenterId));

  const conditions: any[] = [eq(courses.diveCenterId, diveCenterId)];

  if (filters.status) {
    conditions.push(eq(signoffRequests.status, filters.status as any));
  }

  if (filters.studentId) {
    conditions.push(eq(courses.studentId, filters.studentId));
  }

  if (filters.instructorId) {
    conditions.push(eq(signoffRequests.instructorId, filters.instructorId));
  }

  if (filters.mine) {
    if (userRole === 'STUDENT') {
      conditions.push(eq(courses.studentId, sessionUserId));
    } else {
      conditions.push(eq(signoffRequests.instructorId, sessionUserId));
    }
  }

  return await query
    .where(and(...conditions))
    .orderBy(desc(signoffRequests.submittedAt));
}

export async function getSignoffRequestById(requestId: string, txClient?: any) {
  const tx = txClient || db;

  const rows = await tx
    .select({
      request: signoffRequests,
      item: requirementItems,
      course: courses,
      student: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      },
    })
    .from(signoffRequests)
    .innerJoin(courses, eq(signoffRequests.courseId, courses.id))
    .innerJoin(users, eq(courses.studentId, users.id))
    .innerJoin(requirementItems, eq(signoffRequests.itemId, requirementItems.id))
    .where(eq(signoffRequests.id, requestId));

  if (rows.length === 0) return null;

  const row = rows[0];

  // Fetch score sheet line scores if applicable
  const lineScores = await tx
    .select({
      id: signoffScores.id,
      lineId: signoffScores.lineId,
      score: signoffScores.score,
      lineNumber: scoreSheetLines.lineNumber,
      label: scoreSheetLines.label,
    })
    .from(signoffScores)
    .innerJoin(scoreSheetLines, eq(signoffScores.lineId, scoreSheetLines.id))
    .where(eq(signoffScores.requestId, requestId));

  return {
    ...row,
    lineScores,
  };
}

export async function approveSignoffRequest(
  requestId: string,
  instructorId: string,
  diveCenterId: string,
  input: ApproveRequestInput,
  txClient?: any
) {
  const tx = txClient || db;

  // 1. Query request & course info
  const reqDetails = await getSignoffRequestById(requestId, tx);
  if (!reqDetails) {
    throw new ApiError(404, 'REQUEST_NOT_FOUND', 'Request not found');
  }

  const { request, course, item, student } = reqDetails;

  if (course.diveCenterId !== diveCenterId) {
    throw new ApiError(403, 'FORBIDDEN', 'Cannot approve request for a student outside your dive center');
  }

  if (request.status !== 'PENDING') {
    throw new ApiError(400, 'INVALID_STATUS', 'Only PENDING requests can be approved');
  }

  // 2. Query instructor profile for immutable snapshot
  const instructorRows = await tx.select().from(users).where(eq(users.id, instructorId));
  const instructor = instructorRows[0];
  if (!instructor || !instructor.isActive) {
    throw new ApiError(400, 'INVALID_INSTRUCTOR', 'Instructor not found or inactive');
  }

  const nameSnapshot = `${instructor.firstName} ${instructor.lastName}`.trim();
  const padiSnapshot = instructor.padiNumber || 'N/A';

  // 3. Process and save drawn signature PNG
  let base64Data = input.signature;
  if (base64Data.includes(',')) {
    base64Data = base64Data.split(',')[1];
  }
  const imageBuffer = Buffer.from(base64Data, 'base64');

  const sigRes = await tx
    .insert(signatures)
    .values({
      signerId: instructor.id,
      imageData: imageBuffer,
      mimeType: 'image/png',
    })
    .returning();
  const signatureId = sigRes[0].id;

  // 4. Update request status to APPROVED with instructor snapshots
  const decidedAt = new Date();
  await tx
    .update(signoffRequests)
    .set({
      status: 'APPROVED',
      decidedAt,
      instructorNameSnapshot: nameSnapshot,
      instructorPadiSnapshot: padiSnapshot,
      instructorComment: input.comment || null,
      signatureId,
      score: input.score || null,
      satisfiedBy: input.satisfiedBy || null,
      examPart1Score: input.exam?.part1 !== undefined ? String(input.exam.part1) : null,
      examPart2Score: input.exam?.part2 !== undefined ? String(input.exam.part2) : null,
      diveTheoryOnline: input.exam?.diveTheoryOnline || false,
    })
    .where(eq(signoffRequests.id, requestId));

  // 5. If SCORE_SHEET item, store individual line scores
  if (item.scoring === 'SCORE_SHEET' && input.lineScores) {
    for (const ls of input.lineScores) {
      await tx.insert(signoffScores).values({
        requestId: request.id,
        lineId: ls.lineId,
        score: ls.score,
      });
    }
  }

  // 6. Write Audit Log
  await tx.insert(auditLog).values({
    actorId: instructor.id,
    entity: 'signoff_requests',
    entityId: request.id,
    action: 'APPROVE',
    before: { status: 'PENDING' },
    after: {
      status: 'APPROVED',
      decidedAt,
      instructorNameSnapshot: nameSnapshot,
      instructorPadiSnapshot: padiSnapshot,
    },
  });

  // 7. Send in-app Notification to student
  await tx.insert(notifications).values({
    userId: student.id,
    type: 'REQUEST_APPROVED',
    requestId: request.id,
    body: `Your request for ${item.title} (Attempt ${request.attemptNumber}) was approved by ${nameSnapshot}`,
  });

  return { success: true };
}

export async function rejectSignoffRequest(
  requestId: string,
  instructorId: string,
  diveCenterId: string,
  rejectionReason: string,
  txClient?: any
) {
  const tx = txClient || db;

  if (!rejectionReason || rejectionReason.trim().length === 0) {
    throw new ApiError(400, 'REASON_REQUIRED', 'A rejection reason is required');
  }

  const reqDetails = await getSignoffRequestById(requestId, tx);
  if (!reqDetails) {
    throw new ApiError(404, 'REQUEST_NOT_FOUND', 'Request not found');
  }

  const { request, course, item, student } = reqDetails;

  if (course.diveCenterId !== diveCenterId) {
    throw new ApiError(403, 'FORBIDDEN', 'Cannot reject request outside your dive center');
  }

  if (request.status !== 'PENDING') {
    throw new ApiError(400, 'INVALID_STATUS', 'Only PENDING requests can be rejected');
  }

  const decidedAt = new Date();
  await tx
    .update(signoffRequests)
    .set({
      status: 'REJECTED',
      decidedAt,
      rejectionReason: rejectionReason.trim(),
    })
    .where(eq(signoffRequests.id, requestId));

  await tx.insert(auditLog).values({
    actorId: instructorId,
    entity: 'signoff_requests',
    entityId: request.id,
    action: 'REJECT',
    before: { status: 'PENDING' },
    after: { status: 'REJECTED', rejectionReason: rejectionReason.trim() },
  });

  await tx.insert(notifications).values({
    userId: student.id,
    type: 'REQUEST_REJECTED',
    requestId: request.id,
    body: `Your request for ${item.title} was rejected: ${rejectionReason.trim()}`,
  });

  return { success: true };
}

export interface UpdateRequestInput {
  instructorId?: string;
  performedAt?: string | Date;
  studentNote?: string;
}

export async function updateSignoffRequest(
  requestId: string,
  studentId: string,
  diveCenterId: string,
  input: UpdateRequestInput,
  txClient?: any
) {
  const tx = txClient || db;

  const reqDetails = await getSignoffRequestById(requestId, tx);
  if (!reqDetails) {
    throw new ApiError(404, 'REQUEST_NOT_FOUND', 'Request not found');
  }

  const { request, student } = reqDetails;

  if (student.id !== studentId) {
    throw new ApiError(403, 'FORBIDDEN', 'You can only edit your own requests');
  }

  if (request.status !== 'PENDING' && request.status !== 'DRAFT') {
    throw new ApiError(400, 'INVALID_STATUS', 'Only PENDING or DRAFT requests can be edited');
  }

  const updateData: any = {};

  if (input.instructorId) {
    const instructorRows = await tx
      .select()
      .from(users)
      .where(
        and(
          eq(users.id, input.instructorId),
          eq(users.diveCenterId, diveCenterId),
          eq(users.isActive, true),
          inArray(users.role, ['INSTRUCTOR', 'ADMIN'])
        )
      );
    if (instructorRows.length === 0) {
      throw new ApiError(400, 'INVALID_INSTRUCTOR', 'Selected instructor is not active at your dive center');
    }
    updateData.instructorId = input.instructorId;
  }

  if (input.performedAt) {
    const performedAtDate = new Date(input.performedAt);
    if (isNaN(performedAtDate.getTime())) {
      throw new ApiError(400, 'INVALID_DATE', 'Invalid performed date');
    }
    if (performedAtDate > new Date()) {
      throw new ApiError(400, 'INVALID_DATE', 'Performed date cannot be in the future');
    }
    updateData.performedAt = performedAtDate;
  }

  if (input.studentNote !== undefined) {
    updateData.studentNote = input.studentNote;
  }

  await tx
    .update(signoffRequests)
    .set(updateData)
    .where(eq(signoffRequests.id, requestId));

  return { success: true };
}

export async function withdrawSignoffRequest(
  requestId: string,
  studentId: string,
  txClient?: any
) {
  const tx = txClient || db;

  const reqDetails = await getSignoffRequestById(requestId, tx);
  if (!reqDetails) {
    throw new ApiError(404, 'REQUEST_NOT_FOUND', 'Request not found');
  }

  const { request, student } = reqDetails;

  if (student.id !== studentId) {
    throw new ApiError(403, 'FORBIDDEN', 'You can only withdraw your own requests');
  }

  if (request.status !== 'PENDING' && request.status !== 'DRAFT') {
    throw new ApiError(400, 'INVALID_STATUS', 'Only PENDING or DRAFT requests can be withdrawn');
  }

  await tx.delete(signoffRequests).where(eq(signoffRequests.id, requestId));

  return { success: true };
}

export async function voidSignoffRequest(
  requestId: string,
  adminId: string,
  diveCenterId: string,
  voidReason: string,
  txClient?: any
) {
  const tx = txClient || db;

  if (!voidReason || voidReason.trim().length === 0) {
    throw new ApiError(400, 'REASON_REQUIRED', 'A void reason is required');
  }

  const reqDetails = await getSignoffRequestById(requestId, tx);
  if (!reqDetails) {
    throw new ApiError(404, 'REQUEST_NOT_FOUND', 'Request not found');
  }

  const { request, course, item, student } = reqDetails;

  if (course.diveCenterId !== diveCenterId) {
    throw new ApiError(403, 'FORBIDDEN', 'Cannot void request outside your dive center');
  }

  const oldStatus = request.status;
  const decidedAt = new Date();

  await tx
    .update(signoffRequests)
    .set({
      status: 'VOIDED',
      voidReason: voidReason.trim(),
      decidedAt,
    })
    .where(eq(signoffRequests.id, requestId));

  await tx.insert(auditLog).values({
    actorId: adminId,
    entity: 'signoff_requests',
    entityId: request.id,
    action: 'VOID',
    before: { status: oldStatus },
    after: { status: 'VOIDED', voidReason: voidReason.trim() },
  });

  await tx.insert(notifications).values({
    userId: student.id,
    type: 'REQUEST_VOIDED',
    requestId: request.id,
    body: `Your sign-off for ${item.title} was voided by Admin: ${voidReason.trim()}`,
  });

  return { success: true };
}

