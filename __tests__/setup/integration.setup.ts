import { beforeAll, afterAll, afterEach } from 'vitest';
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
  
  // Initialize postgres client
  sql = postgres(POSTGRES_URL, { ssl: 'require' });
  
  // Initialize Supabase admin client
  supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  // Seed test database
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
  // You can add cleanup logic here if needed
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

  // Drop all tables
  await sql`DROP TABLE IF EXISTS task_comments CASCADE`;
  await sql`DROP TABLE IF EXISTS task_assignments CASCADE`;
  await sql`DROP TABLE IF EXISTS task_tags CASCADE`;
  await sql`DROP TABLE IF EXISTS task_attachments CASCADE`;
  await sql`DROP TABLE IF EXISTS tasks CASCADE`;
  await sql`DROP TABLE IF EXISTS project_departments CASCADE`;
  await sql`DROP TABLE IF EXISTS projects CASCADE`;
  await sql`DROP TABLE IF EXISTS notifications CASCADE`;
  await sql`DROP TABLE IF EXISTS tags CASCADE`;
  await sql`DROP TABLE IF EXISTS user_roles CASCADE`;
  await sql`DROP TABLE IF EXISTS roles CASCADE`;
  await sql`DROP TABLE IF EXISTS user_info CASCADE`;
  await sql`DROP TABLE IF EXISTS departments CASCADE`;

  // Create auth users (mock)
  for (const user of auth_users) {
    await sql`
      INSERT INTO auth.users (id, email)
      VALUES (${user.id}, ${user.email})
      ON CONFLICT (id) DO NOTHING
    `;
  }

  // Create departments
  await sql`
    CREATE TABLE IF NOT EXISTS departments (
      id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      name VARCHAR(255) NOT NULL UNIQUE
    )
  `;
  
  await sql`TRUNCATE TABLE departments RESTART IDENTITY CASCADE`;
  
  const deptMap = new Map<number, number>();
  for (const dept of departments) {
    const [row] = await sql<{ id: number }[]>`
      INSERT INTO departments (name)
      VALUES (${dept.name})
      RETURNING id
    `;
    deptMap.set(dept.id, row.id);
  }

  // Create user_info
  await sql`
    CREATE TABLE IF NOT EXISTS user_info (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      first_name VARCHAR(255) NOT NULL,
      last_name VARCHAR(255) NOT NULL,
      mode VARCHAR(10) NOT NULL DEFAULT 'light',
      default_view VARCHAR(20) NOT NULL DEFAULT 'tasks',
      department_id BIGINT NOT NULL REFERENCES departments(id) ON DELETE RESTRICT
    )
  `;
  
  await sql`TRUNCATE TABLE user_info CASCADE`;
  
  for (const ui of user_info) {
    const actualDeptId = deptMap.get(ui.department_id)!;
    await sql`
      INSERT INTO user_info (id, first_name, last_name, mode, default_view, department_id)
      VALUES (${ui.id}, ${ui.first_name}, ${ui.last_name}, ${ui.mode}, ${ui.default_view}, ${actualDeptId})
    `;
  }

  // Create roles
  await sql`
    CREATE TABLE IF NOT EXISTS roles (
      role VARCHAR(50) PRIMARY KEY,
      CONSTRAINT roles_allowed_chk CHECK (role IN ('staff','manager','admin'))
    )
  `;
  
  await sql`TRUNCATE TABLE roles CASCADE`;
  
  for (const r of roles) {
    await sql`INSERT INTO roles (role) VALUES (${r.role}) ON CONFLICT DO NOTHING`;
  }

  // Create user_roles
  await sql`
    CREATE TABLE IF NOT EXISTS user_roles (
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      role VARCHAR(50) NOT NULL REFERENCES roles(role) ON DELETE CASCADE,
      PRIMARY KEY (user_id, role)
    )
  `;
  
  await sql`TRUNCATE TABLE user_roles`;
  
  for (const ur of user_roles) {
    await sql`
      INSERT INTO user_roles (user_id, role)
      VALUES (${ur.user_id}, ${ur.role})
    `;
  }

  // Create projects
  await sql`
    CREATE TABLE IF NOT EXISTS projects (
      id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      name VARCHAR(255) NOT NULL UNIQUE,
      is_archived BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  
  await sql`TRUNCATE TABLE projects RESTART IDENTITY CASCADE`;
  
  const projMap = new Map<number, number>();
  for (const proj of projects) {
    const [row] = await sql<{ id: number }[]>`
      INSERT INTO projects (name, is_archived, created_at, updated_at)
      VALUES (${proj.name}, ${proj.is_archived}, ${proj.created_at}, ${proj.updated_at})
      RETURNING id
    `;
    projMap.set(proj.id, row.id);
  }

  // Create project_departments
  await sql`
    CREATE TABLE IF NOT EXISTS project_departments (
      project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      department_id BIGINT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
      PRIMARY KEY (project_id, department_id)
    )
  `;
  
  await sql`TRUNCATE TABLE project_departments`;
  
  for (const pd of project_departments) {
    const actualProjId = projMap.get(pd.project_id)!;
    const actualDeptId = deptMap.get(pd.department_id)!;
    await sql`
      INSERT INTO project_departments (project_id, department_id)
      VALUES (${actualProjId}, ${actualDeptId})
    `;
  }

  // Create tags
  await sql`
    CREATE TABLE IF NOT EXISTS tags (
      id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      name VARCHAR(50) NOT NULL UNIQUE
    )
  `;
  
  await sql`TRUNCATE TABLE tags RESTART IDENTITY CASCADE`;
  
  for (const tag of tags) {
    await sql`INSERT INTO tags (name) VALUES (${tag.name})`;
  }

  // Create tasks
  await sql`
    CREATE TABLE IF NOT EXISTS tasks (
      id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      priority_bucket INT NOT NULL CHECK (priority_bucket BETWEEN 1 AND 10),
      status VARCHAR(15) CHECK (status IN ('To Do','In Progress','Done')),
      creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      deadline TIMESTAMPTZ,
      notes TEXT,
      parent_task_id BIGINT NULL REFERENCES tasks(id) ON DELETE RESTRICT,
      recurrence_interval INT NOT NULL DEFAULT 0,
      recurrence_date TIMESTAMPTZ DEFAULT NULL,
      logged_time BIGINT NOT NULL DEFAULT 0,
      is_archived BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT chk_task_not_self CHECK (parent_task_id IS NULL OR parent_task_id <> id)
    )
  `;
  
  await sql`TRUNCATE TABLE tasks RESTART IDENTITY CASCADE`;
  
  const taskMap = new Map<number, number>();
  for (const task of tasks) {
    const actualProjId = projMap.get(task.project_id)!;
    const [row] = await sql<{ id: number }[]>`
      INSERT INTO tasks (
        title, description, priority_bucket, status, creator_id, project_id,
        deadline, notes, parent_task_id, recurrence_interval, recurrence_date,
        logged_time, is_archived, created_at, updated_at
      )
      VALUES (
        ${task.title}, ${task.description}, ${task.priority_bucket}, ${task.status},
        ${task.creator_id}, ${actualProjId}, ${task.deadline}, ${task.notes},
        ${task.parent_task_id}, ${task.recurrence_interval}, ${task.recurrence_date},
        ${task.logged_time}, ${task.is_archived}, ${task.created_at}, ${task.updated_at}
      )
      RETURNING id
    `;
    taskMap.set(task.id, row.id);
  }

  // Create task_assignments
  await sql`
    CREATE TABLE IF NOT EXISTS task_assignments (
      id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      assignee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      assignor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  
  await sql`TRUNCATE TABLE task_assignments RESTART IDENTITY CASCADE`;
  
  for (const ta of task_assignments) {
    const actualTaskId = taskMap.get(ta.task_id)!;
    await sql`
      INSERT INTO task_assignments (task_id, assignee_id, assignor_id, created_at)
      VALUES (${actualTaskId}, ${ta.assignee_id}, ${ta.assignor_id}, ${ta.created_at})
    `;
  }

  // Create task_tags
  await sql`
    CREATE TABLE IF NOT EXISTS task_tags (
      task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      tag_id BIGINT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (task_id, tag_id)
    )
  `;
  
  await sql`TRUNCATE TABLE task_tags`;
  
  for (const tt of task_tags) {
    const actualTaskId = taskMap.get(tt.task_id)!;
    await sql`
      INSERT INTO task_tags (task_id, tag_id)
      VALUES (${actualTaskId}, ${tt.tag_id})
    `;
  }

  // Create notifications
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
    )
  `;
  
  await sql`TRUNCATE TABLE notifications RESTART IDENTITY CASCADE`;
  
  for (const notif of notifications) {
    await sql`
      INSERT INTO notifications (user_id, title, message, type, read, created_at, updated_at)
      VALUES (${notif.user_id}, ${notif.title}, ${notif.message}, ${notif.type}, ${notif.read}, ${notif.created_at}, ${notif.updated_at})
    `;
  }

  // Enable RLS and create policies (simplified version)
  await enableRLS(sql);
}

async function enableRLS(sql: postgres.Sql) {
  // Enable RLS
  await sql`ALTER TABLE user_info ENABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE departments ENABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE roles ENABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE tags ENABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE projects ENABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE project_departments ENABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE tasks ENABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE task_tags ENABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE notifications ENABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY`;

  // Create RPC function for department colleagues
  await sql`
    CREATE OR REPLACE FUNCTION get_department_colleagues(user_uuid uuid)
    RETURNS TABLE(id uuid, department_id int)
    LANGUAGE sql
    SECURITY DEFINER
    AS $$
      SELECT u.id, u.department_id::int
      FROM user_info u
      JOIN user_info me ON me.id = user_uuid
      WHERE u.department_id = me.department_id;
    $$;
  `;

  // Key policies for testing
  await sql`
    CREATE POLICY "Users can view own settings/info" ON user_info
    FOR SELECT USING (auth.uid() = id)
  `;

  await sql`
    CREATE POLICY "Users can view colleagues in their department" ON user_info
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM get_department_colleagues(auth.uid()) AS g
        WHERE g.id = user_info.id
      )
    )
  `;

  await sql`
    CREATE POLICY "Users can view tasks assigned to their department" ON tasks
    FOR SELECT
    USING (
      creator_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM task_assignments ta
        JOIN user_info ui ON ui.id = ta.assignee_id
        WHERE ta.task_id = tasks.id
          AND ui.department_id = (SELECT department_id FROM user_info WHERE id = auth.uid())
      )
    )
  `;

  await sql`
    CREATE POLICY "Users can view task assignments relevant to their department" ON task_assignments
    FOR SELECT
    USING (
      assignee_id = auth.uid()
      OR assignor_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM user_info ui
        WHERE ui.id = task_assignments.assignee_id
          AND ui.department_id = (SELECT department_id FROM user_info WHERE id = auth.uid())
      )
    )
  `;

  await sql`
    CREATE POLICY "Users can view projects linked to tasks in their department" ON projects
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM tasks t
        JOIN task_assignments ta ON ta.task_id = t.id
        JOIN user_info ui ON ui.id = ta.assignee_id
        WHERE t.project_id = projects.id
          AND ui.department_id = (SELECT department_id FROM user_info WHERE id = auth.uid())
      )
    )
  `;

  await sql`
    CREATE POLICY "Users can view departments linked to their department's projects" ON departments
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM project_departments pd
        JOIN projects p ON p.id = pd.project_id
        JOIN tasks t ON t.project_id = p.id
        JOIN task_assignments ta ON ta.task_id = t.id
        JOIN user_info ui ON ui.id = ta.assignee_id
        WHERE pd.department_id = departments.id
          AND ui.department_id = (SELECT department_id FROM user_info me WHERE me.id = auth.uid())
      )
    )
  `;

  await sql`
    CREATE POLICY "Users can view project-department links for projects with their colleagues" ON project_departments
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM task_assignments ta
        JOIN user_info u ON ta.assignee_id = u.id
        WHERE u.department_id = (SELECT department_id FROM user_info me WHERE me.id = auth.uid())
          AND ta.task_id IN (SELECT t.id FROM tasks t WHERE t.project_id = project_departments.project_id)
      )
    )
  `;

  await sql`CREATE POLICY "Users can view roles" ON roles FOR SELECT USING (true)`;
  await sql`CREATE POLICY "Users can view tags" ON tags FOR SELECT USING (true)`;
}

export { sql, supabaseAdmin, SUPABASE_URL, SUPABASE_SERVICE_KEY };