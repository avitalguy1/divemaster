import { createApiHandler, ApiError } from '@/lib/api/handler';
import { users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export const DELETE = createApiHandler({
  requireAuth: true,
  roles: ['ADMIN'],
  handler: async ({ session, params, tx }) => {
    if (!session) throw new ApiError(401, 'UNAUTHENTICATED', 'Authentication required');
    const id = params.id as string;

    const instRows = await tx
      .select()
      .from(users)
      .where(
        and(
          eq(users.id, id),
          eq(users.diveCenterId, session.diveCenterId),
          eq(users.role, 'INSTRUCTOR')
        )
      );

    if (instRows.length === 0) {
      throw new ApiError(404, 'INSTRUCTOR_NOT_FOUND', 'Instructor not found');
    }

    // Soft delete / deactivate instructor
    await tx
      .update(users)
      .set({ isActive: false })
      .where(eq(users.id, id));

    return { success: true };
  },
});
