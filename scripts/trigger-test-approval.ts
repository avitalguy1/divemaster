import { db } from '@/lib/db';
import { users, courses, signoffRequests, requirementItems, requirementSections, signatures } from '@/lib/db/schema';
import { eq, and, ne } from 'drizzle-orm';

async function main() {
  const student = (await db.select().from(users).where(eq(users.email, 'student0@example.com')))[0];
  const instructor = (await db.select().from(users).where(eq(users.role, 'INSTRUCTOR')))[0];
  const course = (await db.select().from(courses).where(eq(courses.studentId, student.id)))[0];

  // Find all approved itemIds for this course
  const existingApproved = await db
    .select({ itemId: signoffRequests.itemId })
    .from(signoffRequests)
    .where(and(eq(signoffRequests.courseId, course.id), eq(signoffRequests.status, 'APPROVED')));

  const approvedIds = new Set(existingApproved.map((r) => r.itemId));

  // Find all items in non-PREREQ sections
  const nonPrereqItems = await db
    .select({
      item: requirementItems,
      section: requirementSections,
    })
    .from(requirementItems)
    .innerJoin(requirementSections, eq(requirementItems.sectionId, requirementSections.id))
    .where(ne(requirementSections.code, 'PREREQ'));

  const candidate = nonPrereqItems.find((r) => !approvedIds.has(r.item.id));
  if (!candidate) {
    console.error('No unapproved non-PREREQ candidate item found!');
    process.exit(1);
  }

  const { item, section } = candidate;

  // Create signature
  const sigRes = await db.insert(signatures).values({
    signerId: instructor.id,
    imageData: Buffer.from('fake-sig'),
  }).returning();

  // Create approved uncelebrated sign-off request
  const newReq = await db.insert(signoffRequests).values({
    courseId: course.id,
    itemId: item.id,
    attemptNumber: 1,
    status: 'APPROVED',
    performedAt: new Date(),
    instructorId: instructor.id,
    decidedAt: new Date(),
    instructorNameSnapshot: `${instructor.firstName} ${instructor.lastName}`,
    instructorPadiSnapshot: instructor.padiNumber || '99999',
    signatureId: sigRes[0].id,
    score: 5,
    celebratedAt: null,
  }).returning();

  console.log(`Successfully inserted approved uncelebrated request #${newReq[0].id} for item "${item.title}" (${section.title})`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
