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

  try {
    // Check user_info table
    const { count: userCount, error: userError } = await supabase
      .from('user_info')
      .select('*', { count: 'exact', head: true });

    if (userError) throw userError;

    // Check departments
    const { count: deptCount, error: deptError } = await supabase
      .from('departments')
      .select('*', { count: 'exact', head: true });

    if (deptError) throw deptError;

    // Check projects
    const { count: projCount, error: projError } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true });

    if (projError) throw projError;

    // Check tasks
    const { count: taskCount, error: taskError } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true });

    if (taskError) throw taskError;

    //Check assignments
    const { count: assignCount, error: assignError } = await supabase
      .from('task_assignments')
      .select('*', { count: 'exact', head: true });

    if (assignError) throw assignError;

    console.log('✅ Database Status:');
    console.log(`   Users:       ${userCount}`);
    console.log(`   Departments: ${deptCount}`);
    console.log(`   Projects:    ${projCount}`);
    console.log(`   Tasks:       ${taskCount}`);
    console.log(`   Assignments: ${assignCount}`);
    console.log('');

    if (userCount === 0) {
      console.log('⚠️  Database appears empty. Run `pnpm db:seed` to populate it.');
    } else {
      console.log('✅ Database is populated and ready.');
    }

    return { userCount, deptCount, projCount, taskCount };
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
