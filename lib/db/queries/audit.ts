import { db } from '../index';
import { auditLog, users } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getAuditLogs(txClient?: any) {
  const tx = txClient || db;
  return await tx
    .select({
      id: auditLog.id,
      action: auditLog.action,
      entity: auditLog.entity,
      entityId: auditLog.entityId,
      before: auditLog.before,
      after: auditLog.after,
      createdAt: auditLog.createdAt,
      actor: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
      },
    })
    .from(auditLog)
    .innerJoin(users, eq(auditLog.actorId, users.id))
    .orderBy(desc(auditLog.createdAt));
}
