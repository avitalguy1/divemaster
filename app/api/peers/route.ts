import { createApiHandler, ApiError } from '@/lib/api/handler';
import { users, courses, studentProfiles } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCourseProgress } from '@/lib/db/queries/courses';

export const GET = createApiHandler({
  requireAuth: true,
  roles: ['STUDENT', 'INSTRUCTOR', 'ADMIN'],
  handler: async ({ session, tx }) => {
    if (!session) throw new ApiError(401, 'UNAUTHENTICATED', 'Authentication required');

    // Fetch all active student candidates at caller's dive center
    const studentRows = await tx
      .select({
        user: users,
        profile: studentProfiles,
      })
      .from(users)
      .leftJoin(studentProfiles, eq(users.id, studentProfiles.userId))
      .where(
        and(
          eq(users.diveCenterId, session.diveCenterId),
          eq(users.role, 'STUDENT'),
          eq(users.isActive, true)
        )
      );

    const peersList = [];

    for (const item of studentRows) {
      const student = item.user;
      const profile = item.profile;

      const studentCourseRows = await tx
        .select()
        .from(courses)
        .where(eq(courses.studentId, student.id));

      const studentCourse = studentCourseRows[0];
      let approvedUnits = 0;
      let percentComplete = 0;
      let isComplete = false;

      if (studentCourse) {
        const { progress } = await getCourseProgress(studentCourse.id, tx);
        approvedUnits = progress.approvedUnits;
        percentComplete = progress.percentComplete;
        isComplete = progress.isComplete;
      }

      peersList.push({
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        email: student.email,
        country: profile?.country || 'N/A',
        approvedUnits,
        percentComplete,
        status: isComplete ? 'COMPLETE' : 'ACTIVE',
        isSelf: student.id === session.userId,
      });
    }

    // Sort: current user first, then by percent complete descending
    peersList.sort((a, b) => {
      if (a.isSelf) return -1;
      if (b.isSelf) return 1;
      return b.percentComplete - a.percentComplete;
    });

    return { peers: peersList };
  },
});
