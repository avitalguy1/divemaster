import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { getCourseProgress, getCourseItems } from '@/lib/db/queries/courses';
import { diveCenters } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';

export async function generateEvaluationPdf(courseId: string, txClient?: any): Promise<Uint8Array> {
  const tx = txClient || db;
  const { course, progress } = await getCourseProgress(courseId, tx);
  const sections = await getCourseItems(courseId, tx);

  // Fetch Dive Center name
  const dcRows = await tx.select().from(diveCenters).where(eq(diveCenters.id, course.diveCenterId));
  const dcName = dcRows[0]?.name || 'Underwater Vision';

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([595.28, 841.89]); // A4 portrait
  const { height, width } = page.getSize();

  // Header Banner
  page.drawRectangle({
    x: 0,
    y: height - 70,
    width,
    height: 70,
    color: rgb(0.06, 0.09, 0.16),
  });

  page.drawText(`${dcName.toUpperCase()} - PADI DIVEMASTER EVALUATION FORM`, {
    x: 20,
    y: height - 30,
    size: 12,
    font: boldFont,
    color: rgb(1, 1, 1),
  });

  page.drawText(`Progress: ${progress.percentComplete}% (${progress.approvedUnits}/53 Units Approved) | Status: ${course.status}`, {
    x: 20,
    y: height - 52,
    size: 9.5,
    font,
    color: rgb(0.7, 0.8, 1),
  });

  let yPosition = height - 95;

  for (const sec of sections) {
    if (yPosition < 90) {
      page = pdfDoc.addPage([595.28, 841.89]);
      yPosition = height - 40;
    }

    // Section Header Title Banner
    page.drawRectangle({
      x: 20,
      y: yPosition - 16,
      width: width - 40,
      height: 18,
      color: rgb(0.12, 0.16, 0.23),
    });

    page.drawText(sec.title.toUpperCase(), {
      x: 25,
      y: yPosition - 12,
      size: 8.5,
      font: boldFont,
      color: rgb(0.4, 0.7, 1),
    });

    yPosition -= 24;

    // Table Column Headers
    page.drawText('REQUIREMENT ITEM', { x: 25, y: yPosition, size: 7.5, font: boldFont, color: rgb(0.4, 0.4, 0.5) });
    page.drawText('STATUS', { x: 285, y: yPosition, size: 7.5, font: boldFont, color: rgb(0.4, 0.4, 0.5) });
    page.drawText('INSTRUCTOR NAME & ID', { x: 365, y: yPosition, size: 7.5, font: boldFont, color: rgb(0.4, 0.4, 0.5) });
    page.drawText('SCORE', { x: 520, y: yPosition, size: 7.5, font: boldFont, color: rgb(0.4, 0.4, 0.5) });

    yPosition -= 14;

    for (const item of sec.items) {
      if (yPosition < 45) {
        page = pdfDoc.addPage([595.28, 841.89]);
        yPosition = height - 40;

        // Re-draw Column Headers on new page
        page.drawText('REQUIREMENT ITEM', { x: 25, y: yPosition, size: 7.5, font: boldFont, color: rgb(0.4, 0.4, 0.5) });
        page.drawText('STATUS', { x: 285, y: yPosition, size: 7.5, font: boldFont, color: rgb(0.4, 0.4, 0.5) });
        page.drawText('INSTRUCTOR NAME & ID', { x: 365, y: yPosition, size: 7.5, font: boldFont, color: rgb(0.4, 0.4, 0.5) });
        page.drawText('SCORE', { x: 520, y: yPosition, size: 7.5, font: boldFont, color: rgb(0.4, 0.4, 0.5) });
        yPosition -= 14;
      }

      const approvedRequests = (item.requests || []).filter((r: any) => r.status === 'APPROVED');
      const latestApproval = approvedRequests[approvedRequests.length - 1];

      const statusText =
        item.status === 'APPROVED'
          ? `APPROVED (${item.approvedCount}/${item.requiredCount})`
          : item.status === 'PENDING'
          ? `PENDING`
          : `NOT STARTED`;

      const statusColor =
        item.status === 'APPROVED'
          ? rgb(0, 0.5, 0.2)
          : item.status === 'PENDING'
          ? rgb(0.8, 0.4, 0)
          : rgb(0.4, 0.4, 0.4);

      const truncatedTitle = item.title.length > 44 ? `${item.title.substring(0, 42)}...` : item.title;

      page.drawText(`• ${truncatedTitle}`, {
        x: 25,
        y: yPosition,
        size: 8,
        font,
        color: rgb(0.1, 0.1, 0.1),
      });

      page.drawText(statusText, {
        x: 285,
        y: yPosition,
        size: 7.5,
        font: boldFont,
        color: statusColor,
      });

      if (latestApproval) {
        const instName = latestApproval.instructorNameSnapshot || 'Instructor';
        const instPadi = latestApproval.instructorPadiSnapshot ? ` (${latestApproval.instructorPadiSnapshot})` : '';
        const instColText = `${instName}${instPadi}`;
        const truncatedInst = instColText.length > 26 ? `${instColText.substring(0, 24)}...` : instColText;

        const scoreText = latestApproval.score ? `${latestApproval.score}/5` : 'Pass';

        page.drawText(truncatedInst, {
          x: 365,
          y: yPosition,
          size: 7.5,
          font,
          color: rgb(0.1, 0.3, 0.6),
        });

        page.drawText(scoreText, {
          x: 520,
          y: yPosition,
          size: 7.5,
          font: boldFont,
          color: rgb(0.1, 0.1, 0.1),
        });
      } else {
        page.drawText('-', { x: 365, y: yPosition, size: 8, font, color: rgb(0.5, 0.5, 0.5) });
        page.drawText('-', { x: 520, y: yPosition, size: 8, font, color: rgb(0.5, 0.5, 0.5) });
      }

      yPosition -= 14;
    }

    yPosition -= 8;
  }

  // Footer
  page.drawText(`Generated on ${new Date().toISOString().split('T')[0]} - ${dcName} Candidate Evaluation Form`, {
    x: 20,
    y: 20,
    size: 8,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  return await pdfDoc.save();
}
