import { createApiHandler, ApiError } from '@/lib/api/handler';
import { users, courses, studentProfiles, signoffRequests } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCourseProgress } from '@/lib/db/queries/courses';
import { getFullCatalog } from '@/lib/db/queries/catalog';

export const GET = createApiHandler({
  requireAuth: true,
  roles: ['INSTRUCTOR', 'ADMIN'],
  handler: async ({ session, req, tx }) => {
    if (!session) throw new ApiError(401, 'UNAUTHENTICATED', 'Authentication required');

    // Fetch full catalog for skill selector
    const catalog = await getFullCatalog(tx);

    // Flatten all active requirement items with section title
    const allSkills = catalog.flatMap((sec: any) =>
      (sec.items || []).map((item: any) => ({
        id: item.id,
        sectionId: sec.id,
        sectionCode: sec.code,
        sectionTitle: sec.title,
        code: item.code,
        title: item.title,
        scoring: item.scoring,
        requiredCount: item.requiredCount,
      }))
    );

    // Fetch active candidates at this dive center
    const studentRows = await tx
      .select({
        user: users,
        profile: studentProfiles,
      })
      .from(users)
      .leftJoin(studentProfiles, eq(users.id, studentProfiles.userId))
      .where(and(eq(users.diveCenterId, session.diveCenterId), eq(users.role, 'STUDENT'), eq(users.isActive, true)));

    const candidatesList = [];

    for (const item of studentRows) {
      const student = item.user;
      const profile = item.profile;

      const studentCourseRows = await tx
        .select()
        .from(courses)
        .where(and(eq(courses.studentId, student.id), eq(courses.status, 'ACTIVE')));

      const studentCourse = studentCourseRows[0];
      if (!studentCourse || studentCourse.isArchived) continue;

      const { progress } = await getCourseProgress(studentCourse.id, tx);

      // Fetch all sign-offs / requests for this course
      const requests = await tx
        .select()
        .from(signoffRequests)
        .where(eq(signoffRequests.courseId, studentCourse.id));

      const startedItemIds = new Set(
        requests
          .filter((r: any) => r.status === 'APPROVED' || r.status === 'PENDING' || r.status === 'DRAFT')
          .map((r: any) => r.itemId)
      );

      candidatesList.push({
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        email: student.email,
        country: profile?.country || 'N/A',
        courseId: studentCourse.id,
        percentComplete: progress.percentComplete,
        approvedUnits: progress.approvedUnits,
        startedItemIds: Array.from(startedItemIds),
      });
    }

    return {
      skills: allSkills,
      candidates: candidatesList,
    };
  },
});
