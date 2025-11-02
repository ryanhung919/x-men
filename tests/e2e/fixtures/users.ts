/**
 * Test user credentials from seeded database
 * All passwords are: password123
 *
 * Role Hierarchy:
 * - Base role: staff (all users have this)
 * - Additional roles: manager, admin (can be added to staff users)
 */

export const testUsers = {
  // User with admin + manager + staff roles (for testing admin features)
  admin: {
    email: 'mitch.shona.2023@scis.smu.edu.sg',
    password: 'password123',
    name: 'Mitch Tiew Shona (SMU)',
    roles: ['admin', 'manager', 'staff'],
  },
  // User with admin + manager + staff roles (for testing manager features)
  manager: {
    email: 'joel.wang.2023@scis.smu.edu.sg',
    password: 'password123',
    name: 'Joel Wang (SMU)',
    roles: ['admin', 'manager', 'staff'],
  },
  // User with staff role only (for testing staff-only access)
  staff: {
    email: 'joel.wang.03@gmail.com',
    password: 'password123',
    name: 'Joel Wang (Personal)',
    roles: ['staff'],
  },
} as const;

export type UserRole = keyof typeof testUsers;
