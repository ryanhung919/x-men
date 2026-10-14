/**
 * Test users for e2e tests: fictional demo personas from lib/sample-data.ts.
 * Passwords are read from DEMO_PASSWORD (the same env var the seed uses),
 * never hardcoded.
 *
 * Role Hierarchy:
 * - Base role: staff (all users have this)
 * - Additional roles: manager, admin (can be added to staff users)
 */
import 'dotenv/config';
import { personas } from '../../../lib/sample-data';

const demoPassword = process.env.DEMO_PASSWORD ?? '';

export const testUsers = {
  // User with admin + manager + staff roles (for testing admin features)
  admin: {
    email: personas.priya.email,
    password: demoPassword,
    name: 'Priya Nair',
    roles: ['admin', 'manager', 'staff'],
  },
  // User with admin + manager + staff roles (for testing manager features)
  manager: {
    email: personas.daniel.email,
    password: demoPassword,
    name: 'Daniel Tan',
    roles: ['admin', 'manager', 'staff'],
  },
  // User with staff role only (for testing staff-only access)
  staff: {
    email: personas.hannah.email,
    password: demoPassword,
    name: 'Hannah Lee',
    roles: ['staff'],
  },
} as const;

export type UserRole = keyof typeof testUsers;
