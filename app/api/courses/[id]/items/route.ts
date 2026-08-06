import { createApiHandler } from '@/lib/api/handler';
import { getCourseItems } from '@/lib/db/queries/courses';

export const GET = createApiHandler({
  requireAuth: true,
  handler: async ({ params, tx }) => {
    const courseId = params.id as string;
    const items = await getCourseItems(courseId, tx);
    return { sections: items };
  },
});
