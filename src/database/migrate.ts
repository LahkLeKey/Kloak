import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function runMigrations(connectionString: string): Promise<void> {
  const sql = postgres(connectionString);

  try {
    // Read schema file
    const schemaPath = join(__dirname, 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');

    // Split by semicolon and filter empty statements
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    // Execute each statement
    for (const statement of statements) {
      await sql.unsafe(statement);
    }

    console.log('✓ Database schema initialized');
  } finally {
    await sql.end();
  }
}

// If run directly, migrate the database
if (import.meta.url === `file://${process.argv[1]}`) {
  const connectionString = process.env.DATABASE_URL || 'postgresql://localhost/kloak';
  runMigrations(connectionString).catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}
