import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { users, courses, studentProfiles, diveCenters } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCourseProgress } from '@/lib/db/queries/courses';

export async function generateMasterDmtReportPdf(diveCenterId: string, txClient?: any): Promise<Uint8Array> {
  const tx = txClient;

  // Fetch Dive Center info
  const dcRows = await tx.select().from(diveCenters).where(eq(diveCenters.id, diveCenterId));
  const dcName = dcRows[0]?.name || 'PADI Dive Center';

  // Fetch all DMT candidate users and profiles at this dive center
  const students = await tx
    .select({
      user: users,
      profile: studentProfiles,
    })
    .from(users)
    .leftJoin(studentProfiles, eq(users.id, studentProfiles.userId))
    .where(and(eq(users.diveCenterId, diveCenterId), eq(users.role, 'STUDENT')));

  const candidateRecords = [];

  for (const item of students) {
    const u = item.user;
    const p = item.profile;

    const courseRows = await tx
      .select()
      .from(courses)
      .where(eq(courses.studentId, u.id));

    const course = courseRows[0];
    if (!course) continue;

    const { progress } = await getCourseProgress(course.id, tx);

    candidateRecords.push({
      name: `${u.firstName} ${u.lastName}`,
      country: p?.country || 'N/A',
      status: course.isArchived ? 'ARCHIVED' : progress.isComplete ? 'GRADUATED' : 'IN TRAINING',
      approvedUnits: `${progress.approvedUnits} / 53`,
      percentComplete: `${progress.percentComplete}%`,
    });
  }

  // Generate PDF Document
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([595.28, 841.89]); // A4 portrait
  const { height, width } = page.getSize();

  // Header Blue Banner
  page.drawRectangle({
    x: 0,
    y: height - 75,
    width,
    height: 75,
    color: rgb(0.01, 0.45, 0.72),
  });

  page.drawText(`${dcName.toUpperCase()} - PADI DIVEMASTER ROSTER`, {
    x: 20,
    y: height - 32,
    size: 13,
    font: boldFont,
    color: rgb(1, 1, 1),
  });

  const formattedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  page.drawText(`Master Candidates Evaluation Report • Total Candidates: ${candidateRecords.length} • Generated: ${formattedDate}`, {
    x: 20,
    y: height - 54,
    size: 9,
    font,
    color: rgb(0.88, 0.96, 1),
  });

  let yPos = height - 105;

  // Table Headers
  page.drawRectangle({
    x: 20,
    y: yPos - 18,
    width: width - 40,
    height: 22,
    color: rgb(0.1, 0.15, 0.25),
  });

  page.drawText('CANDIDATE NAME', { x: 26, y: yPos - 11, size: 8, font: boldFont, color: rgb(1, 1, 1) });
  page.drawText('COUNTRY', { x: 190, y: yPos - 11, size: 8, font: boldFont, color: rgb(1, 1, 1) });
  page.drawText('STATUS', { x: 290, y: yPos - 11, size: 8, font: boldFont, color: rgb(1, 1, 1) });
  page.drawText('APPROVED UNITS', { x: 400, y: yPos - 11, size: 8, font: boldFont, color: rgb(1, 1, 1) });
  page.drawText('PROGRESS', { x: 505, y: yPos - 11, size: 8, font: boldFont, color: rgb(1, 1, 1) });

  yPos -= 22;

  // Table Rows
  for (let i = 0; i < candidateRecords.length; i++) {
    const rec = candidateRecords[i];

    if (yPos < 60) {
      page = pdfDoc.addPage([595.28, 841.89]);
      yPos = height - 40;
    }

    // Row Background (Zebra Striped)
    const bgColor = i % 2 === 0 ? rgb(0.97, 0.98, 1) : rgb(1, 1, 1);
    page.drawRectangle({
      x: 20,
      y: yPos - 16,
      width: width - 40,
      height: 20,
      color: bgColor,
    });

    // Draw Candidate Data
    page.drawText(rec.name, { x: 26, y: yPos - 11, size: 8.5, font: boldFont, color: rgb(0.1, 0.1, 0.1) });
    page.drawText(rec.country, { x: 190, y: yPos - 11, size: 8.5, font, color: rgb(0.3, 0.3, 0.3) });
    page.drawText(rec.status, { x: 290, y: yPos - 11, size: 8, font: boldFont, color: rec.status === 'GRADUATED' ? rgb(0, 0.5, 0.2) : rgb(0.01, 0.45, 0.72) });
    page.drawText(rec.approvedUnits, { x: 400, y: yPos - 11, size: 8.5, font, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(rec.percentComplete, { x: 505, y: yPos - 11, size: 8.5, font: boldFont, color: rgb(0.01, 0.45, 0.72) });

    yPos -= 20;
  }

  // Footer Page Number
  page.drawText('PADI Divemaster Candidate Information and Evaluation Form • Confidential Record', {
    x: 20,
    y: 20,
    size: 7.5,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  return await pdfDoc.save();
}
