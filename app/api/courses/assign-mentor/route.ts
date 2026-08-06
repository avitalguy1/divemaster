import { z } from 'zod';
import { createApiHandler, ApiError } from '@/lib/api/handler';
import { assignMentorToCourse } from '@/lib/db/queries/mentor';

const assignMentorSchema = z.object({
  instructorId: z.string().uuid(),
});

export const POST = createApiHandler({
  requireAuth: true,
  roles: ['STUDENT'],
  schema: assignMentorSchema,
  handler: async ({ session, input, tx }) => {
    if (!session) throw new ApiError(401, 'UNAUTHENTICATED', 'Authentication required');
    return await assignMentorToCourse(session.userId, session.diveCenterId, input.instructorId, tx);
  },
});
