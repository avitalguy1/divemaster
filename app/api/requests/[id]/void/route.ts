import { z } from 'zod';
import { createApiHandler, ApiError } from '@/lib/api/handler';
import { voidSignoffRequest } from '@/lib/db/queries/requests';

const voidSchema = z.object({
  reason: z.string().min(1, 'Void reason is required'),
});

export const POST = createApiHandler({
  requireAuth: true,
  roles: ['ADMIN'],
  schema: voidSchema,
  handler: async ({ session, params, input, tx }) => {
    if (!session) throw new ApiError(401, 'UNAUTHENTICATED', 'Authentication required');
    const id = params.id as string;
    return await voidSignoffRequest(id, session.userId, session.diveCenterId, input.reason, tx);
  },
});
