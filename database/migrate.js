import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dbPromise } from './connect.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.join(__dirname, 'migrations');

async function getAppliedMigrations(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  const rows = await db.all('SELECT name FROM migrations ORDER BY name');
  return new Set(rows.map(row => row.name));
}

async function runMigrations() {
  const db = await dbPromise;
  
  try {
    await db.run('BEGIN TRANSACTION');
    
    const appliedMigrations = await getAppliedMigrations(db);
    const files = await fs.readdir(migrationsDir);
    const migrationFiles = files
      .filter(file => file.endsWith('.sql') && !appliedMigrations.has(file))
      .sort();
    
    if (migrationFiles.length === 0) {
      console.log('No new migrations to run.');
      return;
    }
    
    console.log(`Found ${migrationFiles.length} new migration(s) to run.`);
    
    for (const file of migrationFiles) {
      console.log(`Running migration: ${file}`);
      const migrationPath = path.join(migrationsDir, file);
      const migrationSQL = await fs.readFile(migrationPath, 'utf8');
      
      try {
        await db.exec(migrationSQL);
        await db.run('INSERT INTO migrations (name) VALUES (?)', [file]);
        console.log(`✅ Successfully applied migration: ${file}`);
      } catch (error) {
        console.error(`❌ Error applying migration ${file}:`, error.message);
        throw error;
      }
    }
    
    await db.run('COMMIT');
    console.log('All migrations completed successfully!');
  } catch (error) {
    await db.run('ROLLBACK');
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations().catch(console.error);
}

export { runMigrations };
