import { createApiHandler, ApiError } from '@/lib/api/handler';
import { generateSkillGapReportPdf } from '@/lib/pdf/skill_gap_report_generator';
import { NextResponse } from 'next/server';

export const GET = createApiHandler({
  requireAuth: true,
  roles: ['ADMIN', 'INSTRUCTOR'],
  handler: async ({ session, req, tx }) => {
    if (!session) throw new ApiError(401, 'UNAUTHENTICATED', 'Authentication required');

    const url = new URL(req.url);
    const itemIdStr = url.searchParams.get('itemId');

    if (!itemIdStr) {
      throw new ApiError(400, 'ITEM_ID_REQUIRED', 'itemId parameter is required');
    }

    const itemId = parseInt(itemIdStr, 10);
    if (isNaN(itemId)) {
      throw new ApiError(400, 'INVALID_ITEM_ID', 'itemId must be a valid number');
    }

    const pdfBytes = await generateSkillGapReportPdf(session.diveCenterId, itemId, tx);

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="dmt-skill-gap-item-${itemId}.pdf"`,
      },
    });
  },
});
