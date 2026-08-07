import { createApiHandler, ApiError } from '@/lib/api/handler';
import { courses, signoffRequests } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { z } from 'zod';

const ackSchema = z.object({
  requestIds: z.array(z.string().uuid()).min(1),
});

export const POST = createApiHandler({
  requireAuth: true,
  roles: ['STUDENT'],
  schema: ackSchema,
  handler: async ({ session, input, tx }) => {
    if (!session) throw new ApiError(401, 'UNAUTHENTICATED', 'Authentication required');

    // Fetch active course for calling student
    const courseRows = await tx
      .select()
      .from(courses)
      .where(and(eq(courses.studentId, session.userId), eq(courses.status, 'ACTIVE')));

    const course = courseRows[0];
    if (!course) {
      return { success: true, acknowledgedCount: 0 };
    }

    // Stamp celebrated_at = NOW() on specified requestIds owned by this student's course
    const updated = await tx
      .update(signoffRequests)
      .set({ celebratedAt: new Date() })
      .where(
        and(
          eq(signoffRequests.courseId, course.id),
          inArray(signoffRequests.id, input.requestIds)
        )
      )
      .returning();

    return {
      success: true,
      acknowledgedCount: updated.length,
    };
  },
});
