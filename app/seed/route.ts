import postgres from 'postgres';
import { createClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';
import {
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
} from '../../lib/sample-data';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function teardownSchema(sql: postgres.Sql) {
  console.log('⚠️ Dropping all app tables...');

  // Order matters: drop dependent tables first
  await sql`DROP TABLE IF EXISTS task_comments CASCADE`;
  await sql`DROP TABLE IF EXISTS task_assignments CASCADE`;
  await sql`DROP TABLE IF EXISTS task_tags CASCADE`;
  await sql`DROP TABLE IF EXISTS tasks CASCADE`;
  await sql`DROP TABLE IF EXISTS projects CASCADE`;
  await sql`DROP TABLE IF EXISTS notifications CASCADE`;
  await sql`DROP TABLE IF EXISTS tags CASCADE`;
  await sql`DROP TABLE IF EXISTS user_roles CASCADE`;
  await sql`DROP TABLE IF EXISTS roles CASCADE`;
  await sql`DROP TABLE IF EXISTS departments CASCADE`;
  await sql`DROP TABLE IF EXISTS user_info CASCADE`;

  console.log('Schema torn down');
}

/* --------------------- USER_INFO --------------------- */
async function seedUserInfo(sql: postgres.Sql, nameToDeptId: Map<string, number>) {
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

  await sql`
    CREATE TABLE IF NOT EXISTS user_info (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      first_name VARCHAR(255) NOT NULL,
      last_name  VARCHAR(255) NOT NULL,
      mode       VARCHAR(10) NOT NULL DEFAULT 'light',
      default_view VARCHAR(20) NOT NULL DEFAULT 'tasks',
      department_id BIGINT NOT NULL REFERENCES departments(id) ON DELETE RESTRICT
    );
  `;
  await sql`TRUNCATE TABLE user_info CASCADE;`;

  await Promise.all(
    user_info.map((ui) => {
      const depId = nameToDeptId.get(ui.department_name);
      if (!depId) throw new Error(`Unknown department: ${ui.department_name}`);

      return sql`
        INSERT INTO user_info (id, first_name, last_name, mode, default_view, department_id)
        VALUES (${ui.id}, ${ui.first_name}, ${ui.last_name}, ${ui.mode}, ${
        ui.default_view ?? 'tasks'
      }, ${depId})
        ON CONFLICT (id) DO UPDATE
          SET first_name = EXCLUDED.first_name,
              last_name  = EXCLUDED.last_name,
              mode       = EXCLUDED.mode,
              default_view = EXCLUDED.default_view,
              department_id = EXCLUDED.department_id
      `;
    })
  );
}

/* --------------------- DEPARTMENTS --------------------- */
async function seedDepartments(sql: postgres.Sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS departments (
      id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      name VARCHAR(255) NOT NULL UNIQUE
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
  return nameToId;
}

/* --------------------- PROJECT_DEPARTMENTS --------------------- */
async function seedProjectDepartments(
  sql: postgres.Sql,
  nameToDeptId: Map<string, number>,
  nameToProjId: Map<string, number>
) {
  await sql`
    CREATE TABLE IF NOT EXISTS project_departments (
      project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      department_id BIGINT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
      PRIMARY KEY (project_id, department_id)
    );
  `;
  await sql`TRUNCATE TABLE project_departments;`;

  if (!project_departments.length) return;

  await Promise.all(
    project_departments.map((pd) => {
      const projId = nameToProjId.get(pd.project_name);
      const deptId = nameToDeptId.get(pd.department_name);

      if (!projId) throw new Error(`Unknown project: ${pd.project_name}`);
      if (!deptId) throw new Error(`Unknown department: ${pd.department_name}`);

      return sql`
        INSERT INTO project_departments (project_id, department_id)
        VALUES (${projId}, ${deptId})
        ON CONFLICT (project_id, department_id) DO NOTHING
      `;
    })
  );
}

/* --------------------- ROLES --------------------- */
async function seedRoles(sql: postgres.Sql) {
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
async function seedUserRoles(sql: postgres.Sql, nameToDeptId: Map<string, number>) {
  await sql`
    CREATE TABLE IF NOT EXISTS user_roles (
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      role    VARCHAR(50) NOT NULL REFERENCES roles(role) ON DELETE CASCADE,
      PRIMARY KEY (user_id, role)
    );
  `;
  await sql`TRUNCATE TABLE user_roles;`;

  await Promise.all(
    user_roles.map((ur) => {
      return sql`
          INSERT INTO user_roles (user_id, role)
          VALUES (${ur.user_id}, ${ur.role})
          ON CONFLICT (user_id, role) DO NOTHING
        `;
    })
  );
}

/* --------------------- TAGS --------------------- */
async function seedTags(sql: postgres.Sql) {
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
async function seedProjects(sql: postgres.Sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS projects (
      id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      name VARCHAR(255) NOT NULL UNIQUE,
      is_archived BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await sql`TRUNCATE TABLE projects RESTART IDENTITY CASCADE;`;

  type ProjRow = { id: number; name: string };
  const inserted = await Promise.all(
    projects.map((p) => {
      return sql<ProjRow[]>`
        INSERT INTO projects (name, is_archived)
        VALUES (${p.name}, ${p.is_archived ?? false})
        ON CONFLICT (name) DO NOTHING
        RETURNING id, name
      `;
    })
  );
  const rows = inserted.flat();

  const projKeyToId = new Map<string, number>(rows.map((r) => [r.name, Number(r.id)]));

  return { projKeyToId };
}

/* --------------------- TASKS --------------------- */
async function seedTasks(sql: postgres.Sql, deps: { projKeyToId: Map<string, number> }) {
  await sql`
    CREATE TABLE IF NOT EXISTS tasks (
      id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      priority_bucket INT NOT NULL CHECK (priority_bucket BETWEEN 1 AND 10),
      status VARCHAR(15) CHECK (status IN ('To Do','In Progress','Completed', 'Blocked')),
      creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      deadline TIMESTAMPTZ,
      notes TEXT,
      parent_task_id BIGINT NULL REFERENCES tasks(id) ON DELETE RESTRICT,
      recurrence_interval INT NOT NULL DEFAULT 0,  -- recurrence in days/interval
      recurrence_date TIMESTAMPTZ DEFAULT NULL, -- when recurrence starts
      logged_time BIGINT NOT NULL DEFAULT 0, -- time in seconds
      is_archived BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT chk_task_not_self CHECK (parent_task_id IS NULL OR parent_task_id <> id)
    );
  `;
  await sql`TRUNCATE TABLE tasks RESTART IDENTITY CASCADE;`;

  const titleToTaskId = new Map<string, number>();
  const pendingTasks = [...tasks];

  while (pendingTasks.length) {
    const readyTasks = pendingTasks.filter(
      (t) => !t.parent_task_external_key || titleToTaskId.has(t.parent_task_external_key)
    );

    if (!readyTasks.length) {
      throw new Error('Circular dependency detected among tasks!');
    }

    await Promise.all(
      readyTasks.map(async (t) => {
        const projectId = deps.projKeyToId.get(t.project_name);
        if (!projectId) throw new Error(`Unknown project: ${t.project_name}`);

        const parentId = t.parent_task_external_key
          ? titleToTaskId.get(t.parent_task_external_key)!
          : null;

        const description = t.description ?? null;
        const deadline = t.deadline ?? null;
        const notes = t.notes ?? null;
        const createdAt = t.created_at ?? new Date();
        const updatedAt = t.updated_at ?? createdAt;
        const recurrenceInterval = t.recurrence_interval ?? 0;
        const recurrenceAnchor = t.recurrence_date ?? null;
        const loggedTime = t.logged_time ?? 0;

        const [row] = await sql<{ id: number; title: string }[]>`
          INSERT INTO tasks (
            title, description, priority_bucket, status, creator_id,
            project_id, deadline, notes, parent_task_id,
            recurrence_interval, recurrence_date, logged_time,
            is_archived, created_at, updated_at
          )
          VALUES (
            ${t.title}, ${description}, ${t.priority_bucket}, ${t.status}, ${t.creator_id},
            ${projectId}, ${deadline}, ${notes}, ${parentId},
            ${recurrenceInterval}, ${recurrenceAnchor}, ${loggedTime},
            ${t.is_archived}, ${createdAt}, ${updatedAt}
          )
          RETURNING id, title
        `;

        titleToTaskId.set(row.title, row.id);
      })
    );

    for (const t of readyTasks) {
      const index = pendingTasks.indexOf(t);
      if (index > -1) pendingTasks.splice(index, 1);
    }
  }
}

/* --------------------- TASK_TAGS --------------------- */
async function seedTaskTags(sql: postgres.Sql) {
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

/* --------------------- STORAGE BUCKET --------------------- */
async function resetTaskAttachmentsBucket(sql: postgres.Sql) {
  console.log('Resetting storage bucket: task-attachments');

  // Drop bucket if exists
  await sql`DELETE FROM storage.buckets WHERE id = 'task-attachments'`;

  // Recreate bucket (private by default)
  await sql`
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('task-attachments', 'task-attachments', false)
  `;
}

/* --------------------- TASK_ATTACHMENTS --------------------- */
async function seedTaskAttachments(sql: postgres.Sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS task_attachments (
      id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      storage_path TEXT NOT NULL,
      uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
      uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_task_file UNIQUE (task_id, storage_path)
    );
  `;
  await sql`TRUNCATE TABLE task_attachments RESTART IDENTITY CASCADE;`;

  if (!task_attachments.length) return;

  const taskRows = await sql`SELECT id, title FROM tasks`;
  const titleToTaskId = new Map(taskRows.map((r: any) => [r.title as string, Number(r.id)]));

  await Promise.all(
    task_attachments.map((ta) => {
      const taskId = titleToTaskId.get(ta.task_title);
      if (!taskId) throw new Error(`Unknown task: ${ta.task_title}`);

      return sql`
        INSERT INTO task_attachments (task_id, storage_path, uploaded_by, uploaded_at)
        VALUES (${taskId}, ${ta.storage_path}, ${ta.uploaded_by}, ${ta.uploaded_at ?? new Date()})
        ON CONFLICT (task_id, storage_path) DO NOTHING
      `;
    })
  );
}

/* --------------------- NOTIFICATIONS --------------------- */
async function seedNotifications(sql: postgres.Sql) {
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

/* --------------------- TASK_ASSIGNMENTS --------------------- */
async function seedTaskAssignments(sql: postgres.Sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS task_assignments (
      id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      assignee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      assignor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await sql`TRUNCATE TABLE task_assignments RESTART IDENTITY CASCADE;`;

  if (!task_assignments.length) return;

  const taskRows = await sql`SELECT id, title FROM tasks`;
  const titleToTaskId = new Map(taskRows.map((r: any) => [r.title as string, Number(r.id)]));

  await Promise.all(
    task_assignments.map((ta) => {
      const taskId = titleToTaskId.get(ta.task_title);
      if (!taskId) throw new Error(`Unknown task: ${ta.task_title}`);
      return sql`
        INSERT INTO task_assignments (task_id, assignee_id, assignor_id, created_at)
        VALUES (${taskId}, ${ta.assignee_id}, ${ta.assignor_id}, ${ta.created_at})
        ON CONFLICT DO NOTHING
      `;
    })
  );
}

/* --------------------- TASK_COMMENTS --------------------- */
async function seedTaskComments(sql: postgres.Sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS task_comments (
      id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      is_archived BOOLEAN NOT NULL DEFAULT FALSE
    );
  `;
  await sql`TRUNCATE TABLE task_comments RESTART IDENTITY CASCADE;`;

  if (!task_comments.length) return;

  const taskRows = await sql`SELECT id, title FROM tasks`;
  const titleToTaskId = new Map(taskRows.map((r: any) => [r.title as string, Number(r.id)]));

  await Promise.all(
    task_comments.map((tc) => {
      const taskId = titleToTaskId.get(tc.task_title);
      if (!taskId) throw new Error(`Unknown task: ${tc.task_title}`);
      return sql`
        INSERT INTO task_comments (task_id, user_id, content, created_at, updated_at)
        VALUES (${taskId}, ${tc.user_id}, ${tc.content}, ${tc.created_at}, ${tc.updated_at})
        ON CONFLICT DO NOTHING
      `;
    })
  );
}

/* --------------------- ENABLE ROW LEVEL SECURITY --------------------- */
async function enableRLS(sql: postgres.Sql) {
  // Enable RLS on all application tables
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
  await sql`ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY`;

  // Create basic RLS policies

  /* ---------------- USER INFO ---------------- */  
  
  // Security definer function that returns all colleagues in the same department:
  await sql`
    CREATE OR REPLACE FUNCTION get_department_colleagues(user_uuid uuid)
      RETURNS TABLE(id uuid, department_id int)
      LANGUAGE sql
      SECURITY DEFINER
      AS $$
        SELECT u.id, u.department_id
        FROM user_info u
        JOIN user_info me ON me.id = user_uuid
        WHERE u.department_id = me.department_id;
      $$;
  `;

  // Security definer function to check if user can view a task
  // This bypasses RLS to avoid circular dependency with task_assignments
  await sql`
    CREATE OR REPLACE FUNCTION is_task_visible_to_user(task_id_arg bigint, user_id_arg uuid)
      RETURNS boolean
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $$
      BEGIN
        IF user_id_arg != auth.uid() THEN
          RETURN FALSE;
        END IF;
        RETURN
          EXISTS (
            SELECT 1 FROM tasks t WHERE t.id = task_id_arg AND t.creator_id = user_id_arg
          )
          OR EXISTS (
            SELECT 1
            FROM task_assignments ta
            JOIN user_info ui ON ta.assignee_id = ui.id
            WHERE ta.task_id = task_id_arg
              AND ui.department_id = (SELECT department_id FROM user_info WHERE id = user_id_arg)
          );
      END;
      $$;
  `;

  // Create security definer function to get assignee info for visible tasks
  // This allows users to see names of assignees on tasks they can view, even if from different departments
  await sql`
    CREATE OR REPLACE FUNCTION get_task_assignees_info(task_ids bigint[])
      RETURNS TABLE(id uuid, first_name varchar, last_name varchar)
      LANGUAGE sql
      SECURITY DEFINER
      SET search_path = public
      AS $$
        SELECT DISTINCT ui.id, ui.first_name, ui.last_name
        FROM user_info ui
        JOIN task_assignments ta ON ta.assignee_id = ui.id
        WHERE ta.task_id = ANY(task_ids)
          AND is_task_visible_to_user(ta.task_id, auth.uid());
      $$;
  `;

  // User Info: Users can only access their own info
  await sql`
    CREATE POLICY "Users can view own settings/info" ON user_info
    FOR SELECT USING (auth.uid() = id)
  `;

  await sql`
    CREATE POLICY "Users can update own settings/info" ON user_info
    FOR UPDATE USING (auth.uid() = id)
  `;

  //User Info: Users can see colleagues in their department
  await sql`
    CREATE POLICY "Users can view colleagues in their department" ON user_info
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM get_department_colleagues(auth.uid()) AS g
        WHERE g.id = user_info.id
      )
    );
`;

  /* ---------------- USER ROLES ---------------- */

  // Security definer function to check if user has a specific role
  // This bypasses RLS to avoid circular dependency
  await sql`
    CREATE OR REPLACE FUNCTION user_has_role(user_uuid uuid, role_name text)
      RETURNS boolean
      LANGUAGE sql
      SECURITY DEFINER
      SET search_path = public
      AS $$
        SELECT EXISTS (
          SELECT 1 FROM user_roles
          WHERE user_id = user_uuid AND role = role_name
        );
      $$;
  `;

  // User Roles: Users can view their own roles
  await sql`
    CREATE POLICY "Users can view their own roles" ON user_roles
    FOR SELECT
    USING (user_id = auth.uid())
  `;

  // User Roles: Only admins can assign or revoke roles
  await sql`
    CREATE POLICY "Admins can manage roles" ON user_roles
    FOR ALL
    USING (user_has_role(auth.uid(), 'admin'))
    WITH CHECK (user_has_role(auth.uid(), 'admin'))
  `;

  /* ---------------- TASKS ---------------- */

  // Users can create tasks they own
  await sql`
    CREATE POLICY "Users can create their own tasks" ON tasks
    FOR INSERT
    WITH CHECK (auth.uid() = creator_id);
  `;

  // Users can update their own tasks (details, status, priority_bucket, recurrence_interval)
  await sql`
    CREATE POLICY "Users can update their own tasks" ON tasks
    FOR UPDATE
    USING (auth.uid() = creator_id)
    WITH CHECK (auth.uid() = creator_id)
  `;

  // Tasks: Users can see tasks in their department
  // Uses SECURITY DEFINER function to avoid circular RLS dependency with task_assignments
  await sql`
    CREATE POLICY "Users can view tasks assigned to their department" ON tasks
    FOR SELECT
    USING (is_task_visible_to_user(id, auth.uid()));
  `;

  // Tasks: Only admins can archive tasks
  await sql`
    CREATE POLICY "Admins can archive tasks" ON tasks
    FOR UPDATE
    USING (user_has_role(auth.uid(), 'admin'))
    WITH CHECK (is_archived = true)
  `;

  /* ---------------- PROJECTS ---------------- */

  // Projects: Users can see projects linked to their their department
  await sql`
  CREATE POLICY "Users can view projects linked to tasks in their department" ON projects
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM tasks t
      JOIN task_assignments ta ON ta.task_id = t.id
      JOIN user_info ui ON ui.id = ta.assignee_id
      WHERE t.project_id = projects.id
        AND ui.department_id = (SELECT department_id FROM user_info WHERE id = auth.uid())
    )
  )
`;

  /* ---------------- NOTIFICATIONS ---------------- */

  // Notifications: Users can only see their own notifications
  await sql`
    CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id)
  `;

  // Notifications: Users can update (mark as read) their own notifications
  await sql`
    CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id)
  `;

  // Notifications: Users can delete their own notifications
  await sql`
    CREATE POLICY "Users can delete own notifications" ON notifications
    FOR DELETE
    USING (auth.uid() = user_id)
  `;

  // Notifications: INSERT policy - Allow system to create notifications for any user
  // This policy allows notifications to be created by triggers or server-side code
  // without requiring auth.uid() to match, since notifications are created FOR users, not BY users
  await sql`
    CREATE POLICY "System can create notifications" ON notifications
    FOR INSERT
    WITH CHECK (true)
  `;

  /* ---------------- DEPARTMENTS ---------------- */

  // Departments: Users can view departments linked to their department's projects
  await sql`
    CREATE POLICY "Users can view departments linked to their department's projects"
    ON departments
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM project_departments pd
        JOIN projects p ON p.id = pd.project_id
        JOIN tasks t ON t.project_id = p.id
        JOIN task_assignments ta ON ta.task_id = t.id
        JOIN user_info ui ON ui.id = ta.assignee_id
        WHERE pd.department_id = departments.id
          AND ui.department_id = (
            SELECT department_id FROM user_info me
            WHERE me.id = auth.uid()
          )
      )
    );
  `;

  /* ---------------- PROJECT_DEPARTMENTS ---------------- */

  // Departments: Users can view project-department links for projects with their colleagues
  await sql`
    CREATE POLICY "Users can view project-department links for projects with their colleagues"
    ON project_departments
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM task_assignments ta
        JOIN user_info u ON ta.assignee_id = u.id
        WHERE u.department_id = (
          SELECT department_id FROM user_info me WHERE me.id = auth.uid()
        )
        AND ta.task_id IN (
          SELECT t.id FROM tasks t WHERE t.project_id = project_departments.project_id
        )
      )
    );
  `;

  /* ---------------- ROLES ---------------- */

  // Roles: Read-only access for roles (commonly referenced)
  await sql`
    CREATE POLICY "Users can view roles" ON roles
    FOR SELECT USING (true)
  `;

  /* ---------------- TAGS ---------------- */

  // Tags: Read-only access for tags (commonly referenced)
  await sql`
    CREATE POLICY "Users can view tags" ON tags
    FOR SELECT USING (true)
  `;

  /* ---------------- TASK ASSIGNMENTS ---------------- */

  // Task Assignments: Users can view assignments where they are assignor/assignee or in their department
  await sql`
    CREATE POLICY "Users can view assignments for visible tasks" ON task_assignments
    FOR SELECT
    USING (
      is_task_visible_to_user(task_id, auth.uid())
      OR assignee_id = auth.uid()
    );
  `;

  // Task Assignments: Users can assign assignees to tasks
  await sql`
    CREATE POLICY "Users can assign other users for tasks in their department"
    ON task_assignments
    FOR INSERT
    WITH CHECK (
      assignor_id = auth.uid()
      AND EXISTS (
        SELECT 1
        FROM tasks t
        JOIN project_departments pd ON pd.project_id = t.project_id
        WHERE t.id = task_assignments.task_id
          AND pd.department_id = (SELECT department_id FROM user_info WHERE id = auth.uid())
      )
    )
  `;

  /* ---------------- TASK ATTACHMENTS ---------------- */
  // Select: assignees of the task can view
  await sql`
    CREATE POLICY "Assignees can view task attachments"
    ON task_attachments
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM task_assignments ta
        WHERE ta.task_id = task_attachments.task_id
          AND ta.assignee_id = auth.uid()
      )
    )
  `;

  // Insert: assignees of the task can add attachments (uploaded_by must be the actor)
  await sql`
    CREATE POLICY "Assignees can add task attachments"
    ON task_attachments
    FOR INSERT
    WITH CHECK (
      uploaded_by = auth.uid()
      AND EXISTS (
        SELECT 1
        FROM task_assignments ta
        WHERE ta.task_id = task_attachments.task_id
          AND ta.assignee_id = auth.uid()
      )
    )
  `;

  /* ---------------- TASK COMMENTS ---------------- */

  // Task Comments: Users can view their own comments or comments on tasks in their department
  await sql`
    CREATE POLICY "Users can view comments on tasks in their department"
    ON task_comments
    FOR SELECT
    USING (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM tasks t
        JOIN project_departments pd ON pd.project_id = t.project_id
        WHERE t.id = task_comments.task_id
          AND pd.department_id = (SELECT department_id FROM user_info WHERE id = auth.uid())
      )
    )
  `;

  // Task Comments: Staff can comment only if assigned, managers can comment on any task in their departments
  await sql`
    CREATE POLICY "Users can comment on tasks they are assigned to or manage"
    ON task_comments
    FOR INSERT
    WITH CHECK (
      user_id = auth.uid()
      AND (
        EXISTS (
          SELECT 1
          FROM task_assignments ta
          WHERE ta.task_id = task_comments.task_id
            AND ta.assignee_id = auth.uid()
        )
        OR
        EXISTS (
          SELECT 1
          FROM user_roles ur
          JOIN user_info ui ON ur.user_id = ui.id
          JOIN project_departments pd ON pd.department_id = ui.department_id
          JOIN tasks t ON t.project_id = pd.project_id
          WHERE ur.role = 'manager'
            AND ur.user_id = auth.uid()
            AND t.id = task_comments.task_id
        )
      )
    )
  `;

  // Task Comments: Users can only edit their own comments
  await sql`
    CREATE POLICY "Users can edit own comments"
    ON task_comments
    FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())
  `;

  // Task Comments: Only admins are allowed to delete comments
  await sql`
    CREATE POLICY "Admins can delete comments"
    ON task_comments
    FOR DELETE
    USING (user_has_role(auth.uid(), 'admin'))
  `;

  /* ---------------- TASK TAGS ---------------- */

  // Anyone can view task tags (as long as they can see the task)
  await sql`
    CREATE POLICY "Users can view tags in their own department tasks"
    ON task_tags
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM tasks t
        JOIN project_departments pd ON pd.project_id = t.project_id
        WHERE t.id = task_tags.task_id
          AND pd.department_id = (SELECT department_id FROM user_info WHERE id = auth.uid())
      )
    )
  `;

  // Anyone can add tags to tasks in their departments
  await sql`
    CREATE POLICY "Users can add tags in their own deparment tasks"
    ON task_tags
    FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM tasks t
        JOIN project_departments pd ON pd.project_id = t.project_id
        WHERE t.id = task_tags.task_id
          AND pd.department_id = (SELECT department_id FROM user_info WHERE id = auth.uid())
      )
    )
  `;

  // Anyone can remove tags from tasks in their departments
  await sql`
    CREATE POLICY "Users can remove tags in their own department tasks"
    ON task_tags
    FOR DELETE
    USING (
      EXISTS (
        SELECT 1
        FROM tasks t
        JOIN project_departments pd ON pd.project_id = t.project_id
        WHERE t.id = task_tags.task_id
          AND pd.department_id = (SELECT department_id FROM user_info WHERE id = auth.uid())
      )
    )
  `;
}
/* --------------------- TRIGGERS --------------------- */

async function createTriggers(sql: postgres.Sql) {
  await sql`
      -- Trigger function to update project_departments when a new task assignment is inserted
    CREATE OR REPLACE FUNCTION update_project_departments()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $$
    DECLARE
        assignee_dept_id int;
    BEGIN
        -- Get the department of the new assignee
        SELECT department_id INTO assignee_dept_id
        FROM user_info
        WHERE id = NEW.assignee_id;

        -- Insert a row into project_departments if it doesn't already exist
        INSERT INTO project_departments (project_id, department_id)
        SELECT t.project_id, assignee_dept_id
        FROM tasks t
        WHERE t.id = NEW.task_id
        ON CONFLICT (project_id, department_id) DO NOTHING;

        RETURN NEW;
    END;
    $$;
  `;

  await sql`
    -- Create the trigger on task_assignments table
    CREATE TRIGGER trg_update_project_departments
    AFTER INSERT ON task_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_project_departments();
  `;

  await sql`
    -- Trigger function to create notification when a new task assignment is inserted
    -- SECURITY DEFINER allows it to bypass RLS policies and avoid infinite recursion
    CREATE OR REPLACE FUNCTION notify_task_assignment()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    DECLARE
        task_title_var TEXT;
        assignor_first_name TEXT;
        assignor_last_name TEXT;
        assignor_full_name TEXT;
    BEGIN
        -- Skip notification if assignee is the same as assignor (self-assignment)
        IF NEW.assignee_id = NEW.assignor_id THEN
            RETURN NEW;
        END IF;

        -- Get task title (bypass RLS)
        SELECT title INTO task_title_var
        FROM tasks
        WHERE id = NEW.task_id;

        -- Get assignor name (bypass RLS)
        IF NEW.assignor_id IS NOT NULL THEN
            SELECT first_name, last_name INTO assignor_first_name, assignor_last_name
            FROM user_info
            WHERE id = NEW.assignor_id;

            assignor_full_name := assignor_first_name || ' ' || assignor_last_name;
        ELSE
            assignor_full_name := 'Someone';
        END IF;

        -- Insert notification (bypass RLS)
        INSERT INTO notifications (user_id, title, message, type, read, created_at, updated_at)
        VALUES (
            NEW.assignee_id,
            'New Task Assignment',
            assignor_full_name || ' assigned you to task: "' || task_title_var || '"',
            'task_assigned',
            false,
            NOW(),
            NOW()
        );

        RETURN NEW;
    END;
    $$;
  `;

  await sql`
    -- Create the trigger on task_assignments table for notifications
    CREATE TRIGGER trg_notify_task_assignment
    AFTER INSERT ON task_assignments
    FOR EACH ROW
    EXECUTE FUNCTION notify_task_assignment();
  `;

  await sql`
    -- Trigger function to create notifications when a new comment is added
    -- SECURITY DEFINER allows it to bypass RLS policies
    CREATE OR REPLACE FUNCTION notify_new_comment()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    DECLARE
        task_title_var TEXT;
        commenter_first_name TEXT;
        commenter_last_name TEXT;
        commenter_full_name TEXT;
        assignee_record RECORD;
    BEGIN
        -- Get task title (bypass RLS)
        SELECT title INTO task_title_var
        FROM tasks
        WHERE id = NEW.task_id;

        -- Get commenter name (bypass RLS)
        SELECT first_name, last_name INTO commenter_first_name, commenter_last_name
        FROM user_info
        WHERE id = NEW.user_id;

        IF commenter_first_name IS NOT NULL AND commenter_last_name IS NOT NULL THEN
            commenter_full_name := commenter_first_name || ' ' || commenter_last_name;
        ELSE
            commenter_full_name := 'Someone';
        END IF;

        -- Create notifications for all assignees except the commenter
        FOR assignee_record IN
            SELECT assignee_id
            FROM task_assignments
            WHERE task_id = NEW.task_id
        LOOP
            -- Skip the commenter
            IF assignee_record.assignee_id != NEW.user_id THEN
                INSERT INTO notifications (user_id, title, message, type, read, created_at, updated_at)
                VALUES (
                    assignee_record.assignee_id,
                    'New Comment',
                    commenter_full_name || ' commented on task: "' || task_title_var || '"',
                    'comment_added',
                    false,
                    NOW(),
                    NOW()
                );
            END IF;
        END LOOP;

        RETURN NEW;
    END;
    $$;
  `;

  await sql`
    -- Create the trigger on task_comments table for notifications
    CREATE TRIGGER trg_notify_new_comment
    AFTER INSERT ON task_comments
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_comment();
  `;
}

/* --------------------- GET ROUTE --------------------- */
export async function GET() {
  const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

  try {
    await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
    await teardownSchema(sql);

    await sql.begin(async (sql) => {
      // Seed base tables
      const [rolesPromise, tagsPromise, departmentsPromise, projectsPromise] = [
        seedRoles(sql),
        seedTags(sql),
        seedDepartments(sql),
        seedProjects(sql),
      ];

      const nameToDeptId = await departmentsPromise;
      const { projKeyToId } = await projectsPromise;

      await rolesPromise;
      await tagsPromise;

      // Seed user info (depends on departments)
      await seedUserInfo(sql, nameToDeptId);

      // Seed user roles
      await seedUserRoles(sql, nameToDeptId);

      // Seed project ↔ department links
      await seedProjectDepartments(sql, nameToDeptId, projKeyToId);

      // Seed tasks
      await seedTasks(sql, { projKeyToId });

      // Seed dependent tables
      await Promise.all([
        seedTaskTags(sql),
        seedTaskAssignments(sql),
        seedTaskComments(sql),
        seedTaskAttachments(sql),
        seedNotifications(sql),
      ]);

      // Reset storage bucket for attachments
      await resetTaskAttachmentsBucket(sql);

      await enableRLS(sql);
      await createTriggers(sql);
    });

    await sql.end();
    return Response.json({ message: 'Database seeded successfully.' });
  } catch (error) {
    console.error('Seeding error:', error);
    await sql.end();
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
