import { createApiHandler, ApiError } from '@/lib/api/handler';
import { users, auditLog } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export const DELETE = createApiHandler({
  requireAuth: true,
  roles: ['ADMIN'],
  handler: async ({ params, session, tx }) => {
    if (!session) {
      throw new ApiError(401, 'UNAUTHENTICATED', 'Authentication required');
    }

    const rawId = params?.studentId;
    const studentId = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!studentId) {
      throw new ApiError(400, 'INVALID_INPUT', 'Student ID is required');
    }

    // Find candidate user
    const userRows = await tx
      .select()
      .from(users)
      .where(and(eq(users.id, studentId), eq(users.role, 'STUDENT')));

    const targetStudent = userRows[0];
    if (!targetStudent) {
      throw new ApiError(404, 'STUDENT_NOT_FOUND', 'DMT Candidate not found');
    }

    // Delete student user record (Cascades to studentProfile, courses, requests, scores, notifications)
    await tx.delete(users).where(eq(users.id, studentId));

    // Log deletion in audit log
    await tx.insert(auditLog).values({
      actorId: session.userId,
      entity: 'user',
      entityId: studentId,
      action: 'DELETE_STUDENT',
      before: {
        id: targetStudent.id,
        name: `${targetStudent.firstName} ${targetStudent.lastName}`,
        email: targetStudent.email,
      },
    });

    return {
      success: true,
      message: `Candidate ${targetStudent.firstName} ${targetStudent.lastName} was deleted successfully.`,
    };
  },
});
