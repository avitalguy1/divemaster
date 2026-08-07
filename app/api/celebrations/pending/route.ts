import { createApiHandler, ApiError } from '@/lib/api/handler';
import { courses, signoffRequests, requirementItems, requirementSections } from '@/lib/db/schema';
import { eq, and, isNull, inArray } from 'drizzle-orm';
import { getCourseProgress } from '@/lib/db/queries/courses';
import { calculateCelebrationTier, evaluatePendingCelebrationBatch, CelebrationTier } from '@/lib/celebrations/tier';

export const GET = createApiHandler({
  requireAuth: true,
  roles: ['STUDENT'],
  handler: async ({ session, tx }) => {
    if (!session) throw new ApiError(401, 'UNAUTHENTICATED', 'Authentication required');

    // Fetch active course for calling student only
    const courseRows = await tx
      .select()
      .from(courses)
      .where(and(eq(courses.studentId, session.userId), eq(courses.status, 'ACTIVE')));

    const course = courseRows[0];
    if (!course || course.isArchived) {
      return {
        tier: 'NONE',
        primaryRequest: null,
        uncelebratedCount: 0,
        pendingIds: [],
      };
    }

    // Fetch uncelebrated approved requests
    const uncelebratedRows = await tx
      .select({
        request: signoffRequests,
        item: requirementItems,
        section: requirementSections,
      })
      .from(signoffRequests)
      .innerJoin(requirementItems, eq(signoffRequests.itemId, requirementItems.id))
      .innerJoin(requirementSections, eq(requirementItems.sectionId, requirementSections.id))
      .where(
        and(
          eq(signoffRequests.courseId, course.id),
          eq(signoffRequests.status, 'APPROVED'),
          isNull(signoffRequests.celebratedAt)
        )
      );

    if (uncelebratedRows.length === 0) {
      return {
        tier: 'NONE',
        primaryRequest: null,
        uncelebratedCount: 0,
        pendingIds: [],
      };
    }

    // Compute progress after all approvals
    const { progress: currentProgress } = await getCourseProgress(course.id, tx);

    const evaluations = uncelebratedRows.map((row) => {
      // Simulate progress before this item approval
      const fakeBefore = {
        approvedUnits: Math.max(0, currentProgress.approvedUnits - 1),
        percentComplete: Math.max(0, currentProgress.percentComplete - 2),
        isComplete: false,
      };

      const tier: CelebrationTier = calculateCelebrationTier({
        item: row.item,
        section: row.section,
        progressBefore: fakeBefore,
        progressAfter: currentProgress,
      });

      return {
        request: {
          id: row.request.id,
          itemId: row.item.id,
          itemTitle: row.item.title,
          sectionTitle: row.section.title,
          performedAt: row.request.performedAt,
        },
        tier,
        sectionTitle: row.section.title,
        percentComplete: currentProgress.percentComplete,
      };
    });

    const batch = evaluatePendingCelebrationBatch(evaluations);
    const pendingIds = uncelebratedRows.map((r) => r.request.id);

    return {
      tier: batch.highestTier,
      primaryRequest: batch.primaryRequest,
      uncelebratedCount: batch.uncelebratedCount,
      sectionName: batch.sectionName,
      milestonePercent: batch.milestonePercent,
      pendingIds,
    };
  },
});
