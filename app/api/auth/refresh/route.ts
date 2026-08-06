import { createApiHandler } from '@/lib/api/handler';
import { signAccessToken, setSessionCookie } from '@/lib/auth/session';

export const POST = createApiHandler({
  requireAuth: true,
  handler: async ({ session }) => {
    if (!session) return { success: false };
    const newToken = await signAccessToken(session);
    await setSessionCookie(newToken);
    return { success: true };
  },
});
