import { createApiHandler, ApiError } from '@/lib/api/handler';
import { courses, users, studentProfiles } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCourseProgress, getCourseItems } from '@/lib/db/queries/courses';

export const GET = createApiHandler({
  requireAuth: true,
  handler: async ({ session, tx }) => {
    if (!session) throw new ApiError(401, 'UNAUTHENTICATED', 'Authentication required');

    // Find active course for student
    const courseRows = await tx
      .select()
      .from(courses)
      .where(and(eq(courses.studentId, session.userId), eq(courses.status, 'ACTIVE')));

    const course = courseRows[0];
    if (!course) {
      throw new ApiError(404, 'COURSE_NOT_FOUND', 'No active course found for this student');
    }

    const { progress } = await getCourseProgress(course.id, tx);
    const items = await getCourseItems(course.id, tx);

    // Fetch assigned mentor instructor
    const profileRows = await tx
      .select({
        instructorId: studentProfiles.instructorId,
      })
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, session.userId));

    let mentor = null;
    if (profileRows[0]?.instructorId) {
      const instRows = await tx
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          padiNumber: users.padiNumber,
        })
        .from(users)
        .where(eq(users.id, profileRows[0].instructorId));
      mentor = instRows[0] || null;
    }

    return {
      courseId: course.id,
      progress,
      mentor,
      sections: items,
    };
  },
});
