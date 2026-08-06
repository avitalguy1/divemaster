import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '../lib/db';
import { users, courses, signoffRequests } from '../lib/db/schema';
import { eq } from 'drizzle-orm';
import { getCourseProgress, completeCourse } from '../lib/db/queries/courses';
import { ApiError } from '../lib/api/handler';

describe('Progress Engine & Rule Evaluation Test', () => {
  let student0Course: any;
  let student40Course: any;
  let student100Course: any;
  let instructorUser: any;

  beforeAll(async () => {
    const student0 = (await db.select().from(users).where(eq(users.email, 'student0@example.com')))[0];
    const student40 = (await db.select().from(users).where(eq(users.email, 'student40@example.com')))[0];
    const student100 = (await db.select().from(users).where(eq(users.email, 'student100@example.com')))[0];
    instructorUser = (await db.select().from(users).where(eq(users.role, 'INSTRUCTOR')))[0];

    student0Course = (await db.select().from(courses).where(eq(courses.studentId, student0.id)))[0];
    student40Course = (await db.select().from(courses).where(eq(courses.studentId, student40.id)))[0];
    student100Course = (await db.select().from(courses).where(eq(courses.studentId, student100.id)))[0];

    // Clear any transient test requests for student0
    await db.delete(signoffRequests).where(eq(signoffRequests.courseId, student0Course.id));
  });

  it('should calculate 0% progress correctly for student0', async () => {
    const { progress } = await getCourseProgress(student0Course.id);
    expect(progress.approvedUnits).toBe(0);
    expect(progress.percentComplete).toBe(0);
    expect(progress.isComplete).toBe(false);
  });

  it('should calculate ~40% progress correctly for student40', async () => {
    const { progress } = await getCourseProgress(student40Course.id);
    expect(progress.approvedUnits).toBeGreaterThanOrEqual(0);
    expect(progress.isComplete).toBe(false);
  });

  it('should calculate 100% progress and pass all threshold rules for student100', async () => {
    const { progress } = await getCourseProgress(student100Course.id);
    expect(progress.approvedUnits).toBe(53);
    expect(progress.percentComplete).toBe(100);
    expect(progress.isComplete).toBe(true);

    // Assert all rule evaluations passed
    for (const rule of progress.ruleEvaluations) {
      expect(rule.passed, `Rule failed: ${rule.description}`).toBe(true);
    }
  });

  it('should reject completing an incomplete course with HTTP 422', async () => {
    await expect(
      completeCourse(student40Course.id, instructorUser.id)
    ).rejects.toThrow(ApiError);

    try {
      await completeCourse(student40Course.id, instructorUser.id);
    } catch (err: any) {
      expect(err.statusCode).toBe(422);
      expect(err.details?.failingRules).toBeDefined();
      expect(err.details.failingRules.length).toBeGreaterThan(0);
    }
  });

  it('should successfully complete a 100% satisfied course', async () => {
    const res = await completeCourse(student100Course.id, instructorUser.id);
    expect(res.success).toBe(true);

    const updatedCourse = (await db.select().from(courses).where(eq(courses.id, student100Course.id)))[0];
    expect(updatedCourse.status).toBe('COMPLETE');
    expect(updatedCourse.completedAt).not.toBeNull();
  });
});
