import { z } from 'zod';
import { createApiHandler, ApiError } from '@/lib/api/handler';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword } from '@/lib/auth/password';
import { signAccessToken, setSessionCookie } from '@/lib/auth/session';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const POST = createApiHandler({
  requireAuth: false,
  schema: loginSchema,
  handler: async ({ input, tx }) => {
    const userRows = await tx.select().from(users).where(eq(users.email, input.email.toLowerCase()));
    const user = userRows[0];

    if (!user || !user.isActive) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const isValid = await verifyPassword(input.password, user.passwordHash);
    if (!isValid) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const token = await signAccessToken({
      userId: user.id,
      diveCenterId: user.diveCenterId,
      role: user.role,
      email: user.email || '',
    });

    await setSessionCookie(token);

    return {
      user: {
        id: user.id,
        diveCenterId: user.diveCenterId,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        padiNumber: user.padiNumber,
        locale: user.locale,
      },
    };
  },
});
