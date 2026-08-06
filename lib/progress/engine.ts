export interface RuleEvaluation {
  ruleId: number;
  code: string;
  description: string;
  passed: boolean;
  actualValue?: any;
  targetValue?: any;
}

export interface ProgressSummary {
  totalUnits: number;
  approvedUnits: number;
  pendingUnits: number;
  notStartedUnits: number;
  percentComplete: number;
  isComplete: boolean;
  sections: {
    sectionId: number;
    code: string;
    title: string;
    totalUnits: number;
    approvedUnits: number;
    pendingUnits: number;
  }[];
  ruleEvaluations: RuleEvaluation[];
}

export function calculateCourseProgress(
  sectionsData: any[],
  approvedRequests: any[],
  pendingRequests: any[],
  scoreSheetScores: any[],
  studentProfile?: { loggedDives: number }
): ProgressSummary {
  const TOTAL_CATALOG_UNITS = 53;

  let approvedUnits = 0;
  let pendingUnits = 0;

  const sectionSummaries = sectionsData.map((sec) => {
    let secTotalUnits = 0;
    let secApprovedUnits = 0;
    let secPendingUnits = 0;

    for (const item of sec.items) {
      secTotalUnits += item.requiredCount;

      const itemApproved = approvedRequests.filter((r) => r.itemId === item.id).length;
      const itemPending = pendingRequests.filter((r) => r.itemId === item.id).length;

      secApprovedUnits += Math.min(itemApproved, item.requiredCount);
      const remainingCapacity = Math.max(0, item.requiredCount - itemApproved);
      secPendingUnits += Math.min(itemPending, remainingCapacity);
    }

    approvedUnits += secApprovedUnits;
    pendingUnits += secPendingUnits;

    return {
      sectionId: sec.id,
      code: sec.code,
      title: sec.title,
      totalUnits: secTotalUnits,
      approvedUnits: secApprovedUnits,
      pendingUnits: secPendingUnits,
    };
  });

  const notStartedUnits = Math.max(0, TOTAL_CATALOG_UNITS - (approvedUnits + pendingUnits));
  const percentComplete = Math.min(100, Math.round((approvedUnits / TOTAL_CATALOG_UNITS) * 100));

  // Evaluate Rules
  const ruleEvaluations: RuleEvaluation[] = [];

  // 1. Waterskills exercises 1-5 total >= 15
  const waterskillsReqs = approvedRequests.filter((r) => {
    const sec = sectionsData.find((s) => s.code === 'WATERSKILLS');
    return sec?.items.some((i: any) => i.id === r.itemId && i.code !== 'WS_RESCUE');
  });
  const waterskillsTotal = waterskillsReqs.reduce((acc, r) => acc + (Number(r.score) || 0), 0);

  ruleEvaluations.push({
    ruleId: 1,
    code: 'WATERSKILLS_MIN_15',
    description: 'Waterskills exercises 1–5 total score must be at least 15',
    passed: waterskillsReqs.length >= 5 && waterskillsTotal >= 15,
    actualValue: waterskillsTotal,
    targetValue: 15,
  });

  // 2. Skill Workshop Skills 1-23 total >= 82
  const skillWorkshopReq = approvedRequests.find((r) => {
    const sec = sectionsData.find((s) => s.code === 'SKILLS_WS');
    return sec?.items.some((i: any) => i.id === r.itemId);
  });

  const wsScores = skillWorkshopReq ? scoreSheetScores.filter((s) => s.requestId === skillWorkshopReq.id) : [];
  // Exclude skill 24 (lineNumber 24)
  const skills1To23Scores = wsScores.filter((s) => s.lineNumber >= 1 && s.lineNumber <= 23);
  const skills1To23Total = skills1To23Scores.reduce((acc, s) => acc + (Number(s.score) || 0), 0);

  ruleEvaluations.push({
    ruleId: 2,
    code: 'SKILL_WS_MIN_82',
    description: 'Diver Skills 1–23 total score must be at least 82',
    passed: skills1To23Scores.length === 23 && skills1To23Total >= 82,
    actualValue: skills1To23Total,
    targetValue: 82,
  });

  // 3. Every skill in Skills Workshop >= 3
  const allWsScoresMin3 = wsScores.length === 24 && wsScores.every((s) => Number(s.score) >= 3);
  ruleEvaluations.push({
    ruleId: 3,
    code: 'SKILL_WS_MIN_3_EACH',
    description: 'Every skill in Diver Skills Workshop (1–24) must score at least 3',
    passed: allWsScoresMin3,
    actualValue: wsScores.map((s) => s.score),
    targetValue: 3,
  });

  // 4. At least one underwater skill scored 5
  // Underwater skills: lineNumbers 7..18, 22, 23
  const underwaterLineNumbers = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 22, 23];
  const hasUnderwater5 = wsScores.some(
    (s) => underwaterLineNumbers.includes(s.lineNumber) && Number(s.score) === 5
  );

  ruleEvaluations.push({
    ruleId: 4,
    code: 'SKILL_WS_UNDERWATER_5',
    description: 'At least one underwater skill must score 5',
    passed: hasUnderwater5,
    actualValue: hasUnderwater5 ? 'Found 5' : 'None',
    targetValue: 5,
  });

  // 5. Professionalism lines 1-7 >= 3 each
  const profReq = approvedRequests.find((r) => {
    const sec = sectionsData.find((s) => s.code === 'PROFESSIONAL');
    return sec?.items.some((i: any) => i.id === r.itemId);
  });
  const profScores = profReq ? scoreSheetScores.filter((s) => s.requestId === profReq.id) : [];
  const profMin3 = profScores.length === 7 && profScores.every((s) => Number(s.score) >= 3);

  ruleEvaluations.push({
    ruleId: 5,
    code: 'PROFESSIONAL_MIN_3_EACH',
    description: 'Every Professionalism criterion must score at least 3',
    passed: profMin3,
    actualValue: profScores.map((s) => s.score),
    targetValue: 3,
  });

  // 6. Logged Dives >= 60 for Certification
  const loggedDives = studentProfile?.loggedDives || 0;
  ruleEvaluations.push({
    ruleId: 6,
    code: 'LOGGED_DIVES_60',
    description: 'Must have at least 60 logged dives for certification',
    passed: loggedDives >= 60,
    actualValue: loggedDives,
    targetValue: 60,
  });

  const allRulesPassed = ruleEvaluations.every((r) => r.passed);
  const isComplete = approvedUnits === TOTAL_CATALOG_UNITS && allRulesPassed;

  return {
    totalUnits: TOTAL_CATALOG_UNITS,
    approvedUnits,
    pendingUnits,
    notStartedUnits,
    percentComplete,
    isComplete,
    sections: sectionSummaries,
    ruleEvaluations,
  };
}
