import { createApiHandler } from '@/lib/api/handler';
import { getAuditLogs } from '@/lib/db/queries/audit';

export const GET = createApiHandler({
  requireAuth: true,
  roles: ['ADMIN'],
  handler: async ({ tx }) => {
    const logs = await getAuditLogs(tx);
    return { logs };
  },
});
