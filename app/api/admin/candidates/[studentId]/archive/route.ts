import { createApiHandler, ApiError } from '@/lib/api/handler';
import { users, courses, auditLog } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const archiveSchema = z.object({
  isArchived: z.boolean().default(true),
});

export const POST = createApiHandler({
  requireAuth: true,
  roles: ['ADMIN'],
  schema: archiveSchema,
  handler: async ({ params, input, session, tx }) => {
    if (!session) {
      throw new ApiError(401, 'UNAUTHENTICATED', 'Authentication required');
    }

    const rawId = params?.studentId;
    const studentId = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!studentId) {
      throw new ApiError(400, 'INVALID_INPUT', 'Student ID is required');
    }

    // Find student user and active course
    const userRows = await tx
      .select()
      .from(users)
      .where(and(eq(users.id, studentId), eq(users.role, 'STUDENT')));

    const targetStudent = userRows[0];
    if (!targetStudent) {
      throw new ApiError(404, 'STUDENT_NOT_FOUND', 'DMT Candidate not found');
    }

    const courseRows = await tx
      .select()
      .from(courses)
      .where(eq(courses.studentId, studentId));

    const studentCourse = courseRows[0];
    if (!studentCourse) {
      throw new ApiError(404, 'COURSE_NOT_FOUND', 'Course record not found for student');
    }

    const shouldArchive = input?.isArchived !== false;

    // Update course isArchived status
    await tx
      .update(courses)
      .set({ isArchived: shouldArchive, updatedAt: new Date() })
      .where(eq(courses.id, studentCourse.id));

    // Log archive action in audit log
    await tx.insert(auditLog).values({
      actorId: session.userId,
      entity: 'course',
      entityId: studentCourse.id,
      action: shouldArchive ? 'ARCHIVE_STUDENT' : 'UNARCHIVE_STUDENT',
      before: {
        studentId: targetStudent.id,
        name: `${targetStudent.firstName} ${targetStudent.lastName}`,
        email: targetStudent.email,
        isArchived: studentCourse.isArchived,
      },
      after: {
        studentId: targetStudent.id,
        isArchived: shouldArchive,
      },
    });

    return {
      success: true,
      message: `Candidate ${targetStudent.firstName} ${targetStudent.lastName} has been ${
        shouldArchive ? 'archived' : 'unarchived'
      } successfully.`,
    };
  },
});
