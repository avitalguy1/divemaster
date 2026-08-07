import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '../lib/db';
import { users, courses, studentProfiles, signoffRequests, requirementSections, requirementItems } from '../lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { assignMentorToCourse } from '../lib/db/queries/mentor';
import { getCourseProgress } from '../lib/db/queries/courses';

describe('Mentor Assignment & Prerequisites Domain Rules Test', () => {
  let studentUser: any;
  let instructorUser: any;
  let studentCourse: any;

  beforeAll(async () => {
    studentUser = (await db.select().from(users).where(eq(users.email, 'student0@example.com')))[0];
    instructorUser = (await db.select().from(users).where(eq(users.role, 'INSTRUCTOR')))[0];
    studentCourse = (await db.select().from(courses).where(eq(courses.studentId, studentUser.id)))[0];

    // Clean up signoff requests for this student course to test clean mentor assignment
    await db.delete(signoffRequests).where(eq(signoffRequests.courseId, studentCourse.id));
  });

  it('should assign a mentor instructor to a student and automatically populate prerequisite items into mentor inbox', async () => {
    const result = await assignMentorToCourse(studentUser.id, studentUser.diveCenterId, instructorUser.id);
    expect(result.success).toBe(true);
    expect(result.mentor.id).toBe(instructorUser.id);

    // Check studentProfiles.instructorId is updated
    const profile = (await db.select().from(studentProfiles).where(eq(studentProfiles.userId, studentUser.id)))[0];
    expect(profile?.instructorId).toBe(instructorUser.id);

    // Check prerequisite items are created as PENDING in mentor inbox
    const prereqSec = (await db.select().from(requirementSections).where(eq(requirementSections.code, 'PREREQ')))[0];
    const prereqItems = await db
      .select()
      .from(requirementItems)
      .where(eq(requirementItems.sectionId, prereqSec.id));

    expect(prereqItems.length).toBeGreaterThan(0);

    const reqs = await db
      .select()
      .from(signoffRequests)
      .where(and(eq(signoffRequests.courseId, studentCourse.id), eq(signoffRequests.instructorId, instructorUser.id)));

    expect(reqs.length).toBeGreaterThan(0);

    // Verify course progress returns mentor info
    const { mentor } = await getCourseProgress(studentCourse.id);
    expect(mentor).toBeDefined();
    expect(mentor.id).toBe(instructorUser.id);
  });
});
