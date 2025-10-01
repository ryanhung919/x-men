// lib/sample-data.ts

/* ======================== AUTH USERS ======================== */
/* All passwords: "password123" */
export const auth_users = [
  {
    id: '235d62da-62cc-484b-8715-6683b2a3805a',
    email: 'garrisonkoh12315@gmail.com',
    password: 'password123',
  },
  {
    id: 'aa344933-c44b-4097-b0ac-56987a10734b',
    email: 'mitchshonaaaa@gmail.com',
    password: 'password123',
  },
  {
    id: 'baa47e05-2dba-4f12-8321-71769a9a3702',
    email: 'joel.wang.03@gmail.com',
    password: 'password123',
  },
  {
    id: '9a3c4306-8beb-494a-aee9-ba71a444f19a',
    email: 'kesteryeo@hotmail.com',
    password: 'password123',
  },
  {
    id: 'aa6209a7-be3b-477e-8426-62b8cfd7043b',
    email: 'ryanhung919@gmail.com',
    password: 'password123',
  },
  {
    id: '32635261-038c-4405-b6ed-2d446738f94c',
    email: 'garrisonkoh.2023@scis.smu.edu.sg',
    password: 'password123',
  },
  {
    id: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a',
    email: 'joel.wang.2023@scis.smu.edu.sg',
    password: 'password123',
  },
  {
    id: 'e1aa6307-0985-4f5b-b25b-0b37fbb8d964',
    email: 'mitch.shona.2023@scis.smu.edu.sg',
    password: 'password123',
  },
  {
    id: '61ca6b82-6d42-4058-bb4c-9316e7079b24',
    email: 'ryan.hung.2023@scis.smu.edu.sg',
    password: 'password123',
  },
  {
    id: '67393282-3a06-452b-a05a-9c93a95b597f',
    email: 'kesteryeo.2024@computing.smu.edu.sg',
    password: 'password123',
  },
];

/* ======================== ORGANISATION CATALOG ======================== */
/** Based on the briefing: core SG dev/ops team + finance. */
export const departments = [{ name: 'Engineering' }, { name: 'Finance' }, { name: 'Operations' }];

export const roles = [{ role: 'staff' }, { role: 'manager' }, { role: 'admin' }];

/* ======================== USER PROFILES (user_info) ======================== */
/** Each user belongs to exactly one department. */
export const user_info = [
  // School accounts (primary for work data)
  {
    id: '61ca6b82-6d42-4058-bb4c-9316e7079b24',
    first_name: 'Ryan',
    last_name: 'Hung',
    mode: 'light',
    default_view: 'tasks',
    department_name: 'Engineering',
  },
  {
    id: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a',
    first_name: 'Joel',
    last_name: 'Wang',
    mode: 'dark',
    default_view: 'calendar',
    department_name: 'Finance',
  },
  {
    id: 'e1aa6307-0985-4f5b-b25b-0b37fbb8d964',
    first_name: 'Mitch',
    last_name: 'Shona',
    mode: 'light',
    default_view: 'tasks',
    department_name: 'Engineering',
  },
  {
    id: '32635261-038c-4405-b6ed-2d446738f94c',
    first_name: 'Garrison',
    last_name: 'Koh',
    mode: 'light',
    default_view: 'calendar',
    department_name: 'Operations',
  },
  {
    id: '67393282-3a06-452b-a05a-9c93a95b597f',
    first_name: 'Kester',
    last_name: 'Yeo',
    mode: 'dark',
    default_view: 'tasks',
    department_name: 'Finance',
  },

  // Personal accounts
  {
    id: 'aa6209a7-be3b-477e-8426-62b8cfd7043b',
    first_name: 'Ryan',
    last_name: 'Hung',
    mode: 'light',
    default_view: 'tasks',
    department_name: 'Engineering',
  },
  {
    id: 'baa47e05-2dba-4f12-8321-71769a9a3702',
    first_name: 'Joel',
    last_name: 'Wang',
    mode: 'dark',
    default_view: 'tasks',
    department_name: 'Finance',
  },
  {
    id: 'aa344933-c44b-4097-b0ac-56987a10734b',
    first_name: 'Mitch',
    last_name: 'Shona',
    mode: 'light',
    default_view: 'tasks',
    department_name: 'Engineering',
  },
  {
    id: '235d62da-62cc-484b-8715-6683b2a3805a',
    first_name: 'Garrison',
    last_name: 'Koh',
    mode: 'light',
    default_view: 'tasks',
    department_name: 'Operations',
  },
  {
    id: '9a3c4306-8beb-494a-aee9-ba71a444f19a',
    first_name: 'Kester',
    last_name: 'Yeo',
    mode: 'dark',
    default_view: 'tasks',
    department_name: 'Finance',
  },
];

/* ======================== USER ROLES ======================== */
/** Joel manages finance and is also admin; Mitch is admin; others staff. */
export const user_roles = [
  { user_id: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a', role: 'manager' }, // Joel (SMU)
  { user_id: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a', role: 'admin' },

  { user_id: 'e1aa6307-0985-4f5b-b25b-0b37fbb8d964', role: 'admin' }, // Mitch (SMU)

  { user_id: '61ca6b82-6d42-4058-bb4c-9316e7079b24', role: 'staff' }, // Ryan (SMU)
  { user_id: '32635261-038c-4405-b6ed-2d446738f94c', role: 'staff' }, // Garrison (SMU)
  { user_id: '67393282-3a06-452b-a05a-9c93a95b597f', role: 'staff' }, // Kester (SMU)

  // Mirror roles on personal accounts for future tests:
  { user_id: 'baa47e05-2dba-4f12-8321-71769a9a3702', role: 'manager' }, // Joel (personal)
  { user_id: 'baa47e05-2dba-4f12-8321-71769a9a3702', role: 'admin' },
  { user_id: 'aa344933-c44b-4097-b0ac-56987a10734b', role: 'admin' }, // Mitch (personal)
];

/* ======================== PROJECTS & LINKS ======================== */
export const projects = [
  { name: 'Annual Budget FY25', department_name: 'Finance', is_archived: false },
  { name: 'Website Redesign', department_name: 'Engineering', is_archived: false },
  { name: 'Data Warehouse Lift', department_name: 'Operations', is_archived: false },
];

export const project_departments = [
  { project_name: 'Annual Budget FY25', department_name: 'Finance' },
  { project_name: 'Website Redesign', department_name: 'Engineering' },
  { project_name: 'Data Warehouse Lift', department_name: 'Engineering' },
  { project_name: 'Data Warehouse Lift', department_name: 'Operations' }, // cross-dept ops+eng
];

/* ======================== TAGS ======================== */
export const tags = [
  { name: 'Budget' },
  { name: 'Design' },
  { name: 'Infra' },
  { name: 'Reporting' },
];

/* ======================== TASKS ======================== */
export const tasks = [
  {
    title: 'Design budget dashboard layout',
    description: 'Create FY25 dashboard (KPI tiles, spend vs plan).',
    priority_bucket: '9',
    status: 'In Progress',
    creator_id: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a', // Joel (SMU)
    assignee_id: 'e1aa6307-0985-4f5b-b25b-0b37fbb8d964', // Mitch (SMU)
    project_name: 'Annual Budget FY25',
    deadline: new Date('2025-10-05T17:00:00Z'),
    notes: 'Use shadcn DataTable; filters in URL.',
    parent_task_external_key: null,
    is_archived: false,
    created_at: new Date('2025-09-19T10:20:00Z'),
    updated_at: new Date('2025-09-19T10:20:00Z'),
    recurrence_interval: 0,
    recurrence_date: null,
    logged_time: 120,
  },
  {
    title: 'Implement task board drag/drop',
    description: 'Kanban by status with optimistic updates + Realtime.',
    priority_bucket: '5',
    status: 'To Do',
    creator_id: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a', // Joel (SMU)
    assignee_id: '61ca6b82-6d42-4058-bb4c-9316e7079b24', // Ryan (SMU)
    project_name: 'Website Redesign',
    deadline: new Date('2025-10-10T17:00:00Z'),
    notes: 'Prevent self-parenting on move.',
    parent_task_external_key: 'Design budget dashboard layout',
    is_archived: false,
    created_at: new Date('2025-09-19T10:22:00Z'),
    updated_at: new Date('2025-09-19T10:22:00Z'),
    recurrence_interval: 0,
    recurrence_date: null,
    logged_time: 60,
  },
  {
    title: 'Connect sales data source',
    description: 'ETL from SG data mart into DWH; nightly batch.',
    priority_bucket: '7',
    status: 'To Do',
    creator_id: '32635261-038c-4405-b6ed-2d446738f94c', // Garrison (SMU)
    assignee_id: '67393282-3a06-452b-a05a-9c93a95b597f', // Kester (SMU)
    project_name: 'Data Warehouse Lift',
    deadline: new Date('2025-10-12T17:00:00Z'),
    notes: 'Mask PII; agree on schema v1.0.',
    parent_task_external_key: null,
    is_archived: false,
    created_at: new Date('2025-09-20T09:00:00Z'),
    updated_at: new Date('2025-09-20T09:00:00Z'),
    recurrence_interval: 0,
    recurrence_date: null,
    logged_time: 0,
  },
];

/* ======================== TASK TAGS ======================== */
export const task_tags = [
  { task_title: 'Design budget dashboard layout', tag_name: 'Budget' },
  { task_title: 'Design budget dashboard layout', tag_name: 'Design' },
  { task_title: 'Implement task board drag/drop', tag_name: 'Design' },
  { task_title: 'Connect sales data source', tag_name: 'Infra' },
  { task_title: 'Connect sales data source', tag_name: 'Reporting' },
];

/* ======================== ASSIGNMENTS (<=5 per task enforced in DB) ======================== */
export const task_assignments = [
  {
    task_title: 'Design budget dashboard layout',
    assignee_id: 'e1aa6307-0985-4f5b-b25b-0b37fbb8d964', // Mitch (SMU)
    assignor_id: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a', // Joel (SMU)
    created_at: new Date('2025-09-19T10:20:00Z'),
  },
  {
    task_title: 'Design budget dashboard layout',
    assignee_id: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a', // Joel self-assign to help
    assignor_id: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a',
    created_at: new Date('2025-09-19T10:25:00Z'),
  },
  {
    task_title: 'Implement task board drag/drop',
    assignee_id: '61ca6b82-6d42-4058-bb4c-9316e7079b24', // Ryan (SMU)
    assignor_id: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a', // Joel (SMU)
    created_at: new Date('2025-09-19T10:22:00Z'),
  },
  {
    task_title: 'Connect sales data source',
    assignee_id: '67393282-3a06-452b-a05a-9c93a95b597f', // Kester (SMU)
    assignor_id: '32635261-038c-4405-b6ed-2d446738f94c', // Garrison (SMU)
    created_at: new Date('2025-09-20T09:05:00Z'),
  },
];

/* ======================== ATTACHMENTS (paths only; files not uploaded by seed) ======================== */
export const task_attachments = [
  {
    task_title: 'Design budget dashboard layout',
    storage_path: 'task-attachments/1/design_doc.pdf',
    uploaded_by: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a', // Joel (SMU)
    uploaded_at: new Date('2025-09-19T10:30:00Z'),
  },
  {
    task_title: 'Design budget dashboard layout',
    storage_path: 'task-attachments/1/wireframe.png',
    uploaded_by: 'e1aa6307-0985-4f5b-b25b-0b37fbb8d964', // Mitch (SMU)
    uploaded_at: new Date('2025-09-19T11:10:00Z'),
  },
  {
    task_title: 'Connect sales data source',
    storage_path: 'task-attachments/3/etl_mapping.xlsx',
    uploaded_by: '32635261-038c-4405-b6ed-2d446738f94c', // Garrison (SMU)
    uploaded_at: new Date('2025-09-20T09:30:00Z'),
  },
];

/* ======================== NOTIFICATIONS ======================== */
export const notifications = [
  {
    user_id: '61ca6b82-6d42-4058-bb4c-9316e7079b24', // Ryan (SMU)
    title: 'Task assigned',
    message: 'You have been assigned to “Implement task board drag/drop”.',
    type: 'task',
    read: false,
    created_at: new Date('2025-09-19T10:22:05Z'),
    updated_at: new Date('2025-09-19T10:22:05Z'),
  },
];

/* ======================== COMMENTS ======================== */
export const task_comments = [
  {
    task_title: 'Design budget dashboard layout',
    user_id: '61ca6b82-6d42-4058-bb4c-9316e7079b24', // Ryan (SMU)
    content: 'Add KPI tiles (spend, forecast, burn rate).',
    created_at: new Date('2025-09-19T10:40:00Z'),
    updated_at: new Date('2025-09-19T10:40:00Z'),
  },
  {
    task_title: 'Design budget dashboard layout',
    user_id: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a', // Joel (SMU)
    content: "Yup, I'll draft a KPI list and metrics definitions.",
    created_at: new Date('2025-09-19T11:00:00Z'),
    updated_at: new Date('2025-09-19T11:00:00Z'),
  },
  {
    task_title: 'Connect sales data source',
    user_id: '67393282-3a06-452b-a05a-9c93a95b597f', // Kester (SMU)
    content: 'Need access to SG mart. Who can approve?',
    created_at: new Date('2025-09-20T09:45:00Z'),
    updated_at: new Date('2025-09-20T09:45:00Z'),
  },
];
