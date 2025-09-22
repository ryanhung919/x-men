export const auth_users = [
  {
    id: 'd6e15727-9fe1-4961-8c5b-ea44a9bd81aa',
    email: 'ryan.hung.2023@scis.smu.edu.sg',
    password: 'password123',
  },
  {
    id: '3958dc9e-712f-4377-85e9-fec4b6a6442a',
    email: 'joel.wang.2023@scis.smu.edu.sg',
    password: 'password123',
  },
  {
    id: 'cc27c14a-0acf-4f4a-a6c9-d45682c144b9',
    email: 'mitch.shona.2023@scis.smu.edu.sg',
    password: 'password123',
  },
  {
    id: 'cc37c14a-0acf-4f4a-a6c9-d45682c144b9',
    email: 'kester.yeo.2024@computing.smu.edu.sg',
    password: 'password123',
  },
];

export const user_settings = [
  {
    id: 'd6e15727-9fe1-4961-8c5b-ea44a9bd81aa',
    first_name: 'Ryan',
    last_name: 'Hung',
    mode: 'light',
    default_view: 'tasks',
  },
  {
    id: '3958dc9e-712f-4377-85e9-fec4b6a6442a',
    first_name: 'Joel',
    last_name: 'Wang',
    mode: 'dark',
    default_view: 'calendar',
  },
  {
    id: 'cc27c14a-0acf-4f4a-a6c9-d45682c144b9',
    first_name: 'Mitch',
    last_name: 'Shona',
    mode: 'light',
    default_view: 'tasks',
  },
];

export const departments = [
  { name: 'Finance Manager', parent_department_id: null },
  { name: 'Finance Executive', parent_department_id: null }, // set proper parent after insert
  { name: 'Engineering', parent_department_id: null },
];

export const roles = [{ role: 'staff' }, { role: 'manager' }, { role: 'admin' }];

// Ryan: staff only
// Joel: manager + admin (can manage Finance Manager dept and see its child)
// Mitch: admin only (can see all depts)
export const user_roles = [
  {
    user_id: 'd6e15727-9fe1-4961-8c5b-ea44a9bd81aa',
    role: 'staff'
  },
  {
    user_id: '3958dc9e-712f-4377-85e9-fec4b6a6442a',
    role: 'manager'
  },
  {
    user_id: '3958dc9e-712f-4377-85e9-fec4b6a6442a',
    role: 'admin'
  },
  {
    user_id: 'cc27c14a-0acf-4f4a-a6c9-d45682c144b9',
    role: 'admin'
  },
];

export const user_departments = [
  { user_id: 'd6e15727-9fe1-4961-8c5b-ea44a9bd81aa', department_name: 'Finance Manager' },
  { user_id: '3958dc9e-712f-4377-85e9-fec4b6a6442a', department_name: 'Finance Executive' },
  { user_id: 'cc27c14a-0acf-4f4a-a6c9-d45682c144b9', department_name: 'Engineering' },
];

export const tags = [
  { name: 'Finance' },
  { name: 'Accounting' },
  { name: 'Design' },
  { name: 'Research' },
];

export const projects = [
  { name: 'Website Redesign', department_name: 'Engineering' },
  { name: 'Annual Budget', department_name: 'Finance Manager' },
];

export const tasks = [
  {
    title: 'Design dashboard layout',
    description: 'Create budget and expense overview designs with shadcn/ui.',
    priority: 'High',
    status: 'In Progress',
    creator_id: '3958dc9e-712f-4377-85e9-fec4b6a6442a', // Joel created
    assignee_id: 'cc27c14a-0acf-4f4a-a6c9-d45682c144b9', // assigned to Mitch
    department_name: 'Finance Manager', // to resolve to BIGINT
    project_name: 'Annual Budget',
    deadline: new Date('2025-10-05T17:00:00Z'),
    notes: 'Use shadcn DataTable and keep filters in URL params.',
    parent_task_external_key: null,
    is_archived: false,
    created_at: new Date('2025-09-19T10:20:00Z'),
    updated_at: new Date('2025-09-19T10:20:00Z'),
  },
  {
    title: 'Implement task board drag/drop',
    description: 'Kanban columns by status with optimistic updates and Supabase Realtime.',
    priority: 'Medium',
    status: 'To Do',
    creator_id: '3958dc9e-712f-4377-85e9-fec4b6a6442a', // Joel created
    assignee_id: 'd6e15727-9fe1-4961-8c5b-ea44a9bd81aa', // assigned to Ryan
    department_name: 'Engineering',
    project_name: 'Website Redesign',
    deadline: new Date('2025-10-10T17:00:00Z'),
    notes: 'Prevent self-parenting on move; enforce ON DELETE CASCADE expectations.',
    parent_task_external_key: 'Design dashboard layout', // resolve parent after first insert by title
    is_archived: false,
    created_at: new Date('2025-09-19T10:22:00Z'),
    updated_at: new Date('2025-09-19T10:22:00Z'),
  },
];

export const task_tags = [
  { task_title: 'Design dashboard layout', tag_name: 'Finance' },
  { task_title: 'Implement task board drag/drop', tag_name: 'Design' },
];

export const notifications = [
  {
    user_id: 'd6e15727-9fe1-4961-8c5b-ea44a9bd81aa', // Ryan's ID
    title: 'Task assigned',
    message: 'You have been assigned to Task A in Project X.',
    type: 'task',
    read: false,
    created_at: new Date(),
    updated_at: new Date(),
  },
];
