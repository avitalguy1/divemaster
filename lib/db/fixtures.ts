import { db } from './index';
import {
  diveCenters,
  users,
  studentProfiles,
  courses,
  signoffRequests,
  signoffScores,
  signatures,
  requirementItems,
  scoreSheetLines,
  notifications,
  auditLog,
} from './schema';
import { eq } from 'drizzle-orm';
import * as argon2 from 'argon2';

async function main() {
  console.log('Generating development fixtures...');

  // Clean existing fixture data for idempotent execution
  try {
    await db.delete(notifications);
    await db.delete(auditLog);
    await db.delete(signoffScores);
    await db.delete(signoffRequests);
    await db.delete(signatures);
    await db.delete(studentProfiles);
    await db.delete(courses);
    await db.delete(users);
    await db.delete(diveCenters);
  } catch {
    // Ignore missing tables on fresh database setup
  }

  try {
    // 1. Create Dive Center
    const centerRes = await db
      .insert(diveCenters)
      .values({
        name: 'Blue Horizon Diving',
        timezone: 'Pacific/Auckland',
      })
      .returning();
    const dcId = centerRes[0].id;
    console.log(`Created Dive Center: ${centerRes[0].name} (${dcId})`);

    // Hash passwords
    const defaultPassword = 'Password123!';
    const passwordHash = await argon2.hash(defaultPassword);

    // 2. Create Admin
    const adminRes = await db
      .insert(users)
      .values({
        diveCenterId: dcId,
        email: 'admin@example.com',
        passwordHash,
        role: 'ADMIN',
        firstName: 'Alice',
        lastName: 'Admin',
        padiNumber: 'CD-999999',
      })
      .returning();
    console.log(`Created Admin: ${adminRes[0].email}`);

    // 3. Create Instructors
    const inst1Res = await db
      .insert(users)
      .values({
        diveCenterId: dcId,
        email: 'john.instructor@example.com',
        passwordHash,
        role: 'INSTRUCTOR',
        firstName: 'John',
        lastName: 'Doe',
        padiNumber: 'MSDT-123456',
      })
      .returning();
    const inst1 = inst1Res[0];

    const inst2Res = await db
      .insert(users)
      .values({
        diveCenterId: dcId,
        email: 'jane.instructor@example.com',
        passwordHash,
        role: 'INSTRUCTOR',
        firstName: 'Jane',
        lastName: 'Smith',
        padiNumber: 'OWSI-654321',
      })
      .returning();
    const inst2 = inst2Res[0];
    console.log(`Created Instructors: ${inst1.email}, ${inst2.email}`);

    // Create a dummy signature for each instructor
    const dummyPngBytes = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    const sig1Res = await db
      .insert(signatures)
      .values({
        signerId: inst1.id,
        imageData: dummyPngBytes,
      })
      .returning();
    const sig1Id = sig1Res[0].id;

    const sig2Res = await db
      .insert(signatures)
      .values({
        signerId: inst2.id,
        imageData: dummyPngBytes,
      })
      .returning();
    const sig2Id = sig2Res[0].id;

    // 4. Create Students
    // Student 1: 0% progress
    const stu1Res = await db
      .insert(users)
      .values({
        diveCenterId: dcId,
        email: 'student0@example.com',
        passwordHash,
        role: 'STUDENT',
        firstName: 'Zach',
        lastName: 'Zero',
      })
      .returning();
    const stu1 = stu1Res[0];

    await db.insert(studentProfiles).values({
      userId: stu1.id,
      loggedDives: 40,
    });

    const course1Res = await db
      .insert(courses)
      .values({
        studentId: stu1.id,
        diveCenterId: dcId,
        status: 'ACTIVE',
      })
      .returning();
    const course1Id = course1Res[0].id;
    console.log(`Created Student 1 (0%): ${stu1.email}`);

    // Fetch catalog items for references
    const items = await db.select().from(requirementItems);
    const itemsByCode = items.reduce(
      (acc, val) => {
        acc[val.code] = val;
        return acc;
      },
      {} as Record<string, typeof items[0]>
    );

    // Student 2: ~40% progress (approx 21 units approved out of 53)
    const stu2Res = await db
      .insert(users)
      .values({
        diveCenterId: dcId,
        email: 'student40@example.com',
        passwordHash,
        role: 'STUDENT',
        firstName: 'Paul',
        lastName: 'Partial',
      })
      .returning();
    const stu2 = stu2Res[0];

    await db.insert(studentProfiles).values({
      userId: stu2.id,
      loggedDives: 45,
    });

    const course2Res = await db
      .insert(courses)
      .values({
        studentId: stu2.id,
        diveCenterId: dcId,
        status: 'ACTIVE',
      })
      .returning();
    const course2Id = course2Res[0].id;
    console.log(`Created Student 2 (~40%): ${stu2.email}`);

    // Student 3: 100% progress
    const stu3Res = await db
      .insert(users)
      .values({
        diveCenterId: dcId,
        email: 'student100@example.com',
        passwordHash,
        role: 'STUDENT',
        firstName: 'Charlie',
        lastName: 'Complete',
      })
      .returning();
    const stu3 = stu3Res[0];

    await db.insert(studentProfiles).values({
      userId: stu3.id,
      loggedDives: 65, // Must be >= 60
    });

    const course3Res = await db
      .insert(courses)
      .values({
        studentId: stu3.id,
        diveCenterId: dcId,
        status: 'ACTIVE',
      })
      .returning();
    const course3Id = course3Res[0].id;
    console.log(`Created Student 3 (100%): ${stu3.email}`);

    // Helper functions for inserting approvals
    const approveItem = async (
      courseId: string,
      itemCode: string,
      attempt: number,
      instructor: typeof inst1,
      sigId: string,
      daysAgo: number,
      extra: Partial<typeof signoffRequests.$inferInsert> = {}
    ) => {
      const item = itemsByCode[itemCode];
      if (!item) throw new Error(`Catalog item ${itemCode} not found`);

      const performedAt = new Date();
      performedAt.setDate(performedAt.getDate() - daysAgo);

      return await db.insert(signoffRequests).values({
        courseId,
        itemId: item.id,
        attemptNumber: attempt,
        status: 'APPROVED',
        performedAt,
        instructorId: instructor.id,
        decidedAt: performedAt,
        instructorNameSnapshot: `${instructor.firstName} ${instructor.lastName}`,
        instructorPadiSnapshot: instructor.padiNumber,
        signatureId: sigId,
        ...extra,
      }).returning();
    };

    // --- Add approvals for Student 2 (~40% progress) ---
    // Prerequisites (7 items)
    const prereqCodes = ['PRE_AGE', 'PRE_AOW', 'PRE_RESCUE', 'PRE_MEDICAL', 'PRE_EFR', 'PRE_SOU', 'PRE_RELEASE'];
    for (let i = 0; i < prereqCodes.length; i++) {
      await approveItem(course2Id, prereqCodes[i], 1, inst1, sig1Id, 10 + i);
    }
    // Certification Requirements (1 item)
    await approveItem(course2Id, 'CR_MLA', 1, inst1, sig1Id, 9);
    // Knowledge reviews (5 items)
    const krCodes = ['KD_EAP', 'KD_KR1', 'KD_KR2', 'KD_KR3', 'KD_KR4'];
    for (let i = 0; i < krCodes.length; i++) {
      await approveItem(course2Id, krCodes[i], 1, inst1, sig1Id, 5 + i);
    }
    // Waterskills Exercises 1-5 (5 items, scored, total points = 20)
    const wsCodes = ['WS_EX1', 'WS_EX2', 'WS_EX3', 'WS_EX4', 'WS_EX5'];
    for (let i = 0; i < wsCodes.length; i++) {
      await approveItem(course2Id, wsCodes[i], 1, inst1, sig1Id, 4, { score: 4 });
    }
    // Practical application (3 units)
    await approveItem(course2Id, 'PA_SKILL2', 1, inst1, sig1Id, 3);
    await approveItem(course2Id, 'PA_SKILL3', 1, inst1, sig1Id, 2);
    await approveItem(course2Id, 'PA_SKILL4', 1, inst1, sig1Id, 1);

    // --- Add approvals for Student 3 (100% progress) ---
    // All 53 approval units must be created and rules satisfied

    // Section 1: Prerequisites (9 active items)
    const allPrereq = ['PRE_AGE', 'PRE_AOW', 'PRE_RESCUE', 'PRE_MEDICAL', 'PRE_EFR', 'PRE_SOU', 'PRE_RELEASE', 'PRE_40_DIVES', 'PRE_FEES'];
    for (const code of allPrereq) {
      await approveItem(course3Id, code, 1, inst2, sig2Id, 30);
    }

    // Section 2: Certification Requirements (3 items)
    const allCert = ['CR_60_DIVES', 'CR_EFR_24M', 'CR_MLA'];
    for (const code of allCert) {
      await approveItem(course3Id, code, 1, inst2, sig2Id, 25);
    }

    // Section 3: Knowledge Development (11 items)
    const allKD = ['KD_EAP', 'KD_KR1', 'KD_KR2', 'KD_KR3', 'KD_KR4', 'KD_KR5', 'KD_KR6', 'KD_KR7', 'KD_KR8', 'KD_KR9'];
    for (const code of allKD) {
      await approveItem(course3Id, code, 1, inst2, sig2Id, 20);
    }
    // KD_FINAL_EXAM (EXAM scoring)
    await approveItem(course3Id, 'KD_FINAL_EXAM', 1, inst2, sig2Id, 19, {
      examPart1Score: '85.00',
      examPart2Score: '90.00',
      diveTheoryOnline: false,
    });

    // Section 4: Waterskills Exercises (6 items, Exercises 1-5 total >= 15)
    const allWS = ['WS_EX1', 'WS_EX2', 'WS_EX3', 'WS_EX4', 'WS_EX5'];
    for (const code of allWS) {
      await approveItem(course3Id, code, 1, inst2, sig2Id, 18, { score: 4 }); // 5 * 4 = 20 total points
    }
    await approveItem(course3Id, 'WS_RESCUE', 1, inst2, sig2Id, 17);

    // Section 5: Diver Skills Workshop (1 item, SCORE_SHEET scoring)
    const dswReq = await approveItem(course3Id, 'SW_SCORE_SHEET', 1, inst2, sig2Id, 16, { score: 4 });
    // Seed the 24 skill lines
    const lines = await db.select().from(scoreSheetLines).where(eq(scoreSheetLines.itemId, itemsByCode['SW_SCORE_SHEET'].id));
    for (const line of lines) {
      // Skill 7 is an underwater skill, score 5 to satisfy "at least one underwater skill must score 5"
      const scoreValue = line.lineNumber === 7 ? 5 : 4; 
      await db.insert(signoffScores).values({
        requestId: dswReq[0].id,
        lineId: line.id,
        score: scoreValue,
      });
    }

    // Section 6: Practical Application (8 units)
    // PA_SKILL1 (3 units)
    await approveItem(course3Id, 'PA_SKILL1', 1, inst2, sig2Id, 15);
    await approveItem(course3Id, 'PA_SKILL1', 2, inst2, sig2Id, 14);
    await approveItem(course3Id, 'PA_SKILL1', 3, inst2, sig2Id, 13);
    // PA_SKILL2 (2 units)
    await approveItem(course3Id, 'PA_SKILL2', 1, inst2, sig2Id, 12);
    await approveItem(course3Id, 'PA_SKILL2', 2, inst2, sig2Id, 11.5);
    // PA_SKILL3 (2 units)
    await approveItem(course3Id, 'PA_SKILL3', 1, inst2, sig2Id, 11);
    await approveItem(course3Id, 'PA_SKILL3', 2, inst2, sig2Id, 10);
    // PA_SKILL4 (1 unit)
    await approveItem(course3Id, 'PA_SKILL4', 1, inst2, sig2Id, 9);
    // PA_SKILL5 (1 unit)
    await approveItem(course3Id, 'PA_SKILL5', 1, inst2, sig2Id, 8);

    // Section 7: Divemaster Conducted Programs Workshops (6 units)
    const singleWK = ['WK_1', 'WK_2', 'WK_3', 'WK_4'];
    for (const code of singleWK) {
      await approveItem(course3Id, code, 1, inst2, sig2Id, 7);
    }
    // WK_5 (2 units)
    await approveItem(course3Id, 'WK_5', 1, inst2, sig2Id, 6);
    await approveItem(course3Id, 'WK_5', 2, inst2, sig2Id, 5);

    // Section 8: Practical Assessments (8 units, 4 items x 2 attempts each)
    const allAssess = ['AS_1', 'AS_2', 'AS_3', 'AS_4'];
    for (const code of allAssess) {
      await approveItem(course3Id, code, 1, inst2, sig2Id, 4);
      await approveItem(course3Id, code, 2, inst2, sig2Id, 3);
    }

    // Section 9: Professionalism (1 item, SCORE_SHEET scoring)
    const profReq = await approveItem(course3Id, 'PROF_EVAL', 1, inst2, sig2Id, 2, { score: 4 });
    const pLines = await db.select().from(scoreSheetLines).where(eq(scoreSheetLines.itemId, itemsByCode['PROF_EVAL'].id));
    for (const line of pLines) {
      await db.insert(signoffScores).values({
        requestId: profReq[0].id,
        lineId: line.id,
        score: 4,
      });
    }

    console.log('Approved 53 progress units for Student 3 successfully.');
    console.log('All dev fixtures generated successfully!');
  } catch (error) {
    console.error('Error seeding fixtures:', error);
    process.exit(1);
  }
}

main();
