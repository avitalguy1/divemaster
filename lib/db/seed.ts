import { db } from './index';
import { requirementSections, requirementItems, scoreSheetLines, requirementRules } from './schema';
import { eq, and } from 'drizzle-orm';

async function main() {
  console.log('Seeding PADI Divemaster requirement catalog...');

  try {
    // ---------- 1. Seed Sections ----------
    const sectionsData = [
      { code: 'PREREQ', title: 'Prerequisites and Administration', sortOrder: 1 },
      { code: 'CERT_REQ', title: 'Certification Requirements', sortOrder: 2 },
      { code: 'KNOWLEDGE', title: 'Knowledge Development', sortOrder: 3 },
      { code: 'WATERSKILLS', title: 'Waterskills Exercises', sortOrder: 4 },
      { code: 'SKILLS_WS', title: 'Diver Skills Workshop', sortOrder: 5 },
      { code: 'PRACTICAL', title: 'Practical Application', sortOrder: 6 },
      { code: 'DM_PROGRAMS', title: 'Divemaster-Conducted Programs Workshops', sortOrder: 7 },
      { code: 'ASSESSMENTS', title: 'Practical Assessments', sortOrder: 8 },
      { code: 'PROFESSIONAL', title: 'Professionalism', sortOrder: 9 },
    ];

    const sectionIds: Record<string, number> = {};

    for (const sec of sectionsData) {
      const inserted = await db
        .insert(requirementSections)
        .values(sec)
        .onConflictDoUpdate({
          target: requirementSections.code,
          set: { title: sec.title, sortOrder: sec.sortOrder },
        })
        .returning();
      sectionIds[sec.code] = inserted[0].id;
    }

    console.log('Sections seeded successfully.');

    // ---------- 2. Seed Items ----------
    const itemsData = [
      // Prerequisites
      { sectionCode: 'PREREQ', code: 'PRE_AGE', title: '18 years or older', scoring: 'NONE', evidence: 'VERIFICATION', requiredCount: 1, isActive: true, sortOrder: 1 },
      { sectionCode: 'PREREQ', code: 'PRE_AOW', title: 'Advanced Open Water or qualifying diver certification', scoring: 'NONE', evidence: 'VERIFICATION', requiredCount: 1, isActive: true, sortOrder: 2 },
      { sectionCode: 'PREREQ', code: 'PRE_RESCUE', title: 'Rescue Diver or qualifying diver certification', scoring: 'NONE', evidence: 'VERIFICATION', requiredCount: 1, isActive: true, sortOrder: 3 },
      { sectionCode: 'PREREQ', code: 'PRE_MEDICAL', title: 'Medical Statement and physician\'s approval', scoring: 'NONE', evidence: 'VERIFICATION', requiredCount: 1, isActive: true, sortOrder: 4 },
      { sectionCode: 'PREREQ', code: 'PRE_EFR', title: 'EFR Primary and Secondary Care training or qualifying training', scoring: 'NONE', evidence: 'VERIFICATION', requiredCount: 1, isActive: true, sortOrder: 5 },
      { sectionCode: 'PREREQ', code: 'PRE_SOU', title: 'Statement of Understanding', scoring: 'NONE', evidence: 'VERIFICATION', requiredCount: 1, isActive: true, sortOrder: 6 },
      { sectionCode: 'PREREQ', code: 'PRE_RELEASE', title: 'Liability Release (Statement of Risks - EU)', scoring: 'NONE', evidence: 'VERIFICATION', requiredCount: 1, isActive: true, sortOrder: 7 },
      { sectionCode: 'PREREQ', code: 'PRE_40_DIVES', title: '40 logged dives', scoring: 'NONE', evidence: 'VERIFICATION', requiredCount: 1, isActive: true, sortOrder: 8 },
      { sectionCode: 'PREREQ', code: 'PRE_FEES', title: 'Course fees paid', scoring: 'NONE', evidence: 'VERIFICATION', requiredCount: 1, isActive: true, sortOrder: 9 },
      { sectionCode: 'PREREQ', code: 'PRE_PHOTOS', title: 'Two photos received', scoring: 'NONE', evidence: 'VERIFICATION', requiredCount: 1, isActive: false, sortOrder: 10 },

      // Certification Requirements
      { sectionCode: 'CERT_REQ', code: 'CR_60_DIVES', title: '60 logged dives', scoring: 'NONE', evidence: 'VERIFICATION', requiredCount: 1, isActive: true, sortOrder: 1 },
      { sectionCode: 'CERT_REQ', code: 'CR_EFR_24M', title: 'EFR Primary and Secondary Care training (current within 24 months)', scoring: 'NONE', evidence: 'VERIFICATION', requiredCount: 1, isActive: true, sortOrder: 2 },
      { sectionCode: 'CERT_REQ', code: 'CR_MLA', title: 'Read and agreed to the PADI Membership and License Agreement', scoring: 'NONE', evidence: 'VERIFICATION', requiredCount: 1, isActive: true, sortOrder: 3 },

      // Knowledge Development
      { sectionCode: 'KNOWLEDGE', code: 'KD_EAP', title: 'Emergency Assistance Plan', scoring: 'NONE', evidence: 'VERIFICATION', requiredCount: 1, isActive: true, sortOrder: 1 },
      { sectionCode: 'KNOWLEDGE', code: 'KD_KR1', title: 'Knowledge Review 1 - The Role and Characteristics of a PADI Divemaster', scoring: 'NONE', evidence: 'VERIFICATION', requiredCount: 1, isActive: true, sortOrder: 2 },
      { sectionCode: 'KNOWLEDGE', code: 'KD_KR2', title: 'Knowledge Review 2 - Supervising Diving Activities', scoring: 'NONE', evidence: 'VERIFICATION', requiredCount: 1, isActive: true, sortOrder: 3 },
      { sectionCode: 'KNOWLEDGE', code: 'KD_KR3', title: 'Knowledge Review 3 - Assisting with Student Divers', scoring: 'NONE', evidence: 'VERIFICATION', requiredCount: 1, isActive: true, sortOrder: 4 },
      { sectionCode: 'KNOWLEDGE', code: 'KD_KR4', title: 'Knowledge Review 4 - Diving Safety and Risk Management', scoring: 'NONE', evidence: 'VERIFICATION', requiredCount: 1, isActive: true, sortOrder: 5 },
      { sectionCode: 'KNOWLEDGE', code: 'KD_KR5', title: 'Knowledge Review 5 - Divemaster-Conducted Programs', scoring: 'NONE', evidence: 'VERIFICATION', requiredCount: 1, isActive: true, sortOrder: 6 },
      { sectionCode: 'KNOWLEDGE', code: 'KD_KR6', title: 'Knowledge Review 6 - Specialized Skills and Activities', scoring: 'NONE', evidence: 'VERIFICATION', requiredCount: 1, isActive: true, sortOrder: 7 },
      { sectionCode: 'KNOWLEDGE', code: 'KD_KR7', title: 'Knowledge Review 7 - The Business of Diving and Your Career', scoring: 'NONE', evidence: 'VERIFICATION', requiredCount: 1, isActive: true, sortOrder: 8 },
      { sectionCode: 'KNOWLEDGE', code: 'KD_KR8', title: 'Knowledge Review 8 - Awareness of the Dive Environment', scoring: 'NONE', evidence: 'VERIFICATION', requiredCount: 1, isActive: true, sortOrder: 9 },
      { sectionCode: 'KNOWLEDGE', code: 'KD_KR9', title: 'Knowledge Review 9 - Dive Theory Review', scoring: 'NONE', evidence: 'VERIFICATION', requiredCount: 1, isActive: true, sortOrder: 10 },
      { sectionCode: 'KNOWLEDGE', code: 'KD_FINAL_EXAM', title: 'Final Exam', description: 'Part 1 and Part 2 scores, OR Dive Theory Online completion', scoring: 'EXAM', evidence: 'VERIFICATION', requiredCount: 1, isActive: true, sortOrder: 11 },

      // Waterskills
      { sectionCode: 'WATERSKILLS', code: 'WS_EX1', title: 'Exercise 1 - 400 metre/yard swim', scoring: 'SCORE_1_5', evidence: 'PERFORMANCE', requiredCount: 1, minScore: 1, isActive: true, sortOrder: 1 },
      { sectionCode: 'WATERSKILLS', code: 'WS_EX2', title: 'Exercise 2 - 15 minute float/tread', scoring: 'SCORE_1_5', evidence: 'PERFORMANCE', requiredCount: 1, minScore: 1, isActive: true, sortOrder: 2 },
      { sectionCode: 'WATERSKILLS', code: 'WS_EX3', title: 'Exercise 3 - 800 metre/yard snorkel swim', scoring: 'SCORE_1_5', evidence: 'PERFORMANCE', requiredCount: 1, minScore: 1, isActive: true, sortOrder: 3 },
      { sectionCode: 'WATERSKILLS', code: 'WS_EX4', title: 'Exercise 4 - 100 metre/yard diver tow', scoring: 'SCORE_1_5', evidence: 'PERFORMANCE', requiredCount: 1, minScore: 1, isActive: true, sortOrder: 4 },
      { sectionCode: 'WATERSKILLS', code: 'WS_EX5', title: 'Exercise 5 - Equipment Exchange', scoring: 'SCORE_1_5', evidence: 'PERFORMANCE', requiredCount: 1, minScore: 1, isActive: true, sortOrder: 5 },
      { sectionCode: 'WATERSKILLS', code: 'WS_RESCUE', title: 'Diver Rescue (Exercise 7)', scoring: 'NONE', evidence: 'PERFORMANCE', requiredCount: 1, isActive: true, sortOrder: 6 },

      // Skills Workshop
      { sectionCode: 'SKILLS_WS', code: 'SW_SCORE_SHEET', title: 'Divemaster Skill Development Score Sheet', description: 'Demonstrate all scuba and skin diving skills, scoring at least 3 on each skill, at least 82 points total, with at least one underwater skill at 5.', scoring: 'SCORE_SHEET', evidence: 'PERFORMANCE', requiredCount: 1, minScore: 3, isActive: true, sortOrder: 1 },

      // Practical Application
      { sectionCode: 'PRACTICAL', code: 'PA_SKILL1', title: 'Skill 1 - Dive Site Set Up and Management', scoring: 'NONE', evidence: 'PERFORMANCE', requiredCount: 3, isActive: true, sortOrder: 1 },
      { sectionCode: 'PRACTICAL', code: 'PA_SKILL2', title: 'Skill 2 - Mapping Project', scoring: 'NONE', evidence: 'PERFORMANCE', requiredCount: 1, isActive: true, sortOrder: 2 },
      { sectionCode: 'PRACTICAL', code: 'PA_SKILL3', title: 'Skill 3 - Dive Briefing', scoring: 'NONE', evidence: 'PERFORMANCE', requiredCount: 2, isActive: true, sortOrder: 3 },
      { sectionCode: 'PRACTICAL', code: 'PA_SKILL4', title: 'Skill 4 - Search and Recovery Scenario', scoring: 'NONE', evidence: 'PERFORMANCE', requiredCount: 1, alternativeNote: 'OR PADI Search and Recovery Diver specialty certification', isActive: true, sortOrder: 4 },
      { sectionCode: 'PRACTICAL', code: 'PA_SKILL5', title: 'Skill 5 - Deep Dive Scenario', scoring: 'NONE', evidence: 'PERFORMANCE', requiredCount: 1, alternativeNote: 'OR PADI Deep Diver specialty certification', isActive: true, sortOrder: 5 },

      // Conducted Programs
      { sectionCode: 'DM_PROGRAMS', code: 'WK_1', title: 'Workshop 1 - ReActivate', scoring: 'NONE', evidence: 'PERFORMANCE', requiredCount: 1, isActive: true, sortOrder: 1 },
      { sectionCode: 'DM_PROGRAMS', code: 'WK_2', title: 'Workshop 2 - Advanced Snorkeling', scoring: 'NONE', evidence: 'PERFORMANCE', requiredCount: 1, isActive: true, sortOrder: 2 },
      { sectionCode: 'DM_PROGRAMS', code: 'WK_3', title: 'Workshop 3 - DSD Program in Confined Water', scoring: 'NONE', evidence: 'PERFORMANCE', requiredCount: 1, isActive: true, sortOrder: 3 },
      { sectionCode: 'DM_PROGRAMS', code: 'WK_4', title: 'Workshop 4 - DSD Program - Additional Open Water Dive', scoring: 'NONE', evidence: 'PERFORMANCE', requiredCount: 1, isActive: true, sortOrder: 4 },
      { sectionCode: 'DM_PROGRAMS', code: 'WK_5', title: 'Workshop 5 - Discover Local Diving in Open Water', scoring: 'NONE', evidence: 'PERFORMANCE', requiredCount: 2, isActive: true, sortOrder: 5 },

      // Practical Assessments
      { sectionCode: 'ASSESSMENTS', code: 'AS_1', title: 'Practical Assessment 1 - Open Water Diver Students in Confined Water', scoring: 'NONE', evidence: 'PERFORMANCE', requiredCount: 2, isActive: true, sortOrder: 1 },
      { sectionCode: 'ASSESSMENTS', code: 'AS_2', title: 'Practical Assessment 2 - Open Water Diver Students in Open Water', scoring: 'NONE', evidence: 'PERFORMANCE', requiredCount: 2, isActive: true, sortOrder: 2 },
      { sectionCode: 'ASSESSMENTS', code: 'AS_3', title: 'Practical Assessment 3 - Continuing Education Student Divers in Open Water', scoring: 'NONE', evidence: 'PERFORMANCE', requiredCount: 2, isActive: true, sortOrder: 3 },
      { sectionCode: 'ASSESSMENTS', code: 'AS_4', title: 'Practical Assessment 4 - Certified Divers in Open Water', scoring: 'NONE', evidence: 'PERFORMANCE', requiredCount: 2, isActive: true, sortOrder: 4 },

      // Professionalism
      { sectionCode: 'PROFESSIONAL', code: 'PROF_EVAL', title: 'Professionalism Evaluation', scoring: 'SCORE_SHEET', evidence: 'PERFORMANCE', requiredCount: 1, minScore: 3, isActive: true, sortOrder: 1 },
    ];

    const itemIds: Record<string, number> = {};

    for (const item of itemsData) {
      const sectionId = sectionIds[item.sectionCode];
      if (!sectionId) throw new Error(`Section ID not found for code: ${item.sectionCode}`);

      const inserted = await db
        .insert(requirementItems)
        .values({
          sectionId,
          code: item.code,
          title: item.title,
          description: item.description || null,
          scoring: item.scoring as any,
          evidence: item.evidence as any,
          requiredCount: item.requiredCount,
          minScore: item.minScore || null,
          alternativeNote: item.alternativeNote || null,
          isActive: item.isActive,
          sortOrder: item.sortOrder,
        })
        .onConflictDoUpdate({
          target: requirementItems.code,
          set: {
            sectionId,
            title: item.title,
            description: item.description || null,
            scoring: item.scoring as any,
            evidence: item.evidence as any,
            requiredCount: item.requiredCount,
            minScore: item.minScore || null,
            alternativeNote: item.alternativeNote || null,
            isActive: item.isActive,
            sortOrder: item.sortOrder,
          },
        })
        .returning();
      itemIds[item.code] = inserted[0].id;
    }

    console.log('Items seeded successfully.');

    // ---------- 3. Seed Score Sheet Lines ----------
    const skillsLines = [
      { n: 1, label: 'Equipment assembly, adjustment, preparation, donning and disassembly', uw: false, counts: true },
      { n: 2, label: 'Predive safety check (BWRAF)', uw: false, counts: true },
      { n: 3, label: 'Deep-water entry', uw: false, counts: true },
      { n: 4, label: 'Buoyancy check at surface', uw: false, counts: true },
      { n: 5, label: 'Snorkel-regulator/regulator-snorkel exchange', uw: false, counts: true },
      { n: 6, label: 'Five-point descent', uw: false, counts: true },
      { n: 7, label: 'Regulator recovery and clearing', uw: true, counts: true },
      { n: 8, label: 'Mask removal, replacement and clearing', uw: true, counts: true },
      { n: 9, label: 'Air depletion exercise and alternate air source use (stationary)', uw: true, counts: true },
      { n: 10, label: 'Alternate air source-assisted ascent', uw: true, counts: true },
      { n: 11, label: 'Free-flowing regulator breathing', uw: true, counts: true },
      { n: 12, label: 'Neutral buoyancy', uw: true, counts: true },
      { n: 13, label: 'Five-point ascent', uw: true, counts: true },
      { n: 14, label: 'Controlled Emergency Swimming Ascent', uw: true, counts: true },
      { n: 15, label: 'Hover motionless for 30 seconds', uw: true, counts: true },
      { n: 16, label: 'Underwater swim without a mask', uw: true, counts: true },
      { n: 17, label: 'Remove and replace weight system underwater', uw: true, counts: true },
      { n: 18, label: 'Remove and replace scuba unit underwater', uw: true, counts: true },
      { n: 19, label: 'Remove and replace scuba unit on the surface', uw: false, counts: true },
      { n: 20, label: 'Remove and replace weight system on the surface', uw: false, counts: true },
      { n: 21, label: 'Following relaxed breathing at the surface, remove the snorkel from the mouth, hold the breath and make a vertical, head first dive in water too deep in which to stand', uw: false, counts: true },
      { n: 22, label: 'Disconnect a low-pressure inflator', uw: true, counts: true },
      { n: 23, label: 'Re-secure a loose cylinder band', uw: true, counts: true },
      { n: 24, label: 'Perform an emergency weight drop', uw: false, counts: false },
    ];

    const swItemId = itemIds['SW_SCORE_SHEET'];
    if (!swItemId) throw new Error('SW_SCORE_SHEET item ID not found');

    for (const line of skillsLines) {
      await db
        .insert(scoreSheetLines)
        .values({
          itemId: swItemId,
          lineNumber: line.n,
          label: line.label,
          isUnderwater: line.uw,
          countsTowardTotal: line.counts,
          minScore: 3,
        })
        .onConflictDoUpdate({
          target: [scoreSheetLines.itemId, scoreSheetLines.lineNumber],
          set: {
            label: line.label,
            isUnderwater: line.uw,
            countsTowardTotal: line.counts,
            minScore: 3,
          },
        });
    }

    const profLines = [
      'Level of active, positive participation in the training sessions',
      'Ability to serve as a mentor to student divers',
      'Willingness to follow directions',
      'Positive attitude and demeanor toward student divers, divers and staff',
      'Positive attitude and practice towards caring for the environment',
      'General understanding of a divemaster\'s role',
      'Appearance',
    ];

    const profItemId = itemIds['PROF_EVAL'];
    if (!profItemId) throw new Error('PROF_EVAL item ID not found');

    for (let i = 0; i < profLines.length; i++) {
      const label = profLines[i];
      await db
        .insert(scoreSheetLines)
        .values({
          itemId: profItemId,
          lineNumber: i + 1,
          label,
          isUnderwater: false,
          countsTowardTotal: true,
          minScore: 3,
        })
        .onConflictDoUpdate({
          target: [scoreSheetLines.itemId, scoreSheetLines.lineNumber],
          set: {
            label,
            isUnderwater: false,
            countsTowardTotal: true,
            minScore: 3,
          },
        });
    }

    console.log('Score sheet lines seeded successfully.');

    // ---------- 4. Seed Rules ----------
    // To ensure idempotency and prevent duplicate accumulation, we safely clear and re-insert the static catalog rules.
    await db.delete(requirementRules);

    const rulesData = [
      // Waterskills Exercises 1-5 total >= 15
      { sectionId: sectionIds['WATERSKILLS'], itemId: null, ruleType: 'MIN_TOTAL', threshold: 15, message: 'Waterskills Exercises 1-5 must total at least 15 points' },
      
      // Skills Workshop rules
      { sectionId: null, itemId: itemIds['SW_SCORE_SHEET'], ruleType: 'MIN_TOTAL', threshold: 82, message: 'Skills 1-23 must total at least 82 points' },
      { sectionId: null, itemId: itemIds['SW_SCORE_SHEET'], ruleType: 'MIN_PER_LINE', threshold: 3, message: 'Every skill must score at least 3' },
      { sectionId: null, itemId: itemIds['SW_SCORE_SHEET'], ruleType: 'MIN_ONE_UNDERWATER_5', threshold: 5, message: 'At least one underwater skill must score 5' },

      // Logged dive rules
      { sectionId: null, itemId: itemIds['PRE_40_DIVES'], ruleType: 'MIN_LOGGED_DIVES', threshold: 40, message: 'Student must have at least 40 logged dives' },
      { sectionId: null, itemId: itemIds['CR_60_DIVES'], ruleType: 'MIN_LOGGED_DIVES', threshold: 60, message: 'Student must have at least 60 logged dives' },
    ];

    for (const rule of rulesData) {
      await db.insert(requirementRules).values({
        sectionId: rule.sectionId,
        itemId: rule.itemId,
        ruleType: rule.ruleType,
        threshold: rule.threshold,
        message: rule.message,
      });
    }

    console.log('Requirement rules seeded successfully.');
    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Error during catalog seeding:', error);
    process.exit(1);
  }
}

main();
