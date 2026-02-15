import { db } from './seed-client';
import { prompts } from './schema';

const result = await db.select().from(prompts);
console.log(`✓ Found ${result.length} prompts in database`);
console.log('Sample prompt:', result[0]);
