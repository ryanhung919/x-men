#!/usr/bin/env tsx
/**
 * Sync Schema Script
 * Extracts schema and RLS policies from app/seed/route.ts
 * and updates __tests__/setup/integration.setup.ts
 * 
 * Run: pnpm tsx scripts/sync-test-schema.ts
 */

import fs from 'fs';
import path from 'path';

const SEED_FILE = path.join(process.cwd(), 'app/seed/route.ts');
const INTEGRATION_SETUP_FILE = path.join(process.cwd(), '__tests__/setup/integration.setup.ts');

interface SchemaExtraction {
  tables: Map<string, string>;
  rlsPolicies: string[];
  triggers: string[];
  functions: string[];
}

function extractSchemaFromSeed(): SchemaExtraction {
  const seedContent = fs.readFileSync(SEED_FILE, 'utf-8');
  
  const extraction: SchemaExtraction = {
    tables: new Map(),
    rlsPolicies: [],
    triggers: [],
    functions: [],
  };

  // Extract CREATE TABLE statements
  const tableRegex = /await sql`\s*CREATE TABLE[^`]*`/gs;
  const tableMatches = seedContent.match(tableRegex);
  
  if (tableMatches) {
    tableMatches.forEach(match => {
      const tableNameMatch = match.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(\w+)/i);
      if (tableNameMatch) {
        const tableName = tableNameMatch[1];
        // Clean up the SQL
        const cleanSql = match
          .replace(/await sql`\s*/, '')
          .replace(/`$/, '')
          .trim();
        extraction.tables.set(tableName, cleanSql);
      }
    });
  }

  // Extract RLS policies (inside enableRLS function)
  const rlsSection = seedContent.match(/async function enableRLS\([\s\S]*?\n}/);
  if (rlsSection) {
    const rlsContent = rlsSection[0];
    
    // Extract CREATE POLICY statements
    const policyRegex = /await sql`\s*CREATE POLICY[^`]*`/gs;
    const policyMatches = rlsContent.match(policyRegex);
    
    if (policyMatches) {
      policyMatches.forEach(match => {
        const cleanSql = match
          .replace(/await sql`\s*/, '')
          .replace(/`$/, '')
          .trim();
        extraction.rlsPolicies.push(cleanSql);
      });
    }

    // Extract CREATE FUNCTION/RPC statements
    const functionRegex = /await sql`\s*CREATE (?:OR REPLACE )?FUNCTION[^`]*\$\$;[^`]*`/gs;
    const functionMatches = rlsContent.match(functionRegex);
    
    if (functionMatches) {
      functionMatches.forEach(match => {
        const cleanSql = match
          .replace(/await sql`\s*/, '')
          .replace(/`$/, '')
          .trim();
        extraction.functions.push(cleanSql);
      });
    }

    // Extract ALTER TABLE ENABLE RLS
    const enableRlsRegex = /await sql`\s*ALTER TABLE \w+ ENABLE ROW LEVEL SECURITY`/gs;
    const enableMatches = rlsContent.match(enableRlsRegex);
    
    if (enableMatches) {
      enableMatches.forEach(match => {
        const cleanSql = match
          .replace(/await sql`\s*/, '')
          .replace(/`$/, '')
          .trim();
        extraction.rlsPolicies.push(cleanSql);
      });
    }
  }

  // Extract triggers
  const triggerSection = seedContent.match(/async function createTriggers\([\s\S]*?\n}/);
  if (triggerSection) {
    const triggerContent = triggerSection[0];
    
    const triggerRegex = /await sql`[^`]*(?:CREATE TRIGGER|CREATE OR REPLACE FUNCTION)[^`]*`/gs;
    const triggerMatches = triggerContent.match(triggerRegex);
    
    if (triggerMatches) {
      triggerMatches.forEach(match => {
        const cleanSql = match
          .replace(/await sql`\s*/, '')
          .replace(/`$/, '')
          .trim();
        extraction.triggers.push(cleanSql);
      });
    }
  }

  return extraction;
}

function generateIntegrationSetup(extraction: SchemaExtraction): string {
  const tableOrder = [
    'departments',
    'user_info',
    'roles',
    'user_roles',
    'projects',
    'project_departments',
    'tags',
    'tasks',
    'task_assignments',
    'task_tags',
    'task_attachments',
    'task_comments',
    'notifications',
  ];

  const orderedTables = tableOrder
    .filter(name => extraction.tables.has(name))
    .map(name => ({ name, sql: extraction.tables.get(name)! }));

  return `import { beforeAll, afterAll, afterEach } from 'vitest';
import postgres from 'postgres';
import { createClient } from '@supabase/supabase-js';

// Integration test environment setup
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const POSTGRES_URL = process.env.POSTGRES_URL!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !POSTGRES_URL) {
  throw new Error('Missing required environment variables for integration tests');
}

let sql: postgres.Sql;
let supabaseAdmin: ReturnType<typeof createClient>;

beforeAll(async () => {
  console.log('🔧 Setting up integration test environment...');
  
  sql = postgres(POSTGRES_URL, { ssl: 'require' });
  supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  await seedTestDatabase(sql);
  
  console.log('✅ Integration test environment ready');
});

afterAll(async () => {
  console.log('🧹 Cleaning up integration test environment...');
  await sql.end();
  console.log('✅ Cleanup complete');
});

afterEach(async () => {
  // Optional: Clean up test data after each test
});

async function seedTestDatabase(sql: postgres.Sql) {
  const {
    auth_users,
    user_info,
    roles,
    user_roles,
    departments,
    projects,
    project_departments,
    tasks,
    tags,
    task_tags,
    task_assignments,
    task_attachments,
    task_comments,
    notifications,
  } = await import('../fixtures/database.fixtures');

  // Drop all tables in reverse order
  ${generateDropTables(tableOrder.reverse())}

  // Create auth users (mock)
  for (const user of auth_users) {
    await sql\`
      INSERT INTO auth.users (id, email)
      VALUES (\${user.id}, \${user.email})
      ON CONFLICT (id) DO NOTHING
    \`;
  }

  // Create tables and seed data
  ${generateTableCreationAndSeeding(orderedTables)}

  // Enable RLS and create policies
  await enableRLS(sql);
  
  // Create triggers
  await createTriggers(sql);
}

async function enableRLS(sql: postgres.Sql) {
  // Enable RLS on all tables
  ${generateEnableRLS(tableOrder.reverse())}

  // Create RPC functions
  ${extraction.functions.map(func => `await sql\`${func}\`;`).join('\n  ')}

  // Create policies
  ${extraction.rlsPolicies.map(policy => `await sql\`${policy}\`;`).join('\n  ')}
}

async function createTriggers(sql: postgres.Sql) {
  ${extraction.triggers.map(trigger => `await sql\`${trigger}\`;`).join('\n  ')}
}

export { sql, supabaseAdmin, SUPABASE_URL, SUPABASE_SERVICE_KEY };
`;
}

function generateDropTables(tables: string[]): string {
  return tables.map(name => 
    `await sql\`DROP TABLE IF EXISTS ${name} CASCADE\`;`
  ).join('\n  ');
}

function generateEnableRLS(tables: string[]): string {
  return tables.map(name => 
    `await sql\`ALTER TABLE ${name} ENABLE ROW LEVEL SECURITY\`;`
  ).join('\n  ');
}

function generateTableCreationAndSeeding(tables: Array<{ name: string; sql: string }>): string {
  const seedingMap: Record<string, string> = {
    departments: `
  await sql\`${tables.find(t => t.name === 'departments')?.sql}\`;
  await sql\`TRUNCATE TABLE departments RESTART IDENTITY CASCADE\`;
  
  const deptMap = new Map<number, number>();
  for (const dept of departments) {
    const [row] = await sql<{ id: number }[]>\`
      INSERT INTO departments (name)
      VALUES (\${dept.name})
      RETURNING id
    \`;
    deptMap.set(dept.id, row.id);
  }`,
    
    user_info: `
  await sql\`${tables.find(t => t.name === 'user_info')?.sql}\`;
  await sql\`TRUNCATE TABLE user_info CASCADE\`;
  
  for (const ui of user_info) {
    const actualDeptId = deptMap.get(ui.department_id)!;
    await sql\`
      INSERT INTO user_info (id, first_name, last_name, mode, default_view, department_id)
      VALUES (\${ui.id}, \${ui.first_name}, \${ui.last_name}, \${ui.mode}, \${ui.default_view}, \${actualDeptId})
    \`;
  }`,
    
    roles: `
  await sql\`${tables.find(t => t.name === 'roles')?.sql}\`;
  await sql\`TRUNCATE TABLE roles CASCADE\`;
  
  for (const r of roles) {
    await sql\`INSERT INTO roles (role) VALUES (\${r.role}) ON CONFLICT DO NOTHING\`;
  }`,
    
    // Add more tables as needed...
  };

  return tables.map(t => seedingMap[t.name] || `
  await sql\`${t.sql}\`;
  // TODO: Add seeding logic for ${t.name}
  `).join('\n\n  ');
}

function updateIntegrationSetup(newContent: string): void {
  fs.writeFileSync(INTEGRATION_SETUP_FILE, newContent, 'utf-8');
  console.log('✅ Updated integration.setup.ts');
}

function main() {
  console.log('🔄 Syncing schema from seed file to integration tests...\n');
  
  console.log('📖 Reading seed file:', SEED_FILE);
  const extraction = extractSchemaFromSeed();
  
  console.log(`✓ Extracted ${extraction.tables.size} tables`);
  console.log(`✓ Extracted ${extraction.rlsPolicies.length} RLS policies`);
  console.log(`✓ Extracted ${extraction.functions.length} functions`);
  console.log(`✓ Extracted ${extraction.triggers.length} triggers\n`);
  
  console.log('✍️  Generating integration setup file...');
  const newContent = generateIntegrationSetup(extraction);
  
  console.log('💾 Writing to:', INTEGRATION_SETUP_FILE);
  updateIntegrationSetup(newContent);
  
  console.log('\n✨ Schema sync complete!');
  console.log('\n⚠️  Note: Review the generated file and add seeding logic for any new tables');
}

main();