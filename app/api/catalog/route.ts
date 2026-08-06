import { createApiHandler } from '@/lib/api/handler';
import { getFullCatalog } from '@/lib/db/queries/catalog';

export const GET = createApiHandler({
  requireAuth: true,
  handler: async ({ tx }) => {
    const catalog = await getFullCatalog(tx);
    return { catalog };
  },
});
