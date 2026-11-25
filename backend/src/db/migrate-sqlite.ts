import { db } from './index.js';
import { importSqlite } from './sqlite-import.js';
const sourcePath = process.env['SQLITE_SOURCE_PATH'];
try {
  if (!sourcePath || db.kind !== 'postgres')
    throw new Error('Set SQLITE_SOURCE_PATH and a private PostgreSQL DATABASE_URL.');
  const counts = await importSqlite(sourcePath, db);
  console.log('Import committed; table counts:', counts);
  console.log('Verify login and holdings before changing the live service.');
} finally {
  await db.close();
}
