import postgres from 'postgres';
import bcrypt from 'bcrypt';
import { createClient } from '@supabase/supabase-js';
import {
  auth_users,
  users,
  departments,
  user_departments,
  roles,
  user_roles,
  tags,
  projects,
  tasks,
  task_tags,
  notifications,
} from '../../lib/sample-data';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

/* --------------------- AUTH USERS --------------------- */
async function seedAuthUsers() {
  const results = await Promise.all(
    auth_users.map(async (u) => {
      // Check if user already exists by email
      const existingUsers = await sql`
        SELECT id, email FROM auth.users WHERE email = ${u.email}
      `;

      if (existingUsers.length > 0) {
        return { success: true, email: u.email, skipped: true, user: existingUsers[0] };
      }

      // Create user if doesn't exist using raw SQL to maintain specific UUID
      const result = await sql`
        INSERT INTO auth.users (
          id, email, encrypted_password, email_confirmed_at, created_at, updated_at,
          raw_app_meta_data, raw_user_meta_data, aud, role
        ) VALUES (
          ${u.id}, ${u.email}, crypt(${u.password}, gen_salt('bf')), NOW(), NOW(), NOW(),
          '{"provider": "email", "providers": ["email"]}', '{}', 'authenticated', 'authenticated'
        )
        RETURNING id, email
      `;

      if (result.length > 0) {
        return { success: true, email: u.email, created: true, user: result[0] };
      } else {
        return { success: false, email: u.email, error: 'Failed to create user' };
      }
    })
  );

  const created = results.filter((r) => r.success && r.created).length;
  const skipped = results.filter((r) => r.success && r.skipped).length;
  const failed = results.filter((r) => !r.success).length;

  console.log(`Auth users seeded: ${created} created, ${skipped} skipped, ${failed} failed`);
  return results;
}

/* --------------------- USER_SETTINGS (replaces old users) --------------------- */
async function seedUserSettings() {
  await Promise.all(
    users.map(
      (u) =>
        sql`
        INSERT INTO user_settings (id, first_name, last_name, mode, default_view)
        VALUES (${u.id}, ${u.first_name}, ${u.last_name}, ${u.mode}, ${u.default_view ?? 'tasks'})
        ON CONFLICT (id) DO UPDATE
          SET first_name = EXCLUDED.first_name,
              last_name  = EXCLUDED.last_name,
              mode       = EXCLUDED.mode,
              default_view = EXCLUDED.default_view
      `
    )
  );
}

/* --------------------- DEPARTMENTS --------------------- */
async function seedDepartments() {
  await sql`
    CREATE TABLE IF NOT EXISTS departments (
      id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      name VARCHAR(255) NOT NULL UNIQUE,
      parent_department_id BIGINT NULL REFERENCES departments(id) ON DELETE SET NULL,
      CONSTRAINT chk_dept_not_self CHECK (parent_department_id IS NULL OR parent_department_id <> id)
    );
  `;
  await sql`TRUNCATE TABLE departments RESTART IDENTITY CASCADE;`;

  type DeptRow = { id: number; name: string };
  const inserted = await Promise.all(
    departments.map(
      (d) => sql<DeptRow[]>`
      INSERT INTO departments (name)
      VALUES (${d.name})
      ON CONFLICT (name) DO NOTHING
      RETURNING id, name
    `
    )
  );
  const rows = inserted.flat();
  const nameToId = new Map<string, number>(rows.map((r) => [r.name, Number(r.id)]));

  const fm = nameToId.get('Finance Manager');
  const fe = nameToId.get('Finance Executive');
  if (fm && fe) {
    await sql`UPDATE departments SET parent_department_id = ${fm} WHERE id = ${fe}`;
  }
  return nameToId;
}

/* --------------------- USER_DEPARTMENTS --------------------- */
async function seedUserDepartments(nameToDeptId: Map<string, number>) {
  await sql`
    CREATE TABLE IF NOT EXISTS user_departments (
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      department_id BIGINT NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
      PRIMARY KEY (user_id, department_id)
    );
  `;
  await sql`TRUNCATE TABLE user_departments;`;

  await Promise.all(
    user_departments.map((ud) => {
      const depId = nameToDeptId.get(ud.department_name)!;
      return sql`
        INSERT INTO user_departments (user_id, department_id)
        VALUES (${ud.user_id}, ${depId})
        ON CONFLICT (user_id, department_id) DO NOTHING
      `;
    })
  );
}

/* --------------------- ROLES --------------------- */
async function seedRoles() {
  await sql`
    CREATE TABLE IF NOT EXISTS roles (
      role VARCHAR(50) PRIMARY KEY,
      CONSTRAINT roles_allowed_chk CHECK (role IN ('staff','manager','admin'))
    );
  `;
  await sql`TRUNCATE TABLE roles CASCADE;`;

  await Promise.all(
    roles.map((r) => sql`INSERT INTO roles (role) VALUES (${r.role}) ON CONFLICT (role) DO NOTHING`)
  );
}

/* --------------------- USER_ROLES --------------------- */
async function seedUserRoles(nameToDeptId: Map<string, number>) {
  await sql`
    CREATE TABLE IF NOT EXISTS user_roles (
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      role    VARCHAR(50) NOT NULL REFERENCES roles(role) ON DELETE CASCADE,
      department_id BIGINT NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
      PRIMARY KEY (user_id, role, department_id)
    );
  `;
  await sql`TRUNCATE TABLE user_roles;`;

  await Promise.all(
    user_roles.map((ur) => {
      const departmentId = ur.department_name ? nameToDeptId.get(ur.department_name) ?? null : null;
      return sql`
          INSERT INTO user_roles (user_id, role, department_id)
          VALUES (${ur.user_id}, ${ur.role}, ${departmentId})
          ON CONFLICT (user_id, role, department_id) DO NOTHING
        `;
    })
  );
}

/* --------------------- TAGS --------------------- */
async function seedTags() {
  await sql`
    CREATE TABLE IF NOT EXISTS tags (
      id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      name VARCHAR(50) NOT NULL UNIQUE
    );
  `;
  await sql`TRUNCATE TABLE tags RESTART IDENTITY CASCADE;`;

  await Promise.all(
    tags.map((t) => sql`INSERT INTO tags (name) VALUES (${t.name}) ON CONFLICT (name) DO NOTHING`)
  );
}

/* --------------------- PROJECTS --------------------- */
async function seedProjects(nameToDeptId: Map<string, number>) {
  await sql`
    CREATE TABLE IF NOT EXISTS projects (
      id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      name VARCHAR(255) NOT NULL,
      department_id BIGINT NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_project UNIQUE (name, department_id)
    );
  `;
  await sql`TRUNCATE TABLE projects RESTART IDENTITY CASCADE;`;

  type ProjRow = { id: number; name: string; department_id: number };
  const inserted = await Promise.all(
    projects.map((p) => {
      const depId = nameToDeptId.get(p.department_name)!;
      return sql<ProjRow[]>`
        INSERT INTO projects (name, department_id)
        VALUES (${p.name}, ${depId})
        ON CONFLICT (name, department_id) DO NOTHING
        RETURNING id, name, department_id
      `;
    })
  );
  const rows = inserted.flat();

  const projKeyToId = new Map<string, number>(
    rows.map((r) => [`${r.name}::${r.department_id}`, Number(r.id)])
  );

  return { projKeyToId };
}

/* --------------------- TASKS --------------------- */
async function seedTasks(deps: {
  nameToDeptId: Map<string, number>;
  projKeyToId: Map<string, number>;
}) {
  await sql`
    CREATE TABLE IF NOT EXISTS tasks (
      id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      priority VARCHAR(10) CHECK (priority IN ('Low','Medium','High')),
      status VARCHAR(15) CHECK (status IN ('To Do','In Progress','Done')),
      creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      department_id BIGINT NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
      project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
      deadline TIMESTAMPTZ,
      notes TEXT,
      parent_task_id BIGINT NULL REFERENCES tasks(id) ON DELETE RESTRICT,
      is_archived BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT chk_task_not_self CHECK (parent_task_id IS NULL OR parent_task_id <> id)
    );
  `;
  await sql`TRUNCATE TABLE tasks RESTART IDENTITY CASCADE;`;

  type TaskRet = { id: number; title: string };
  const titleToTaskId = new Map<string, number>();

  for (const t of tasks) {
    const departmentId = deps.nameToDeptId.get(t.department_name);
    if (!departmentId) throw new Error(`Unknown department: ${t.department_name}`);

    const projKey = `${t.project_name}::${departmentId}`;
    const projectId = deps.projKeyToId.get(projKey);
    if (!projectId)
      throw new Error(`Unknown project: ${t.project_name} (dept ${t.department_name})`);

    const parentId = t.parent_task_external_key
      ? titleToTaskId.get(t.parent_task_external_key) ?? null
      : null;

    const description = t.description ?? null;
    const assigneeId = t.assignee_id ?? null;
    const deadline = t.deadline ?? null;
    const notes = t.notes ?? null;
    const createdAt = t.created_at ?? new Date();
    const updatedAt = t.updated_at ?? createdAt;

    const [row] = await sql<TaskRet[]>`
      INSERT INTO tasks (
        title, description, priority, status, creator_id, assignee_id, department_id,
        project_id, deadline, notes, parent_task_id, is_archived, created_at, updated_at
      )
      VALUES (
        ${t.title}, ${description}, ${t.priority}, ${t.status}, ${t.creator_id}, ${assigneeId}, ${departmentId},
        ${projectId}, ${deadline}, ${notes}, ${parentId}, ${t.is_archived}, ${createdAt}, ${updatedAt}
      )
      RETURNING id, title
    `;

    if (!row) throw new Error('INSERT INTO tasks returned no row');
    titleToTaskId.set(row.title, row.id);
  }
}

/* --------------------- TASK_TAGS --------------------- */
async function seedTaskTags() {
  await sql`
    CREATE TABLE IF NOT EXISTS task_tags (
      task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      tag_id  BIGINT NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
      PRIMARY KEY (task_id, tag_id)
    );
  `;
  await sql`TRUNCATE TABLE task_tags;`;

  if (!task_tags.length) return;

  const taskRows = await sql`SELECT id, title FROM tasks`;
  const tagRows = await sql`SELECT id, name  FROM tags`;

  const titleToTaskId = new Map(taskRows.map((r: any) => [r.title as string, Number(r.id)]));
  const nameToTagId = new Map(tagRows.map((r: any) => [r.name as string, Number(r.id)]));

  const pairs: Array<{ task_id: number; tag_id: number }> = [];
  for (const tt of task_tags) {
    const taskId = titleToTaskId.get(tt.task_title);
    const tagId = nameToTagId.get(tt.tag_name);
    if (taskId && tagId) pairs.push({ task_id: taskId, tag_id: tagId });
  }

  if (!pairs.length) return;

  await Promise.all(
    pairs.map(
      (p) => sql`
      INSERT INTO task_tags (task_id, tag_id)
      VALUES (${p.task_id}, ${p.tag_id})
      ON CONFLICT (task_id, tag_id) DO NOTHING
    `
    )
  );
}

/* --------------------- NOTIFICATIONS --------------------- */
async function seedNotifications() {
  await sql`
    CREATE TABLE IF NOT EXISTS notifications (
      id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type VARCHAR(50) NOT NULL,
      read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await sql`TRUNCATE TABLE notifications RESTART IDENTITY CASCADE;`;

  if (!notifications.length) return;

  await Promise.all(
    notifications.map(
      (n) =>
        sql`
        INSERT INTO notifications (user_id, title, message, type, read, created_at, updated_at)
        VALUES (${n.user_id}, ${n.title}, ${n.message}, ${n.type}, ${n.read}, ${n.created_at}, ${n.updated_at})
        ON CONFLICT DO NOTHING
      `
    )
  );
}

/* --------------------- ENABLE ROW LEVEL SECURITY --------------------- */
async function enableRLS() {
  // Enable RLS on all application tables
  await sql`ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE departments ENABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE user_departments ENABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE roles ENABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE tags ENABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE projects ENABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE tasks ENABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE task_tags ENABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE notifications ENABLE ROW LEVEL SECURITY`;

  // Create basic RLS policies

  // User Settings: Users can only access their own settings
  await sql`
    CREATE POLICY "Users can view own settings" ON user_settings
    FOR SELECT USING (auth.uid() = id)
  `;

  await sql`
    CREATE POLICY "Users can update own settings" ON user_settings
    FOR UPDATE USING (auth.uid() = id)
  `;

  // Tasks: Users can see tasks in their departments
  await sql`
    CREATE POLICY "Users can view tasks in their departments" ON tasks
    FOR SELECT USING (
      department_id IN (
        SELECT department_id FROM user_departments
        WHERE user_id = auth.uid()
      )
    )
  `;

  // Projects: Users can see projects in their departments
  await sql`
    CREATE POLICY "Users can view projects in their departments" ON projects
    FOR SELECT USING (
      department_id IN (
        SELECT department_id FROM user_departments
        WHERE user_id = auth.uid()
      )
    )
  `;

  // Notifications: Users can only see their own notifications
  await sql`
    CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id)
  `;

  // Departments: Users can view departments they belong to
  await sql`
    CREATE POLICY "Users can view their departments" ON departments
    FOR SELECT USING (
      id IN (
        SELECT department_id FROM user_departments
        WHERE user_id = auth.uid()
      )
    )
  `;

  // Read-only access for roles and tags (commonly referenced)
  await sql`
    CREATE POLICY "Users can view roles" ON roles
    FOR SELECT USING (true)
  `;

  await sql`
    CREATE POLICY "Users can view tags" ON tags
    FOR SELECT USING (true)
  `;
}

/* --------------------- GET ROUTE --------------------- */
export async function GET() {
  try {
    // 1. Enable required extensions
    await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

    // 2. Create user_settings table FIRST (before auth users due to trigger)
    await sql`
      CREATE TABLE IF NOT EXISTS user_settings (
        id UUID PRIMARY KEY
          REFERENCES auth.users(id) ON DELETE CASCADE,
        first_name VARCHAR(255) NOT NULL,
        last_name  VARCHAR(255) NOT NULL,
        mode       VARCHAR(10) NOT NULL DEFAULT 'light',
        default_view VARCHAR(20) NOT NULL DEFAULT 'tasks',
        CONSTRAINT user_settings_mode_chk CHECK (mode IN ('light','dark')),
        CONSTRAINT user_settings_view_chk CHECK (default_view IN ('tasks','calendar'))
      );
    `;

    // 3. Create auth users (trigger will work since user_settings exists)
    await seedAuthUsers();

    // 4. Seed all other tables
    await sql.begin(async () => {
      await seedUserSettings(); // Update with custom data
      const nameToDeptId = await seedDepartments();
      await seedRoles();
      await seedUserRoles(nameToDeptId);
      await seedUserDepartments(nameToDeptId);
      const { projKeyToId } = await seedProjects(nameToDeptId);
      await seedTags();
      await seedTasks({ nameToDeptId, projKeyToId });
      await seedTaskTags();
      await seedNotifications();

      // Enable Row Level Security on all tables
      await enableRLS();
    });

    return Response.json({
      message: 'Database seeded successfully.',
    });
  } catch (error) {
    console.error('Seeding error:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
