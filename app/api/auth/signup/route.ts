import { z } from 'zod';
import { createApiHandler, ApiError } from '@/lib/api/handler';
import { db } from '@/lib/db';
import { users, diveCenters, courses, studentProfiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '@/lib/auth/password';
import { signAccessToken, setSessionCookie } from '@/lib/auth/session';

const signupSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  middleInitial: z.string().optional(),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  addressLine: z.string().optional(),
  city: z.string().optional(),
  stateProvince: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  homePhone: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
});

export const POST = createApiHandler({
  requireAuth: false,
  schema: signupSchema,
  handler: async ({ input, tx }) => {
    const cleanEmail = input.email.toLowerCase().trim();

    // Check if email already exists
    const existing = await tx.select().from(users).where(eq(users.email, cleanEmail));
    if (existing.length > 0) {
      throw new ApiError(400, 'EMAIL_EXISTS', 'An account with this email address already exists');
    }

    // Get default dive center
    const centers = await tx.select().from(diveCenters);
    const center = centers[0];
    if (!center) {
      throw new ApiError(500, 'NO_DIVE_CENTER', 'No active dive center configured in system');
    }

    const passwordHash = await hashPassword(input.password);

    // 1. Create DMT Student User
    const newUsers = await tx
      .insert(users)
      .values({
        diveCenterId: center.id,
        email: cleanEmail,
        passwordHash,
        role: 'STUDENT',
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        middleInitial: input.middleInitial?.trim() || null,
        phone: input.phone?.trim() || null,
        isActive: true,
      })
      .returning();

    const studentUser = newUsers[0];

    // 2. Create Student Profile with PADI Candidate Information
    await tx.insert(studentProfiles).values({
      userId: studentUser.id,
      birthDate: input.birthDate?.trim() || null,
      addressLine: input.addressLine?.trim() || null,
      city: input.city?.trim() || null,
      stateProvince: input.stateProvince?.trim() || null,
      country: input.country?.trim() || null,
      postalCode: input.postalCode?.trim() || null,
      homePhone: input.homePhone?.trim() || null,
      emergencyContact: input.emergencyContact?.trim() || null,
      emergencyPhone: input.emergencyPhone?.trim() || null,
      loggedDives: 0,
    });

    // 3. Create Active Course
    await tx.insert(courses).values({
      studentId: studentUser.id,
      diveCenterId: center.id,
      status: 'ACTIVE',
      startedAt: new Date().toISOString().split('T')[0],
    });

    // 4. Create session token and set httpOnly cookie
    const token = await signAccessToken({
      userId: studentUser.id,
      diveCenterId: center.id,
      role: 'STUDENT',
      email: cleanEmail,
    });

    await setSessionCookie(token);

    return {
      success: true,
      user: {
        id: studentUser.id,
        diveCenterId: center.id,
        email: studentUser.email,
        role: studentUser.role,
        firstName: studentUser.firstName,
        lastName: studentUser.lastName,
      },
    };
  },
});
