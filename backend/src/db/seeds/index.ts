import { db } from '../index.js';
import { config } from '../../config/index.js';
import { seedDemo } from './demo.js';
try {
  const result = await seedDemo(db, config.demoAccount);
  console.log(
    result.created
      ? 'Verified fictional demo account and sample portfolios created.'
      : 'Existing demo account preserved.',
  );
  if (!result.passwordMatches)
    console.warn('Existing demo password differs from DEMO_PASSWORD. Seeding does not reset it.');
} finally {
  await db.close();
}
