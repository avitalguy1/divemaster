import { z } from 'zod';
import { createApiHandler, ApiError } from '@/lib/api/handler';
import { createSignoffRequest, getSignoffRequests } from '@/lib/db/queries/requests';

const createRequestSchema = z.object({
  itemId: z.number().int().positive(),
  performedAt: z.string().or(z.date()),
  performedTz: z.string().optional(),
  instructorId: z.string().uuid(),
  studentNote: z.string().optional(),
});

export const POST = createApiHandler({
  requireAuth: true,
  roles: ['STUDENT'],
  schema: createRequestSchema,
  handler: async ({ session, input, tx }) => {
    if (!session) throw new ApiError(401, 'UNAUTHENTICATED', 'Authentication required');
    const request = await createSignoffRequest(session.userId, session.diveCenterId, input, tx);
    return { request };
  },
});

const getRequestsSchema = z.object({
  status: z.string().optional(),
  studentId: z.string().optional(),
  instructorId: z.string().optional(),
  mine: z.string().transform((v) => v === 'true').optional(),
});

export const GET = createApiHandler({
  requireAuth: true,
  schema: getRequestsSchema,
  handler: async ({ session, input, tx }) => {
    if (!session) throw new ApiError(401, 'UNAUTHENTICATED', 'Authentication required');
    const requests = await getSignoffRequests(
      session.userId,
      session.diveCenterId,
      session.role,
      input,
      tx
    );
    return { requests };
  },
});
