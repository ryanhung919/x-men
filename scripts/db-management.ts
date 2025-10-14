#!/usr/bin/env tsx

/**
 * Database Management Script
 * Provides utilities for seeding and resetting the database
 *
 * Usage:
 *   pnpm db:seed     - Seed the database
 *   pnpm db:reset    - Reset and reseed the database
 *   pnpm db:status   - Check database status
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkDatabaseStatus() {
  console.log('Checking database status...\n');

  // Use label as key for both display and object
  const tables = [
    { key: 'Users', table: 'user_info' },
    { key: 'Departments', table: 'departments' },
    { key: 'Notifications', table: 'notifications' },
    { key: 'Project-Departments', table: 'project_departments' },
    { key: 'Projects', table: 'projects' },
    { key: 'Roles', table: 'roles' },
    { key: 'Tags', table: 'tags' },
    { key: 'Task-Assignments', table: 'task_assignments' },
    { key: 'Task-Attachments', table: 'task_attachments' },
    { key: 'Task-Comments', table: 'task_comments' },
    { key: 'Task-Tags', table: 'task_tags' },
    { key: 'Tasks', table: 'tasks' },
    { key: 'User-Info', table: 'user_info' },
    { key: 'User-Roles', table: 'user_roles' }
  ];

  try {
    const results = await Promise.all(
      tables.map(({ table }) =>
        supabase.from(table).select('*', { count: 'exact', head: true })
      )
    );

    let status: Record<string, number> = {};
    results.forEach((result, i) => {
      const { key } = tables[i];
      if (result.error) throw result.error;
      status[key] = result.count ?? 0;
      console.log(`   ${key}: ${status[key]}`);
    });

    console.log('');

    if (status['Users'] === 0) {
      console.log('⚠️  Database appears empty. Run `pnpm db:seed` to populate it.');
    } else {
      console.log('✅ Database is populated and ready.');
    }

    return status;
  } catch (error) {
    console.error('❌ Error checking database:', error);
    throw error;
  }
}

async function seedDatabase() {
  console.log('Seeding database...\n');

  try {
    const appUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const response = await fetch(`${appUrl}/seed`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Seed failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅', result.message || 'Database seeded successfully');
    console.log('');

    // Show status after seeding
    await checkDatabaseStatus();
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

async function resetDatabase() {
  console.log('🔄 Resetting database...\n');

  try {
    // Call seed endpoint which includes teardown
    await seedDatabase();
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    throw error;
  }
}

async function main() {
  const command = process.argv[2];

  // Verify environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL is not set');
    process.exit(1);
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY is not set');
    process.exit(1);
  }

  try {
    switch (command) {
      case 'status':
        await checkDatabaseStatus();
        break;
      case 'seed':
        await seedDatabase();
        break;
      case 'reset':
        await resetDatabase();
        break;
      default:
        console.log('Usage:');
        console.log('  pnpm db:status  - Check database status');
        console.log('  pnpm db:seed    - Seed the database');
        console.log('  pnpm db:reset   - Reset and reseed the database');
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Command failed:', error);
    process.exit(1);
  }
}

main();
