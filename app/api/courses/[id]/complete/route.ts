import { createApiHandler, ApiError } from '@/lib/api/handler';
import { completeCourse } from '@/lib/db/queries/courses';

export const POST = createApiHandler({
  requireAuth: true,
  roles: ['INSTRUCTOR', 'ADMIN'],
  handler: async ({ session, params, tx }) => {
    if (!session) throw new ApiError(401, 'UNAUTHENTICATED', 'Authentication required');
    const courseId = params.id as string;
    return await completeCourse(courseId, session.userId, tx);
  },
});
