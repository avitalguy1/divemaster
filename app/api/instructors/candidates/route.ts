import { createApiHandler, ApiError } from '@/lib/api/handler';
import { users, courses, signoffRequests, requirementItems, studentProfiles } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCourseProgress } from '@/lib/db/queries/courses';

export const GET = createApiHandler({
  requireAuth: true,
  roles: ['INSTRUCTOR', 'ADMIN'],
  handler: async ({ session, tx }) => {
    if (!session) throw new ApiError(401, 'UNAUTHENTICATED', 'Authentication required');

    // Fetch all students at dive center with their profiles
    const studentRows = await tx
      .select({
        user: users,
        profile: studentProfiles,
      })
      .from(users)
      .leftJoin(studentProfiles, eq(users.id, studentProfiles.userId))
      .where(and(eq(users.diveCenterId, session.diveCenterId), eq(users.role, 'STUDENT')));

    const candidatesList = [];

    for (const item of studentRows) {
      const student = item.user;
      const profile = item.profile;

      const studentCourseRows = await tx
        .select()
        .from(courses)
        .where(eq(courses.studentId, student.id));

      const studentCourse = studentCourseRows[0];
      if (!studentCourse) continue;

      const { progress } = await getCourseProgress(studentCourse.id, tx);

      // Query pending sign-off requests for this student.
      // Admins see all pending requests for the candidate; Instructors see requests assigned to them or candidate requests.
      const pendingConditions = [
        eq(signoffRequests.courseId, studentCourse.id),
        eq(signoffRequests.status, 'PENDING'),
      ];

      if (session.role === 'INSTRUCTOR') {
        pendingConditions.push(eq(signoffRequests.instructorId, session.userId));
      }

      const pendingRequests = await tx
        .select({
          request: signoffRequests,
          item: requirementItems,
        })
        .from(signoffRequests)
        .innerJoin(requirementItems, eq(signoffRequests.itemId, requirementItems.id))
        .where(and(...pendingConditions));

      // Fetch approved sign-off records for this student
      const approvedRequests = await tx
        .select({
          request: signoffRequests,
          item: requirementItems,
        })
        .from(signoffRequests)
        .innerJoin(requirementItems, eq(signoffRequests.itemId, requirementItems.id))
        .where(
          and(
            eq(signoffRequests.courseId, studentCourse.id),
            eq(signoffRequests.status, 'APPROVED')
          )
        );

      candidatesList.push({
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        email: student.email,
        country: profile?.country || 'N/A',
        courseId: studentCourse.id,
        isActive: student.isActive,
        isArchived: studentCourse.isArchived || false,
        approvedUnits: progress.approvedUnits,
        percentComplete: progress.percentComplete,
        status: progress.isComplete ? 'COMPLETE' : 'ACTIVE',
        pendingCount: pendingRequests.length,
        pendingRequests: pendingRequests.map((r: any) => ({
          requestId: r.request.id,
          itemId: r.item.id,
          title: r.item.title,
          scoring: r.item.scoring,
          requiredCount: r.item.requiredCount,
          performedAt: r.request.performedAt,
          studentNote: r.request.studentNote,
          attemptNumber: r.request.attemptNumber,
        })),
        approvedRequests: approvedRequests.map((r: any) => ({
          requestId: r.request.id,
          itemId: r.item.id,
          title: r.item.title,
          decidedAt: r.request.decidedAt || r.request.submittedAt,
          instructorNameSnapshot: r.request.instructorNameSnapshot || 'Instructor',
          attemptNumber: r.request.attemptNumber,
          score: r.request.score,
        })),
      });
    }

    return { candidates: candidatesList };
  },
});
