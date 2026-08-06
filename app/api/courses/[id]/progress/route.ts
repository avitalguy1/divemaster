import { createApiHandler } from '@/lib/api/handler';
import { getCourseProgress } from '@/lib/db/queries/courses';

export const GET = createApiHandler({
  requireAuth: true,
  handler: async ({ params, tx }) => {
    const courseId = params.id as string;
    return await getCourseProgress(courseId, tx);
  },
});
