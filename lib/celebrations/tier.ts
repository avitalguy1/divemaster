export type CelebrationTier = 'NONE' | 'STANDARD' | 'SECTION_COMPLETE' | 'MILESTONE' | 'COURSE_COMPLETE';

export interface TierEvaluationInput {
  item: {
    id: number;
    sectionId: number;
    title: string;
    requiredCount: number;
  };
  section: {
    id: number;
    code: string;
    title: string;
  };
  // Progress state after this approval
  progressAfter: {
    approvedUnits: number;
    percentComplete: number;
    isComplete: boolean;
    sections: Array<{
      sectionId: number;
      code: string;
      title: string;
      approvedUnits: number;
      totalUnits: number;
    }>;
  };
  // Progress state before this approval
  progressBefore: {
    approvedUnits: number;
    percentComplete: number;
    isComplete: boolean;
  };
}

export function calculateCelebrationTier(input: TierEvaluationInput): CelebrationTier {
  const { item, section, progressAfter, progressBefore } = input;

  // Rule 1: Exclude PREREQ (Prerequisites and Administration paperwork)
  if (section.code === 'PREREQ') {
    return 'NONE';
  }

  // Rule 2: COURSE_COMPLETE requires 53/53 approved units AND all requirement_rules passing
  if (progressAfter.approvedUnits === 53 && progressAfter.isComplete) {
    return 'COURSE_COMPLETE';
  }

  // Rule 3: MILESTONE — overall progress crossed 25%, 50%, or 75%
  const milestones = [25, 50, 75];
  const beforePct = progressBefore.percentComplete;
  const afterPct = progressAfter.percentComplete;

  const crossedMilestone = milestones.some(
    (m) => beforePct < m && afterPct >= m
  );

  if (crossedMilestone) {
    return 'MILESTONE';
  }

  // Rule 4: SECTION_COMPLETE — approval completed every unit in its section
  const targetSecData = progressAfter.sections.find((s) => s.sectionId === section.id);
  if (targetSecData && targetSecData.approvedUnits >= targetSecData.totalUnits && targetSecData.totalUnits > 0) {
    return 'SECTION_COMPLETE';
  }

  // Rule 5: STANDARD qualifying approval
  return 'STANDARD';
}

export interface CelebrationBatchResult {
  highestTier: CelebrationTier;
  primaryRequest: any | null;
  uncelebratedCount: number;
  sectionName?: string;
  milestonePercent?: number;
}

const TIER_PRIORITY: Record<CelebrationTier, number> = {
  COURSE_COMPLETE: 4,
  MILESTONE: 3,
  SECTION_COMPLETE: 2,
  STANDARD: 1,
  NONE: 0,
};

export function evaluatePendingCelebrationBatch(
  evaluations: Array<{ request: any; tier: CelebrationTier; sectionTitle: string; percentComplete: number }>
): CelebrationBatchResult {
  const valid = evaluations.filter((e) => e.tier !== 'NONE');

  if (valid.length === 0) {
    return {
      highestTier: 'NONE',
      primaryRequest: null,
      uncelebratedCount: 0,
    };
  }

  // Sort by tier priority descending, then by performedAt oldest first
  valid.sort((a, b) => {
    const pA = TIER_PRIORITY[a.tier];
    const pB = TIER_PRIORITY[b.tier];
    if (pB !== pA) return pB - pA;
    return new Date(a.request.performedAt).getTime() - new Date(b.request.performedAt).getTime();
  });

  const top = valid[0];

  return {
    highestTier: top.tier,
    primaryRequest: top.request,
    uncelebratedCount: valid.length,
    sectionName: top.sectionTitle,
    milestonePercent: top.percentComplete,
  };
}
