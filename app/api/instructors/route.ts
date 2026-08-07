import { z } from 'zod';
import { createApiHandler, ApiError } from '@/lib/api/handler';
import { users } from '@/lib/db/schema';
import { eq, and, or } from 'drizzle-orm';
import { hashPassword } from '@/lib/auth/password';

export const GET = createApiHandler({
  requireAuth: true,
  handler: async ({ session, tx }) => {
    if (!session) throw new ApiError(401, 'UNAUTHENTICATED', 'Authentication required');

    const instructors = await tx
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
        padiNumber: users.padiNumber,
        isActive: users.isActive,
      })
      .from(users)
      .where(
        and(
          eq(users.diveCenterId, session.diveCenterId),
          or(eq(users.role, 'INSTRUCTOR'), eq(users.role, 'ADMIN')),
          eq(users.isActive, true)
        )
      );

    return { instructors };
  },
});

const createInstructorSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  padiNumber: z.string().min(1, 'PADI Number is required'),
  password: z.string().min(6, 'Password must be at least 6 characters').default('Password123!'),
  role: z.enum(['INSTRUCTOR', 'ADMIN']).optional().default('INSTRUCTOR'),
});

export const POST = createApiHandler({
  requireAuth: true,
  roles: ['ADMIN'],
  schema: createInstructorSchema,
  handler: async ({ session, input, tx }) => {
    if (!session) throw new ApiError(401, 'UNAUTHENTICATED', 'Authentication required');

    // Check if email already exists
    const existing = await tx
      .select()
      .from(users)
      .where(eq(users.email, input.email.toLowerCase().trim()));

    if (existing.length > 0) {
      throw new ApiError(400, 'EMAIL_EXISTS', 'An account with this email address already exists');
    }

    const passwordHash = await hashPassword(input.password);

    const newUsers = await tx
      .insert(users)
      .values({
        diveCenterId: session.diveCenterId,
        email: input.email.toLowerCase().trim(),
        passwordHash,
        role: input.role || 'INSTRUCTOR',
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        padiNumber: input.padiNumber.trim(),
        isActive: true,
      })
      .returning();

    const created = newUsers[0];

    return {
      success: true,
      instructor: {
        id: created.id,
        firstName: created.firstName,
        lastName: created.lastName,
        email: created.email,
        role: created.role,
        padiNumber: created.padiNumber,
      },
    };
  },
});
