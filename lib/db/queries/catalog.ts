import { db } from '../index';
import { requirementSections, requirementItems, scoreSheetLines, requirementRules } from '../schema';
import { eq, asc } from 'drizzle-orm';

export async function getFullCatalog(txClient?: any) {
  const client = txClient || db;

  const sections = await client
    .select()
    .from(requirementSections)
    .orderBy(asc(requirementSections.sortOrder));

  const items = await client
    .select()
    .from(requirementItems)
    .where(eq(requirementItems.isActive, true))
    .orderBy(asc(requirementItems.sortOrder));

  const lines = await client
    .select()
    .from(scoreSheetLines)
    .orderBy(asc(scoreSheetLines.lineNumber));

  const rules = await client
    .select()
    .from(requirementRules);

  return sections.map((sec: any) => {
    const secItems = items
      .filter((item: any) => item.sectionId === sec.id)
      .map((item: any) => {
        const itemLines = lines.filter((line: any) => line.itemId === item.id);
        const itemRules = rules.filter((rule: any) => rule.itemId === item.id);
        return {
          ...item,
          lines: itemLines,
          rules: itemRules,
        };
      });

    const secRules = rules.filter((rule: any) => rule.sectionId === sec.id);

    return {
      ...sec,
      items: secItems,
      rules: secRules,
    };
  });
}
