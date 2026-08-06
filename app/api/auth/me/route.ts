import { createApiHandler, ApiError } from '@/lib/api/handler';
import { users, diveCenters } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const GET = createApiHandler({
  requireAuth: true,
  handler: async ({ session, tx }) => {
    if (!session) {
      throw new ApiError(401, 'UNAUTHENTICATED', 'Authentication required');
    }

    const userRows = await tx.select().from(users).where(eq(users.id, session.userId));
    const user = userRows[0];

    if (!user || !user.isActive) {
      throw new ApiError(401, 'UNAUTHENTICATED', 'User not found or inactive');
    }

    const centerRows = await tx.select().from(diveCenters).where(eq(diveCenters.id, user.diveCenterId));
    const diveCenter = centerRows[0];

    return {
      user: {
        id: user.id,
        diveCenterId: user.diveCenterId,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        middleInitial: user.middleInitial,
        padiNumber: user.padiNumber,
        phone: user.phone,
        locale: user.locale,
      },
      diveCenter: diveCenter ? {
        id: diveCenter.id,
        name: diveCenter.name,
        timezone: diveCenter.timezone,
      } : null,
    };
  },
});
