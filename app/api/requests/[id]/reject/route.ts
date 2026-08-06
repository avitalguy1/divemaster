import { z } from 'zod';
import { createApiHandler, ApiError } from '@/lib/api/handler';
import { rejectSignoffRequest } from '@/lib/db/queries/requests';

const rejectSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required'),
});

export const POST = createApiHandler({
  requireAuth: true,
  roles: ['INSTRUCTOR', 'ADMIN'],
  schema: rejectSchema,
  handler: async ({ session, params, input, tx }) => {
    if (!session) throw new ApiError(401, 'UNAUTHENTICATED', 'Authentication required');
    const id = params.id as string;
    return await rejectSignoffRequest(id, session.userId, session.diveCenterId, input.reason, tx);
  },
});
