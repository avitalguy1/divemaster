import { createApiHandler, ApiError } from '@/lib/api/handler';
import { generateMasterDmtReportPdf } from '@/lib/pdf/master_report_generator';
import { NextResponse } from 'next/server';

export const GET = createApiHandler({
  requireAuth: true,
  roles: ['ADMIN', 'INSTRUCTOR'],
  handler: async ({ session, tx }) => {
    if (!session) throw new ApiError(401, 'UNAUTHENTICATED', 'Authentication required');

    const pdfBytes = await generateMasterDmtReportPdf(session.diveCenterId, tx);

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="master-dmts-report-${new Date().toISOString().substring(0, 10)}.pdf"`,
      },
    });
  },
});
