import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { getCourseProgress, getCourseItems } from '@/lib/db/queries/courses';

export async function generateEvaluationPdf(courseId: string, txClient?: any): Promise<Uint8Array> {
  const { course, progress } = await getCourseProgress(courseId, txClient);
  const sections = await getCourseItems(courseId, txClient);

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([595.28, 841.89]); // A4 portrait
  const { height, width } = page.getSize();

  // Header Banner
  page.drawRectangle({
    x: 0,
    y: height - 80,
    width,
    height: 80,
    color: rgb(0.06, 0.09, 0.16),
  });

  page.drawText('PADI DIVEMASTER CANDIDATE EVALUATION FORM', {
    x: 20,
    y: height - 35,
    size: 14,
    font: boldFont,
    color: rgb(1, 1, 1),
  });

  page.drawText(`Progress: ${progress.percentComplete}% (${progress.approvedUnits}/53 Units Approved) | Status: ${course.status}`, {
    x: 20,
    y: height - 58,
    size: 10,
    font,
    color: rgb(0.7, 0.8, 1),
  });

  let yPosition = height - 110;

  for (const sec of sections) {
    if (yPosition < 80) {
      page = pdfDoc.addPage([595.28, 841.89]);
      yPosition = height - 40;
    }

    // Section Header
    page.drawRectangle({
      x: 20,
      y: yPosition - 18,
      width: width - 40,
      height: 20,
      color: rgb(0.12, 0.16, 0.23),
    });

    page.drawText(sec.title.toUpperCase(), {
      x: 25,
      y: yPosition - 13,
      size: 9,
      font: boldFont,
      color: rgb(0.4, 0.7, 1),
    });

    yPosition -= 26;

    for (const item of sec.items) {
      if (yPosition < 50) {
        page = pdfDoc.addPage([595.28, 841.89]);
        yPosition = height - 40;
      }

      const statusText =
        item.status === 'APPROVED'
          ? `[ APPROVED ] ${item.approvedCount}/${item.requiredCount}`
          : item.status === 'PENDING'
          ? `[ PENDING ]`
          : `[ NOT STARTED ]`;

      const statusColor =
        item.status === 'APPROVED'
          ? rgb(0, 0.5, 0.2)
          : item.status === 'PENDING'
          ? rgb(0.8, 0.4, 0)
          : rgb(0.4, 0.4, 0.4);

      page.drawText(`• ${item.title}`, {
        x: 30,
        y: yPosition,
        size: 8.5,
        font,
        color: rgb(0.1, 0.1, 0.1),
      });

      page.drawText(statusText, {
        x: width - 150,
        y: yPosition,
        size: 8.5,
        font: boldFont,
        color: statusColor,
      });

      yPosition -= 14;

      // Render Instructor Name & PADI ID for each approved sign-off
      const approvedRequests = (item.requests || []).filter((r: any) => r.status === 'APPROVED');
      for (const req of approvedRequests) {
        if (yPosition < 40) {
          page = pdfDoc.addPage([595.28, 841.89]);
          yPosition = height - 40;
        }

        const instName = req.instructorNameSnapshot || 'Instructor';
        const instPadi = req.instructorPadiSnapshot ? ` (PADI #: ${req.instructorPadiSnapshot})` : '';
        const dateStr = req.decidedAt ? new Date(req.decidedAt).toISOString().split('T')[0] : '';
        const scoreStr = req.score ? ` • Score: ${req.score}/5` : '';

        const approvalDetail = `    Approved by ${instName}${instPadi} on ${dateStr}${scoreStr}`;

        page.drawText(approvalDetail, {
          x: 42,
          y: yPosition,
          size: 7.5,
          font: font,
          color: rgb(0.15, 0.35, 0.55),
        });

        yPosition -= 11;
      }
    }

    yPosition -= 10;
  }

  // Footer
  page.drawText(`Generated on ${new Date().toISOString().split('T')[0]} - Digital Candidate Evaluation Form`, {
    x: 20,
    y: 20,
    size: 8,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  return await pdfDoc.save();
}
