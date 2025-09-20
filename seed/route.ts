import bcrypt from 'bcrypt';
import postgres from 'postgres';
import {
  users,
  departments,
  user_departments,
  roles,
  user_roles,
  tags,
  projects,
  tasks,
  task_tags,
} from '../lib/sample-data';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

// --------------------- USERS ---------------------
async function seedUsers() {
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      username VARCHAR(255) NOT NULL,
      password TEXT NOT NULL,
      first_name VARCHAR(255) NOT NULL,
      last_name VARCHAR(255) NOT NULL,
      email TEXT NOT NULL UNIQUE,
      mode VARCHAR(10) NOT NULL,
      CONSTRAINT users_mode_chk CHECK (mode IN ('light','dark'))
    );
  `;
  await sql`TRUNCATE TABLE users RESTART IDENTITY CASCADE;`;

  return Promise.all(
    users.map(async (u) => {
      const hashed = await bcrypt.hash(u.password, 10);
      return sql`
      INSERT INTO users (id, username, password, first_name, last_name, email, mode)
      VALUES (${u.id}, ${u.username}, ${hashed}, ${u.first_name}, ${u.last_name}, ${u.email}, ${u.mode})
      ON CONFLICT (id) DO NOTHING;
    `;
    })
  );
}

// --------------------- DEPARTMENTS ---------------------

async function seedDepartments() {
  await sql`
    CREATE TABLE IF NOT EXISTS departments (
      id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      name VARCHAR(255) NOT NULL UNIQUE,
      parent_department_id BIGINT NULL REFERENCES departments(id) ON DELETE SET NULL,
      CONSTRAINT chk_dept_not_self CHECK (
        parent_department_id IS NULL OR parent_department_id <> id
      )
    );
  `;
  await sql`TRUNCATE TABLE departments RESTART IDENTITY CASCADE;`;

  // Insert names, capture ids
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

  // Example: wire Finance Executive -> Finance Manager
  const fm = nameToId.get('Finance Manager');
  const fe = nameToId.get('Finance Executive');
  if (fm && fe) {
    await sql`UPDATE departments SET parent_department_id = ${fm} WHERE id = ${fe}`;
  }

  return nameToId;
}

async function seedUserDepartments(nameToDeptId: Map<string, number>) {
  await sql`
    CREATE TABLE IF NOT EXISTS user_departments (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      department_id BIGINT NOT NULL REFERENCES departments(id) ON DELETE RESTRICT
    );
  `;
  await sql`TRUNCATE TABLE user_departments;`;

  return Promise.all(
    user_departments.map((ud) => {
      const depId = nameToDeptId.get(ud.department_name)!;
      return sql`
      INSERT INTO user_departments (user_id, department_id)
      VALUES (${ud.user_id}, ${depId})
      ON CONFLICT (user_id) DO NOTHING
    `;
    })
  );
}

// --------------------- ROLES ---------------------
async function seedRoles() {
  await sql`
    CREATE TABLE IF NOT EXISTS roles (
      role VARCHAR(50) PRIMARY KEY,
      CONSTRAINT roles_allowed_chk CHECK (role IN ('staff','manager','admin'))
    );
  `;
  await sql`TRUNCATE TABLE roles;`;

  return Promise.all(
    roles.map((r) => sql`INSERT INTO roles (role) VALUES (${r.role}) ON CONFLICT (role) DO NOTHING`)
  );
}

async function seedUserRoles() {
  await sql`
    CREATE TABLE IF NOT EXISTS user_roles (
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role VARCHAR(50) NOT NULL REFERENCES roles(role) ON DELETE CASCADE,
      PRIMARY KEY (user_id, role)
    );
  `;
  await sql`TRUNCATE TABLE user_roles;`;

  return Promise.all(
    user_roles.map(
      (ur) =>
        sql`
      INSERT INTO user_roles (user_id, role)
      VALUES (${ur.user_id}, ${ur.role})
      ON CONFLICT (user_id, role) DO NOTHING
    `
    )
  );
}

// --------------------- TAGS ---------------------
async function seedTags() {
  await sql`
    CREATE TABLE IF NOT EXISTS tags (
      id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      name VARCHAR(50) NOT NULL UNIQUE
    );
  `;
  await sql`TRUNCATE TABLE tags RESTART IDENTITY CASCADE;`;

  return Promise.all(
    tags.map((t) => sql`INSERT INTO tags (name) VALUES (${t.name}) ON CONFLICT (name) DO NOTHING`)
  );
}

// --------------------- PROJECTS ---------------------
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

// --------------------- TASKS ---------------------
async function seedTasks(deps: {
  nameToDeptId: Map<string, number>;
  projKeyToId: Map<string, number>;
}) {
  // Ensure table exists
  await sql`
    CREATE TABLE IF NOT EXISTS tasks (
      id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      priority VARCHAR(10) CHECK (priority IN ('Low','Medium','High')),
      status VARCHAR(15) CHECK (status IN ('To Do','In Progress','Done')),
      creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
      department_id BIGINT NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
      project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      deadline TIMESTAMPTZ,
      notes TEXT,
      parent_task_id BIGINT NULL,
      is_archived BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT fk_task_parent FOREIGN KEY (parent_task_id)
        REFERENCES tasks(id) ON DELETE CASCADE,
      CONSTRAINT chk_task_not_self CHECK (
        parent_task_id IS NULL OR parent_task_id <> id
      )
    );
  `;

  type TaskRet = { id: number; title: string };
  await sql`TRUNCATE TABLE tasks RESTART IDENTITY CASCADE;`;

  // Lookup map for parent linking
  const titleToTaskId = new Map<string, number>();

  for (const t of tasks) {
    const departmentId = deps.nameToDeptId.get(t.department_name);
    if (!departmentId) {
      throw new Error(`Unknown department: ${t.department_name}`);
    }

    const projKey = `${t.project_name}::${departmentId}`;
    const projectId = deps.projKeyToId.get(projKey);
    if (!projectId) {
      throw new Error(`Unknown project: ${t.project_name} (dept ${t.department_name})`);
    }

    const parentId = t.parent_task_external_key
      ? titleToTaskId.get(t.parent_task_external_key) ?? null
      : null;

    // Coalesce optionals
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

    if (!row) {
      throw new Error('INSERT INTO tasks returned no row');
    }

    titleToTaskId.set(row.title, row.id);
  }
}

// --------------------- TASK_TAGS ---------------------
async function seedTaskTags() {
  await sql`
    CREATE TABLE IF NOT EXISTS task_tags (
      task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      tag_id BIGINT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (task_id, tag_id)
    );
  `;

  await sql`TRUNCATE TABLE task_tags RESTART IDENTITY CASCADE;`;

  if (!task_tags.length) return;

  // Build lookup maps
  const taskRows = await sql`SELECT id, title FROM tasks`;
  const tagRows = await sql`SELECT id, name FROM tags`;

  const titleToTaskId = new Map(taskRows.map((r: any) => [r.title as string, Number(r.id)]));
  const nameToTagId = new Map(tagRows.map((r: any) => [r.name as string, Number(r.id)]));

  // Resolve and filter only pairs that have both IDs
  const pairs: Array<{ task_id: number; tag_id: number }> = [];
  for (const tt of task_tags) {
    const taskId = titleToTaskId.get(tt.task_title);
    const tagId = nameToTagId.get(tt.tag_name);
    if (taskId && tagId) {
      pairs.push({ task_id: taskId, tag_id: tagId });
    }
  }

  if (!pairs.length) return;

  // Insert in parallel, idempotent
  await Promise.all(
    pairs.map(
      (p) =>
        sql`
        INSERT INTO task_tags (task_id, tag_id)
        VALUES (${p.task_id}, ${p.tag_id})
        ON CONFLICT (task_id, tag_id) DO NOTHING
      `
    )
  );
}

// --------------------- GET ROUTE ---------------------
export async function GET() {
  try {
    await sql.begin(async (trx) => {
      await seedUsers();
      await seedRoles();
      await seedUserRoles();

      const nameToDeptId = await seedDepartments();
      await seedUserDepartments(nameToDeptId);

      // Projects depend on Departments
      const { projKeyToId } = await seedProjects(nameToDeptId);

      await seedTags();
      await seedTasks({ nameToDeptId, projKeyToId });
      await seedTaskTags();
    });

    return Response.json({ message: 'Database seeded successfully' });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
