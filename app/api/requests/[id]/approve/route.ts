import { z } from 'zod';
import { createApiHandler, ApiError } from '@/lib/api/handler';
import { approveSignoffRequest } from '@/lib/db/queries/requests';

const approveSchema = z.object({
  signature: z.string().min(1),
  comment: z.string().optional(),
  score: z.number().int().min(1).max(5).optional(),
  lineScores: z
    .array(
      z.object({
        lineId: z.number().int().positive(),
        score: z.number().int().min(1).max(5),
      })
    )
    .optional(),
  exam: z
    .object({
      part1: z.number().optional(),
      part2: z.number().optional(),
      diveTheoryOnline: z.boolean().optional(),
    })
    .optional(),
  satisfiedBy: z.enum(['PERFORMANCE', 'VERIFICATION', 'SPECIALTY_CERT', 'ONLINE_COURSE']).optional(),
});

export const POST = createApiHandler({
  requireAuth: true,
  roles: ['INSTRUCTOR', 'ADMIN'],
  schema: approveSchema,
  handler: async ({ session, params, input, tx }) => {
    if (!session) throw new ApiError(401, 'UNAUTHENTICATED', 'Authentication required');
    const id = params.id as string;
    return await approveSignoffRequest(id, session.userId, session.diveCenterId, input, tx);
  },
});
