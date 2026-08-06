import { createApiHandler, ApiError } from '@/lib/api/handler';
import { users, auditLog } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export const POST = createApiHandler({
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

    // Find soft-deleted candidate user
    const userRows = await tx
      .select()
      .from(users)
      .where(and(eq(users.id, studentId), eq(users.role, 'STUDENT')));

    const targetStudent = userRows[0];
    if (!targetStudent) {
      throw new ApiError(404, 'STUDENT_NOT_FOUND', 'DMT Candidate not found');
    }

    // Restore student (mark isActive = true)
    await tx
      .update(users)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(users.id, studentId));

    // Log restore action in audit log
    await tx.insert(auditLog).values({
      actorId: session.userId,
      entity: 'user',
      entityId: studentId,
      action: 'RESTORE_STUDENT',
      before: {
        id: targetStudent.id,
        name: `${targetStudent.firstName} ${targetStudent.lastName}`,
        email: targetStudent.email,
        isActive: false,
      },
      after: {
        id: targetStudent.id,
        isActive: true,
      },
    });

    return {
      success: true,
      message: `Candidate ${targetStudent.firstName} ${targetStudent.lastName} has been restored successfully.`,
    };
  },
});
