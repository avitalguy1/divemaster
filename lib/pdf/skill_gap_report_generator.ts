import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { users, courses, studentProfiles, diveCenters, requirementItems, requirementSections, signoffRequests } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { getCourseProgress } from '@/lib/db/queries/courses';

export async function generateSkillGapReportPdf(
  diveCenterId: string,
  itemId: number,
  txClient?: any
): Promise<Uint8Array> {
  const tx = txClient;

  // Fetch Dive Center info
  const dcRows = await tx.select().from(diveCenters).where(eq(diveCenters.id, diveCenterId));
  const dcName = dcRows[0]?.name || 'PADI Dive Center';

  // Fetch target requirement item and its section
  const itemRows = await tx
    .select({
      item: requirementItems,
      section: requirementSections,
    })
    .from(requirementItems)
    .innerJoin(requirementSections, eq(requirementItems.sectionId, requirementSections.id))
    .where(eq(requirementItems.id, itemId));

  const targetItem = itemRows[0]?.item;
  const targetSection = itemRows[0]?.section;

  const itemTitle = targetItem ? targetItem.title : `Requirement #${itemId}`;
  const sectionTitle = targetSection ? `${targetSection.code} - ${targetSection.title}` : 'Catalog Section';

  // Fetch all active DMT candidates at this dive center
  const students = await tx
    .select({
      user: users,
      profile: studentProfiles,
    })
    .from(users)
    .leftJoin(studentProfiles, eq(users.id, studentProfiles.userId))
    .where(and(eq(users.diveCenterId, diveCenterId), eq(users.role, 'STUDENT'), eq(users.isActive, true)));

  const unstartedCandidates = [];

  for (const item of students) {
    const u = item.user;
    const p = item.profile;

    const courseRows = await tx
      .select()
      .from(courses)
      .where(and(eq(courses.studentId, u.id), eq(courses.status, 'ACTIVE')));

    const course = courseRows[0];
    if (!course || course.isArchived) continue;

    // Check sign-off requests for this student and item
    const requests = await tx
      .select()
      .from(signoffRequests)
      .where(and(eq(signoffRequests.courseId, course.id), eq(signoffRequests.itemId, itemId)));

    const hasStarted = requests.some((r: any) => r.status === 'APPROVED' || r.status === 'PENDING' || r.status === 'DRAFT');

    if (!hasStarted) {
      const { progress } = await getCourseProgress(course.id, tx);

      unstartedCandidates.push({
        name: `${u.firstName} ${u.lastName}`,
        email: u.email,
        country: p?.country || 'N/A',
        percentComplete: `${progress.percentComplete}%`,
      });
    }
  }

  // Generate PDF Document
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
    color: rgb(0.12, 0.16, 0.25),
  });

  page.drawText(`${dcName.toUpperCase()} - DMT SKILL GAP REPORT`, {
    x: 20,
    y: height - 30,
    size: 13,
    font: boldFont,
    color: rgb(1, 1, 1),
  });

  page.drawText(`Skill Task: ${itemTitle} (${sectionTitle})`, {
    x: 20,
    y: height - 48,
    size: 10,
    font: boldFont,
    color: rgb(0.9, 0.7, 0.2),
  });

  const formattedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  page.drawText(`Candidates Pending Start: ${unstartedCandidates.length} DMTs • Report Date: ${formattedDate}`, {
    x: 20,
    y: height - 66,
    size: 8.5,
    font,
    color: rgb(0.8, 0.88, 1),
  });

  let yPos = height - 110;

  // Table Headers
  page.drawRectangle({
    x: 20,
    y: yPos - 18,
    width: width - 40,
    height: 22,
    color: rgb(0.01, 0.45, 0.72),
  });

  page.drawText('CANDIDATE NAME', { x: 26, y: yPos - 11, size: 8, font: boldFont, color: rgb(1, 1, 1) });
  page.drawText('EMAIL', { x: 190, y: yPos - 11, size: 8, font: boldFont, color: rgb(1, 1, 1) });
  page.drawText('COUNTRY', { x: 370, y: yPos - 11, size: 8, font: boldFont, color: rgb(1, 1, 1) });
  page.drawText('PROGRESS', { x: 450, y: yPos - 11, size: 8, font: boldFont, color: rgb(1, 1, 1) });
  page.drawText('STATUS', { x: 515, y: yPos - 11, size: 8, font: boldFont, color: rgb(1, 1, 1) });

  yPos -= 22;

  // Table Rows
  for (let i = 0; i < unstartedCandidates.length; i++) {
    const rec = unstartedCandidates[i];

    if (yPos < 60) {
      page = pdfDoc.addPage([595.28, 841.89]);
      yPos = height - 40;
    }

    const bgColor = i % 2 === 0 ? rgb(0.97, 0.98, 1) : rgb(1, 1, 1);
    page.drawRectangle({
      x: 20,
      y: yPos - 16,
      width: width - 40,
      height: 20,
      color: bgColor,
    });

    page.drawText(rec.name, { x: 26, y: yPos - 11, size: 8.5, font: boldFont, color: rgb(0.1, 0.1, 0.1) });
    page.drawText(rec.email, { x: 190, y: yPos - 11, size: 8, font, color: rgb(0.3, 0.3, 0.3) });
    page.drawText(rec.country, { x: 370, y: yPos - 11, size: 8.5, font, color: rgb(0.3, 0.3, 0.3) });
    page.drawText(rec.percentComplete, { x: 450, y: yPos - 11, size: 8.5, font: boldFont, color: rgb(0.01, 0.45, 0.72) });
    page.drawText('NOT STARTED', { x: 515, y: yPos - 11, size: 7.5, font: boldFont, color: rgb(0.7, 0.2, 0.2) });

    yPos -= 20;
  }

  page.drawText('PADI Divemaster Candidate Skill Gap Report • Confidential Training Audit', {
    x: 20,
    y: 20,
    size: 7.5,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  return await pdfDoc.save();
}
