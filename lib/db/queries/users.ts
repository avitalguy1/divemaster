import { db } from '../index';
import { users } from '../schema';
import { eq, and, inArray, asc } from 'drizzle-orm';

export async function getActiveInstructors(diveCenterId: string, txClient?: any) {
  const client = txClient || db;
  return await client
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      padiNumber: users.padiNumber,
      role: users.role,
    })
    .from(users)
    .where(
      and(
        eq(users.diveCenterId, diveCenterId),
        eq(users.isActive, true),
        inArray(users.role, ['INSTRUCTOR', 'ADMIN'])
      )
    )
    .orderBy(asc(users.lastName), asc(users.firstName));
}
