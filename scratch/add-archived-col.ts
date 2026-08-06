import { db } from '../lib/db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Adding is_archived and updated_at columns to courses table...');
  try {
    await db.execute(sql`ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "is_archived" boolean DEFAULT false NOT NULL;`);
    await db.execute(sql`ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;`);
    console.log('Successfully added columns!');
  } catch (err) {
    console.error('Error adding columns:', err);
  }
  process.exit(0);
}

main();
