import { db } from '../index';
import {
  courses,
  users,
  studentProfiles,
  signoffRequests,
  signoffScores,
  scoreSheetLines,
} from '../schema';
import { eq } from 'drizzle-orm';
import { calculateCourseProgress } from '@/lib/progress/engine';
import { getFullCatalog } from './catalog';
import { ApiError } from '@/lib/api/handler';

export async function getCourseProgress(courseId: string, txClient?: any) {
  const tx = txClient || db;

  const courseRows = await tx.select().from(courses).where(eq(courses.id, courseId));
  const course = courseRows[0];
  if (!course) {
    throw new ApiError(404, 'COURSE_NOT_FOUND', 'Course not found');
  }

  const profileRows = await tx.select().from(studentProfiles).where(eq(studentProfiles.userId, course.studentId));
  const studentProfile = profileRows[0];

  const sectionsData = await getFullCatalog(tx);

  const allRequests = await tx.select().from(signoffRequests).where(eq(signoffRequests.courseId, courseId));
  const approvedRequests = allRequests.filter((r: any) => r.status === 'APPROVED');
  const pendingRequests = allRequests.filter((r: any) => r.status === 'PENDING' || r.status === 'DRAFT');

  const scoresRows = await tx
    .select({
      id: signoffScores.id,
      requestId: signoffScores.requestId,
      lineId: signoffScores.lineId,
      score: signoffScores.score,
      lineNumber: scoreSheetLines.lineNumber,
    })
    .from(signoffScores)
    .innerJoin(scoreSheetLines, eq(signoffScores.lineId, scoreSheetLines.id));

  const progress = calculateCourseProgress(
    sectionsData,
    approvedRequests,
    pendingRequests,
    scoresRows,
    studentProfile ? { loggedDives: studentProfile.loggedDives } : undefined
  );

  let mentor: any = null;
  if (studentProfile?.instructorId) {
    const mentorRows = await tx.select().from(users).where(eq(users.id, studentProfile.instructorId));
    if (mentorRows[0]) {
      mentor = {
        id: mentorRows[0].id,
        firstName: mentorRows[0].firstName,
        lastName: mentorRows[0].lastName,
        padiNumber: mentorRows[0].padiNumber,
      };
    }
  }

  return {
    course,
    mentor,
    progress,
  };
}

export async function getCourseItems(courseId: string, txClient?: any) {
  const tx = txClient || db;
  const catalog = await getFullCatalog(tx);
  const allRequests = await tx.select().from(signoffRequests).where(eq(signoffRequests.courseId, courseId));

  return catalog.map((sec: any) => ({
    ...sec,
    items: sec.items.map((item: any) => {
      const itemRequests = allRequests.filter((r: any) => r.itemId === item.id);
      const approved = itemRequests.filter((r: any) => r.status === 'APPROVED');
      const pending = itemRequests.filter((r: any) => r.status === 'PENDING' || r.status === 'DRAFT');

      return {
        ...item,
        approvedCount: approved.length,
        pendingCount: pending.length,
        status: approved.length >= item.requiredCount ? 'APPROVED' : pending.length > 0 ? 'PENDING' : 'NOT_STARTED',
        requests: itemRequests,
      };
    }),
  }));
}

export async function completeCourse(courseId: string, instructorId: string, txClient?: any) {
  const tx = txClient || db;

  const { progress } = await getCourseProgress(courseId, tx);

  if (!progress.isComplete) {
    const failingRules = progress.ruleEvaluations.filter((r) => !r.passed).map((r) => r.description);
    if (progress.approvedUnits < 53) {
      failingRules.unshift(`Only ${progress.approvedUnits} of 53 required units are approved`);
    }

    throw new ApiError(422, 'COURSE_INCOMPLETE', 'Course cannot be completed until all 53 units and threshold rules are satisfied', {
      failingRules,
    });
  }

  const completedAt = new Date();
  await tx
    .update(courses)
    .set({
      status: 'COMPLETE',
      completedAt,
    })
    .where(eq(courses.id, courseId));

  return { success: true, completedAt };
}
