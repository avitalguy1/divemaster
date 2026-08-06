import { z } from 'zod';
import { createApiHandler, ApiError } from '@/lib/api/handler';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword, hashPassword } from '@/lib/auth/password';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

export const POST = createApiHandler({
  requireAuth: true,
  schema: changePasswordSchema,
  handler: async ({ session, input, tx }) => {
    if (!session) {
      throw new ApiError(401, 'UNAUTHENTICATED', 'Authentication required');
    }

    const userRows = await tx.select().from(users).where(eq(users.id, session.userId));
    const user = userRows[0];

    if (!user) {
      throw new ApiError(404, 'NOT_FOUND', 'User not found');
    }

    const isValid = await verifyPassword(input.currentPassword, user.passwordHash);
    if (!isValid) {
      throw new ApiError(400, 'INVALID_PASSWORD', 'Current password is incorrect');
    }

    const newHash = await hashPassword(input.newPassword);
    await tx
      .update(users)
      .set({
        passwordHash: newHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return { success: true };
  },
});
