import { z } from 'zod';
import { createApiHandler, ApiError } from '@/lib/api/handler';
import { getSignoffRequestById, withdrawSignoffRequest, updateSignoffRequest } from '@/lib/db/queries/requests';

export const GET = createApiHandler({
  requireAuth: true,
  handler: async ({ params, tx }) => {
    const id = params.id as string;
    const details = await getSignoffRequestById(id, tx);
    if (!details) {
      throw new ApiError(404, 'REQUEST_NOT_FOUND', 'Sign-off request not found');
    }
    return details;
  },
});

const updateSchema = z.object({
  instructorId: z.string().uuid().optional(),
  performedAt: z.string().or(z.date()).optional(),
  studentNote: z.string().optional(),
});

export const PATCH = createApiHandler({
  requireAuth: true,
  roles: ['STUDENT'],
  schema: updateSchema,
  handler: async ({ session, params, input, tx }) => {
    if (!session) throw new ApiError(401, 'UNAUTHENTICATED', 'Authentication required');
    const id = params.id as string;
    return await updateSignoffRequest(id, session.userId, session.diveCenterId, input, tx);
  },
});

export const DELETE = createApiHandler({
  requireAuth: true,
  roles: ['STUDENT'],
  handler: async ({ session, params, tx }) => {
    if (!session) throw new ApiError(401, 'UNAUTHENTICATED', 'Authentication required');
    const id = params.id as string;
    await withdrawSignoffRequest(id, session.userId, tx);
    return { success: true };
  },
});
