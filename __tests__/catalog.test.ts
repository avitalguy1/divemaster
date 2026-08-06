import { describe, it, expect } from 'vitest';
import { db } from '../lib/db';
import { requirementSections, requirementItems } from '../lib/db/schema';
import { eq, sum, sql } from 'drizzle-orm';

describe('Catalog Integrity Test', () => {
  it('should have SUM(required_count) over active items equal to 53', async () => {
    const res = await db
      .select({
        total: sum(requirementItems.requiredCount),
      })
      .from(requirementItems)
      .where(eq(requirementItems.isActive, true));

    const total = Number(res[0].total);
    expect(total).toBe(53);
  });

  it('should match per-section unit totals with SPEC.md section 4', async () => {
    const expectedTotals: Record<string, number> = {
      PREREQ: 9,
      CERT_REQ: 3,
      KNOWLEDGE: 11,
      WATERSKILLS: 6,
      SKILLS_WS: 1,
      PRACTICAL: 8,
      DM_PROGRAMS: 6,
      ASSESSMENTS: 8,
      PROFESSIONAL: 1,
    };

    const sections = await db.select().from(requirementSections);

    for (const sec of sections) {
      const res = await db
        .select({
          sectionTotal: sum(requirementItems.requiredCount),
        })
        .from(requirementItems)
        .where(
          sql`${requirementItems.sectionId} = ${sec.id} AND ${requirementItems.isActive} = true`
        );

      const sectionTotal = Number(res[0].sectionTotal);
      expect(sectionTotal, `Mismatch in section ${sec.code}`).toBe(expectedTotals[sec.code]);
    }
  });
});
