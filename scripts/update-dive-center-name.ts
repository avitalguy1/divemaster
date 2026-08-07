import { db } from '@/lib/db';
import { diveCenters } from '@/lib/db/schema';
import { eq, or } from 'drizzle-orm';

async function main() {
  console.log('Updating existing dive center names to "Underwater Vision"...');
  const result = await db
    .update(diveCenters)
    .set({ name: 'Underwater Vision' })
    .returning();

  console.log(`Successfully updated ${result.length} dive center record(s) to "Underwater Vision".`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Failed to update dive center name:', err);
  process.exit(1);
});
