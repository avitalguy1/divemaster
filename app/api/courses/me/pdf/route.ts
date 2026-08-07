import { createApiHandler, ApiError } from '@/lib/api/handler';
import { generateEvaluationPdf } from '@/lib/pdf/generator';
import { courses } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export const GET = createApiHandler({
  requireAuth: true,
  handler: async ({ session, tx }) => {
    if (!session) throw new ApiError(401, 'UNAUTHENTICATED', 'Authentication required');

    const courseRows = await tx
      .select()
      .from(courses)
      .where(eq(courses.studentId, session.userId));

    const course = courseRows[0];
    if (!course) {
      throw new ApiError(404, 'COURSE_NOT_FOUND', 'No course found for candidate');
    }

    const pdfBytes = await generateEvaluationPdf(course.id, tx);

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="dmt-evaluation-report-${session.userId.substring(0, 8)}.pdf"`,
      },
    });
  },
});
