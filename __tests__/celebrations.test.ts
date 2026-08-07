import { describe, it, expect } from 'vitest';
import { calculateCelebrationTier, evaluatePendingCelebrationBatch, TierEvaluationInput } from '../lib/celebrations/tier';

describe('Celebration Tier Engine Unit Tests', () => {
  it('returns NONE for PREREQ section approvals', () => {
    const input: TierEvaluationInput = {
      item: { id: 1, sectionId: 1, title: 'Medical Statement', requiredCount: 1 },
      section: { id: 1, code: 'PREREQ', title: 'Prerequisites' },
      progressBefore: { approvedUnits: 0, percentComplete: 0, isComplete: false },
      progressAfter: {
        approvedUnits: 1,
        percentComplete: 2,
        isComplete: false,
        sections: [{ sectionId: 1, code: 'PREREQ', title: 'Prerequisites', approvedUnits: 1, totalUnits: 1 }],
      },
    };

    expect(calculateCelebrationTier(input)).toBe('NONE');
  });

  it('returns STANDARD for a normal qualifying sign-off', () => {
    const input: TierEvaluationInput = {
      item: { id: 10, sectionId: 2, title: 'Skill 1 - Equipment Assembly', requiredCount: 1 },
      section: { id: 2, code: 'SKILLS', title: 'Skills Workshop' },
      progressBefore: { approvedUnits: 2, percentComplete: 3, isComplete: false },
      progressAfter: {
        approvedUnits: 3,
        percentComplete: 5,
        isComplete: false,
        sections: [{ sectionId: 2, code: 'SKILLS', title: 'Skills Workshop', approvedUnits: 1, totalUnits: 24 }],
      },
    };

    expect(calculateCelebrationTier(input)).toBe('STANDARD');
  });

  it('returns SECTION_COMPLETE when approval completes all units in a section', () => {
    const input: TierEvaluationInput = {
      item: { id: 5, sectionId: 3, title: 'Treading Water', requiredCount: 1 },
      section: { id: 3, code: 'WATERSKILLS', title: 'Waterskills Assessment' },
      progressBefore: { approvedUnits: 4, percentComplete: 7, isComplete: false },
      progressAfter: {
        approvedUnits: 5,
        percentComplete: 9,
        isComplete: false,
        sections: [{ sectionId: 3, code: 'WATERSKILLS', title: 'Waterskills Assessment', approvedUnits: 5, totalUnits: 5 }],
      },
    };

    expect(calculateCelebrationTier(input)).toBe('SECTION_COMPLETE');
  });

  it('returns MILESTONE when overall progress crosses 25%, 50%, or 75%', () => {
    const input: TierEvaluationInput = {
      item: { id: 15, sectionId: 2, title: 'Skill 5', requiredCount: 1 },
      section: { id: 2, code: 'SKILLS', title: 'Skills Workshop' },
      progressBefore: { approvedUnits: 13, percentComplete: 24, isComplete: false },
      progressAfter: {
        approvedUnits: 14,
        percentComplete: 26,
        isComplete: false,
        sections: [{ sectionId: 2, code: 'SKILLS', title: 'Skills Workshop', approvedUnits: 5, totalUnits: 24 }],
      },
    };

    expect(calculateCelebrationTier(input)).toBe('MILESTONE');
  });

  it('returns COURSE_COMPLETE when 53/53 units are approved AND all rules pass', () => {
    const input: TierEvaluationInput = {
      item: { id: 53, sectionId: 8, title: 'Final Exam', requiredCount: 1 },
      section: { id: 8, code: 'EXAMS', title: 'Final Exams' },
      progressBefore: { approvedUnits: 52, percentComplete: 98, isComplete: false },
      progressAfter: {
        approvedUnits: 53,
        percentComplete: 100,
        isComplete: true, // all rules pass
        sections: [{ sectionId: 8, code: 'EXAMS', title: 'Final Exams', approvedUnits: 1, totalUnits: 1 }],
      },
    };

    expect(calculateCelebrationTier(input)).toBe('COURSE_COMPLETE');
  });

  it('WITHHELDS COURSE_COMPLETE when 53/53 units are approved but a rule check FAILS', () => {
    const input: TierEvaluationInput = {
      item: { id: 53, sectionId: 8, title: 'Final Exam', requiredCount: 1 },
      section: { id: 8, code: 'EXAMS', title: 'Final Exams' },
      progressBefore: { approvedUnits: 52, percentComplete: 98, isComplete: false },
      progressAfter: {
        approvedUnits: 53,
        percentComplete: 100,
        isComplete: false, // 53/53 approved, BUT skills total score rule failed (< 82)
        sections: [{ sectionId: 8, code: 'EXAMS', title: 'Final Exams', approvedUnits: 1, totalUnits: 1 }],
      },
    };

    // Must NOT return COURSE_COMPLETE! Falls back to SECTION_COMPLETE or MILESTONE
    const tier = calculateCelebrationTier(input);
    expect(tier).not.toBe('COURSE_COMPLETE');
    expect(tier).toBe('SECTION_COMPLETE');
  });

  it('selects the single highest tier when multiple approvals are pending', () => {
    const evaluations = [
      { request: { id: 'req1', performedAt: '2026-08-01' }, tier: 'STANDARD' as const, sectionTitle: 'Skills', percentComplete: 10 },
      { request: { id: 'req2', performedAt: '2026-08-02' }, tier: 'MILESTONE' as const, sectionTitle: 'Practical', percentComplete: 50 },
      { request: { id: 'req3', performedAt: '2026-08-03' }, tier: 'SECTION_COMPLETE' as const, sectionTitle: 'Waterskills', percentComplete: 30 },
    ];

    const result = evaluatePendingCelebrationBatch(evaluations);
    expect(result.highestTier).toBe('MILESTONE');
    expect(result.primaryRequest.id).toBe('req2');
    expect(result.uncelebratedCount).toBe(3);
  });
});
