import { createApiHandler } from '@/lib/api/handler';
import { generateEvaluationPdf } from '@/lib/pdf/generator';
import { NextResponse } from 'next/server';

export const GET = createApiHandler({
  requireAuth: true,
  handler: async ({ params, tx }) => {
    const courseId = params.id as string;
    const pdfBytes = await generateEvaluationPdf(courseId, tx);

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="divemaster-evaluation-${courseId}.pdf"`,
      },
    });
  },
});
