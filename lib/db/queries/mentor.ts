import { db } from '../index';
import { courses, users, studentProfiles, signoffRequests, requirementSections, requirementItems, notifications } from '../schema';
import { eq, and, inArray } from 'drizzle-orm';
import { ApiError } from '@/lib/api/handler';

export async function assignMentorToCourse(
  studentId: string,
  diveCenterId: string,
  instructorId: string,
  txClient?: any
) {
  const tx = txClient || db;

  // 1. Verify student active course
  const courseRows = await tx
    .select()
    .from(courses)
    .where(and(eq(courses.studentId, studentId), eq(courses.status, 'ACTIVE')));

  const course = courseRows[0];
  if (!course) {
    throw new ApiError(404, 'COURSE_NOT_FOUND', 'Active course not found for student');
  }

  // 2. Verify target instructor
  const instructorRows = await tx
    .select()
    .from(users)
    .where(
      and(
        eq(users.id, instructorId),
        eq(users.diveCenterId, diveCenterId),
        eq(users.isActive, true),
        inArray(users.role, ['INSTRUCTOR', 'ADMIN'])
      )
    );

  const instructor = instructorRows[0];
  if (!instructor) {
    throw new ApiError(400, 'INVALID_INSTRUCTOR', 'Selected mentor instructor is not active at your dive center');
  }

  // 3. Update studentProfile assigned mentor
  await tx
    .insert(studentProfiles)
    .values({
      userId: studentId,
      instructorId: instructor.id,
    })
    .onConflictDoUpdate({
      target: studentProfiles.userId,
      set: { instructorId: instructor.id },
    });

  // 4. Find all prerequisite items (PREREQ section)
  const prereqSections = await tx
    .select()
    .from(requirementSections)
    .where(eq(requirementSections.code, 'PREREQ'));

  const prereqSec = prereqSections[0];
  if (prereqSec) {
    const prereqItems = await tx
      .select()
      .from(requirementItems)
      .where(and(eq(requirementItems.sectionId, prereqSec.id), eq(requirementItems.isActive, true)));

    // Get existing requests for this course
    const existingReqs = await tx
      .select()
      .from(signoffRequests)
      .where(eq(signoffRequests.courseId, course.id));

    const studentUser = (await tx.select().from(users).where(eq(users.id, studentId)))[0];

    for (const item of prereqItems) {
      const exists = existingReqs.some((r: any) => r.itemId === item.id);
      if (!exists) {
        const newReqs = await tx
          .insert(signoffRequests)
          .values({
            courseId: course.id,
            itemId: item.id,
            attemptNumber: 1,
            status: 'PENDING',
            performedAt: new Date(),
            performedTz: 'UTC',
            studentNote: 'Automatic Prerequisite Review for assigned Mentor',
            instructorId: instructor.id,
          })
          .returning();

        // Send notification to mentor
        await tx.insert(notifications).values({
          userId: instructor.id,
          type: 'REQUEST_SUBMITTED',
          requestId: newReqs[0].id,
          body: `Prerequisite requirement "${item.title}" for mentee ${studentUser.firstName} ${studentUser.lastName} is ready for review`,
        });
      }
    }
  }

  return {
    success: true,
    mentor: {
      id: instructor.id,
      firstName: instructor.firstName,
      lastName: instructor.lastName,
      padiNumber: instructor.padiNumber,
    },
  };
}
