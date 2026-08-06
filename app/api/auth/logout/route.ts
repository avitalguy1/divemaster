import { createApiHandler } from '@/lib/api/handler';
import { clearSessionCookie } from '@/lib/auth/session';

export const POST = createApiHandler({
  requireAuth: false,
  handler: async () => {
    await clearSessionCookie();
    return { success: true };
  },
});
