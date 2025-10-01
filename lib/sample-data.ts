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
export const departments = [
  { name: 'Engineering' }, 
  { name: 'Finance' }, 
  { name: 'Operations' },
  { name: 'Technology' },
  { name: 'Marketing' },
  { name: 'Accounting' },
];


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
  { user_id: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a', role: 'admin' }, 
  { user_id: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a', role: 'manager' }, // Joel (SMU)
  { user_id: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a', role: 'staff' },

  { user_id: 'e1aa6307-0985-4f5b-b25b-0b37fbb8d964', role: 'admin' },
  { user_id: 'e1aa6307-0985-4f5b-b25b-0b37fbb8d964', role: 'manager' },
  { user_id: 'e1aa6307-0985-4f5b-b25b-0b37fbb8d964', role: 'staff' }, // Mitch (SMU)

  { user_id: '61ca6b82-6d42-4058-bb4c-9316e7079b24', role: 'admin' },
  { user_id: '61ca6b82-6d42-4058-bb4c-9316e7079b24', role: 'manager' },
  { user_id: '61ca6b82-6d42-4058-bb4c-9316e7079b24', role: 'staff' }, // Ryan (SMU)

  { user_id: '32635261-038c-4405-b6ed-2d446738f94c', role: 'admin' },
  { user_id: '32635261-038c-4405-b6ed-2d446738f94c', role: 'manager' },
  { user_id: '32635261-038c-4405-b6ed-2d446738f94c', role: 'staff' }, // Garrison (SMU)

  { user_id: '67393282-3a06-452b-a05a-9c93a95b597f', role: 'admin' },
  { user_id: '67393282-3a06-452b-a05a-9c93a95b597f', role: 'manager' },
  { user_id: '67393282-3a06-452b-a05a-9c93a95b597f', role: 'staff' }, // Kester (SMU)

  // Mirror roles on personal accounts for future tests:
  { user_id: 'baa47e05-2dba-4f12-8321-71769a9a3702', role: 'staff' }, // Joel (personal)
  { user_id: 'aa344933-c44b-4097-b0ac-56987a10734b', role: 'staff' }, // Mitch (personal)
  { user_id: 'aa6209a7-be3b-477e-8426-62b8cfd7043b', role: 'staff' }, // Ryan (personal)
  { user_id: '235d62da-62cc-484b-8715-6683b2a3805a', role: 'staff' }, // Garrison (personal)
  { user_id: '9a3c4306-8beb-494a-aee9-ba71a444f19a', role: 'staff' }, // Kester (personal)
];

/* ======================== PROJECTS & LINKS ======================== */
export const projects = [
  { name: 'Annual Budget FY25', department_name: 'Finance', is_archived: false },
  { name: 'Website Redesign', department_name: 'Engineering', is_archived: false },
  { name: 'Data Warehouse Lift', department_name: 'Operations', is_archived: false },
  { name: 'Digital Collaboration Rollout', department_name: 'Engineering', is_archived: false },
  { name: 'Client Onboarding Portal', department_name: 'Operations', is_archived: false },
  { name: 'Internal Analytics Dashboard', department_name: 'Finance', is_archived: false },
  { name: 'Cloud Doc Management', department_name: 'Engineering', is_archived: false },
  { name: 'Regional Training Program', department_name: 'Operations', is_archived: false },
  { name: 'Workflow Automation Pilot', department_name: 'Engineering', is_archived: false },
  { name: 'FY25 Forecast Review', department_name: 'Finance', is_archived: false },
];

/* ======================== PROJECT DEPARTMENTS ======================== */
export const project_departments = [
  { project_name: 'Annual Budget FY25', department_name: 'Accounting' },
  { project_name: 'Website Redesign', department_name: 'Engineering' },
  { project_name: 'Data Warehouse Lift', department_name: 'Engineering' },
  { project_name: 'Data Warehouse Lift', department_name: 'Operations' },
  { project_name: 'Digital Collaboration Rollout', department_name: 'Marketing' },
  { project_name: 'Client Onboarding Portal', department_name: 'Operations' },
  { project_name: 'Internal Analytics Dashboard', department_name: 'Finance' },
  { project_name: 'Cloud Doc Management', department_name: 'Engineering' },
  { project_name: 'Regional Training Program', department_name: 'Operations' },
  { project_name: 'Workflow Automation Pilot', department_name: 'Engineering' },
  { project_name: 'FY25 Forecast Review', department_name: 'Finance' },
];

/* ======================== TAGS ======================== */
export const tags = [
  { name: 'Budget' },
  { name: 'Design' },
  { name: 'Infra' },
  { name: 'Reporting' },
  { name: 'Collaboration' },
  { name: 'Onboarding' },
  { name: 'Analytics' },
  { name: 'Automation' },
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
  {
    title: 'Roll out collaboration tools to SG office',
    description: 'Deploy cloud-based document and chat tools to all SG staff.',
    priority_bucket: '8',
    status: 'To Do',
    creator_id: '32635261-038c-4405-b6ed-2d446738f94c', // Garrison
    assignee_id: '61ca6b82-6d42-4058-bb4c-9316e7079b24', // Ryan
    project_name: 'Digital Collaboration Rollout',
    deadline: new Date('2025-10-15T17:00:00Z'),
    notes: 'Coordinate with IT for licenses and onboarding sessions.',
    parent_task_external_key: null,
    is_archived: false,
    created_at: new Date('2025-09-21T09:00:00Z'),
    updated_at: new Date('2025-09-21T09:00:00Z'),
    recurrence_interval: 0,
    recurrence_date: null,
    logged_time: 0,
  },
  {
    title: 'Design client onboarding forms',
    description: 'Create digital forms for MNC and SME clients.',
    priority_bucket: '7',
    status: 'In Progress',
    creator_id: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a', // Joel
    assignee_id: '32635261-038c-4405-b6ed-2d446738f94c', // Garrison
    project_name: 'Client Onboarding Portal',
    deadline: new Date('2025-10-20T17:00:00Z'),
    notes: 'Include regional language support (MY, VN, HK).',
    parent_task_external_key: null,
    is_archived: false,
    created_at: new Date('2025-09-22T10:00:00Z'),
    updated_at: new Date('2025-09-22T10:00:00Z'),
    recurrence_interval: 0,
    recurrence_date: null,
    logged_time: 30,
  },
  {
    title: 'Develop finance KPIs for dashboard',
    description: 'Define metrics, create dashboard mockups, link to accounting data.',
    priority_bucket: '9',
    status: 'To Do',
    creator_id: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a', // Joel
    assignee_id: '67393282-3a06-452b-a05a-9c93a95b597f', // Kester
    project_name: 'Internal Analytics Dashboard',
    deadline: new Date('2025-10-18T17:00:00Z'),
    notes: 'Ensure drill-down for monthly and quarterly reports.',
    parent_task_external_key: null,
    is_archived: false,
    created_at: new Date('2025-09-23T09:30:00Z'),
    updated_at: new Date('2025-09-23T09:30:00Z'),
    recurrence_interval: 0,
    recurrence_date: null,
    logged_time: 0,
  },
  {
    title: 'Migrate docs to cloud platform',
    description: 'Move legacy files and folders to new cloud solution.',
    priority_bucket: '6',
    status: 'To Do',
    creator_id: '61ca6b82-6d42-4058-bb4c-9316e7079b24', // Ryan
    assignee_id: 'e1aa6307-0985-4f5b-b25b-0b37fbb8d964', // Mitch
    project_name: 'Cloud Doc Management',
    deadline: new Date('2025-10-22T17:00:00Z'),
    notes: 'Maintain folder structure and access control.',
    parent_task_external_key: null,
    is_archived: false,
    created_at: new Date('2025-09-23T11:00:00Z'),
    updated_at: new Date('2025-09-23T11:00:00Z'),
    recurrence_interval: 0,
    recurrence_date: null,
    logged_time: 0,
  },
  {
    title: 'Plan regional training sessions',
    description: 'Schedule training for Indonesia and Malaysia offices.',
    priority_bucket: '5',
    status: 'To Do',
    creator_id: '32635261-038c-4405-b6ed-2d446738f94c', // Garrison
    assignee_id: '61ca6b82-6d42-4058-bb4c-9316e7079b24', // Ryan
    project_name: 'Regional Training Program',
    deadline: new Date('2025-10-25T17:00:00Z'),
    notes: 'Include onboarding for new cloud tools and workflows.',
    parent_task_external_key: null,
    is_archived: false,
    created_at: new Date('2025-09-24T09:00:00Z'),
    updated_at: new Date('2025-09-24T09:00:00Z'),
    recurrence_interval: 0,
    recurrence_date: null,
    logged_time: 0,
  },
  {
    title: 'Automate invoice approval workflow',
    description: 'Reduce manual approvals by integrating rules engine.',
    priority_bucket: '8',
    status: 'To Do',
    creator_id: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a', // Joel
    assignee_id: '67393282-3a06-452b-a05a-9c93a95b597f', // Kester
    project_name: 'Workflow Automation Pilot',
    deadline: new Date('2025-10-28T17:00:00Z'),
    notes: 'Use test data from FY24 invoices.',
    parent_task_external_key: null,
    is_archived: false,
    created_at: new Date('2025-09-24T10:00:00Z'),
    updated_at: new Date('2025-09-24T10:00:00Z'),
    recurrence_interval: 0,
    recurrence_date: null,
    logged_time: 0,
  },
  {
    title: 'Review FY25 revenue forecast',
    description: 'Analyze projected revenues for SE Asia offices.',
    priority_bucket: '9',
    status: 'In Progress',
    creator_id: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a', // Joel
    assignee_id: '67393282-3a06-452b-a05a-9c93a95b597f', // Kester
    project_name: 'FY25 Forecast Review',
    deadline: new Date('2025-10-30T17:00:00Z'),
    notes: 'Compare with previous 3 years of actuals.',
    parent_task_external_key: null,
    is_archived: false,
    created_at: new Date('2025-09-25T09:30:00Z'),
    updated_at: new Date('2025-09-25T09:30:00Z'),
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
  { task_title: 'Roll out collaboration tools to SG office', tag_name: 'Collaboration' },
  { task_title: 'Design client onboarding forms', tag_name: 'Onboarding' },
  { task_title: 'Develop finance KPIs for dashboard', tag_name: 'Analytics' },
  { task_title: 'Migrate docs to cloud platform', tag_name: 'Infra' },
  { task_title: 'Plan regional training sessions', tag_name: 'Onboarding' },
  { task_title: 'Automate invoice approval workflow', tag_name: 'Automation' },
  { task_title: 'Review FY25 revenue forecast', tag_name: 'Budget' },
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
  {
    task_title: 'Roll out collaboration tools to SG office',
    storage_path: 'task-attachments/4/collab_tools_guide.pdf',
    uploaded_by: '32635261-038c-4405-b6ed-2d446738f94c',
    uploaded_at: new Date('2025-09-21T09:15:00Z'),
  },
  {
    task_title: 'Design client onboarding forms',
    storage_path: 'task-attachments/5/onboarding_forms.xlsx',
    uploaded_by: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a',
    uploaded_at: new Date('2025-09-22T10:15:00Z'),
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
