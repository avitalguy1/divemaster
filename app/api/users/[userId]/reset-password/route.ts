import { z } from 'zod';
import { createApiHandler, ApiError } from '@/lib/api/handler';
import { users, auditLog } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import * as argon2 from 'argon2';

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

export const POST = createApiHandler({
  requireAuth: true,
  roles: ['ADMIN', 'INSTRUCTOR'],
  schema: resetPasswordSchema,
  handler: async ({ params, input, session, tx }) => {
    if (!session) {
      throw new ApiError(401, 'UNAUTHENTICATED', 'Authentication required');
    }

    const rawId = params?.userId;
    const targetUserId = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!targetUserId) {
      throw new ApiError(400, 'INVALID_INPUT', 'Target User ID is required');
    }

    // Find target user at dive center
    const targetUserRows = await tx
      .select()
      .from(users)
      .where(and(eq(users.id, targetUserId), eq(users.diveCenterId, session.diveCenterId)));

    const targetUser = targetUserRows[0];
    if (!targetUser) {
      throw new ApiError(404, 'USER_NOT_FOUND', 'Target user not found');
    }

    // Authorization checks:
    // - INSTRUCTOR can only reset STUDENT passwords
    // - ADMIN can reset STUDENT and INSTRUCTOR passwords
    if (session.role === 'INSTRUCTOR' && targetUser.role !== 'STUDENT') {
      throw new ApiError(403, 'FORBIDDEN', 'Instructors can only reset DMT candidate passwords');
    }

    if (session.role === 'ADMIN' && targetUser.role === 'ADMIN' && targetUser.id !== session.userId) {
      throw new ApiError(403, 'FORBIDDEN', 'Cannot reset another administrator password via this route');
    }

    // Hash new password using argon2
    const passwordHash = await argon2.hash(input.newPassword);

    // Update password hash in users table
    await tx
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, targetUser.id));

    // Audit log
    await tx.insert(auditLog).values({
      actorId: session.userId,
      entity: 'user',
      entityId: targetUser.id,
      action: 'RESET_PASSWORD',
      before: {
        id: targetUser.id,
        name: `${targetUser.firstName} ${targetUser.lastName}`,
        role: targetUser.role,
      },
    });

    return {
      success: true,
      message: `Password for ${targetUser.firstName} ${targetUser.lastName} was reset successfully.`,
    };
  },
});
