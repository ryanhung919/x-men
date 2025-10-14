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
    email: 'mitchshonaaa@gmail.com',
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
export const departments = [
  // Top Level (Orange)
  { name: 'Managing Director', parent_department_name: null },

  // Second Level (Yellow - Directors)
  { name: 'Sales Director', parent_department_name: 'Managing Director' },
  { name: 'Consultancy Division Director', parent_department_name: 'Managing Director' },
  { name: 'System Solutioning Division Director', parent_department_name: 'Managing Director' },
  { name: 'Engineering Operations Division Director', parent_department_name: 'Managing Director' },
  { name: 'HR and Admin Director', parent_department_name: 'Managing Director' },
  { name: 'Finance Director', parent_department_name: 'Managing Director' },
  { name: 'IT Director', parent_department_name: 'Managing Director' },

  // Third Level (Blue - Teams/Managers)

  // Sales Branch (3-tier)
  { name: 'Sales Manager', parent_department_name: 'Sales Director' },

  // Consultancy Branch
  { name: 'Consultant', parent_department_name: 'Consultancy Division Director' },

  // System Solutioning Branch
  { name: 'Developers', parent_department_name: 'System Solutioning Division Director' },
  { name: 'Support Team', parent_department_name: 'System Solutioning Division Director' },

  // Engineering Operations Branch
  { name: 'Senior Engineers', parent_department_name: 'Engineering Operations Division Director' },
  { name: 'Junior Engineers', parent_department_name: 'Engineering Operations Division Director' },
  { name: 'Call Centre', parent_department_name: 'Engineering Operations Division Director' },
  { name: 'Operation Planning Team', parent_department_name: 'Engineering Operations Division Director',
  },

  // HR and Admin Branch
  { name: 'HR Team', parent_department_name: 'HR and Admin Director' },
  { name: 'L&D Team', parent_department_name: 'HR and Admin Director' },
  { name: 'Admin Team', parent_department_name: 'HR and Admin Director' },

  // Finance Branch (3-tier)
  { name: 'Finance Managers', parent_department_name: 'Finance Director' },

  // IT Branch
  { name: 'IT Team', parent_department_name: 'IT Director' },

  // Fourth Level (Blue - Leaf nodes, only for Sales and Finance)

  // Sales 4th tier
  { name: 'Account Managers', parent_department_name: 'Sales Manager' },

  // Finance 4th tier
  { name: 'Finance Executive', parent_department_name: 'Finance Managers' },
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
    department_name: 'Finance Director',
  },
  {
    id: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a',
    first_name: 'Joel',
    last_name: 'Wang',
    mode: 'dark',
    default_view: 'calendar',
    department_name: 'Engineering Operations Division Director',
  },
  {
    id: 'e1aa6307-0985-4f5b-b25b-0b37fbb8d964',
    first_name: 'Mitch',
    last_name: 'Shona',
    mode: 'light',
    default_view: 'tasks',
    department_name: 'Finance Director',
  },
  {
    id: '32635261-038c-4405-b6ed-2d446738f94c',
    first_name: 'Garrison',
    last_name: 'Koh',
    mode: 'light',
    default_view: 'calendar',
    department_name: 'System Solutioning Division Director',
  },
  {
    id: '67393282-3a06-452b-a05a-9c93a95b597f',
    first_name: 'Kester',
    last_name: 'Yeo',
    mode: 'dark',
    default_view: 'tasks',
    department_name: 'Engineering Operations Division Director',
  },

  // Personal accounts
  {
    id: 'aa6209a7-be3b-477e-8426-62b8cfd7043b',
    first_name: 'Ryan',
    last_name: 'Hung',
    mode: 'light',
    default_view: 'tasks',
    department_name: 'Finance Managers',
  },
  {
    id: 'baa47e05-2dba-4f12-8321-71769a9a3702',
    first_name: 'Joel',
    last_name: 'Wang',
    mode: 'dark',
    default_view: 'tasks',
    department_name: 'Senior Engineers',
  },
  {
    id: 'aa344933-c44b-4097-b0ac-56987a10734b',
    first_name: 'Mitch',
    last_name: 'Shona',
    mode: 'light',
    default_view: 'tasks',
    department_name: 'Finance Executive',
  },
  {
    id: '235d62da-62cc-484b-8715-6683b2a3805a',
    first_name: 'Garrison',
    last_name: 'Koh',
    mode: 'light',
    default_view: 'tasks',
    department_name: 'System Solutioning Division Director',
  },
  {
    id: '9a3c4306-8beb-494a-aee9-ba71a444f19a',
    first_name: 'Kester',
    last_name: 'Yeo',
    mode: 'dark',
    default_view: 'tasks',
    department_name: 'Junior Engineers',
  },
];

/* ======================== USER ROLES ======================== */
/** Joel manages Finance Director and is also admin; Mitch is admin; others staff. */
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
  { name: 'Annual Budget FY25', department_name: 'Finance Director', is_archived: false },
  {
    name: 'Website Redesign',
    department_name: 'Engineering Operations Division Director',
    is_archived: false,
  },
  {
    name: 'Data Warehouse Lift',
    department_name: 'System Solutioning Division Director',
    is_archived: false,
  },
  {
    name: 'Digital Collaboration Rollout',
    department_name: 'Engineering Operations Division Director',
    is_archived: false,
  },
  {
    name: 'Client Onboarding Portal',
    department_name: 'System Solutioning Division Director',
    is_archived: false,
  },
  { name: 'Internal Analytics Dashboard', department_name: 'Finance Director', is_archived: false },
  {
    name: 'Cloud Doc Management',
    department_name: 'Engineering Operations Division Director',
    is_archived: false,
  },
  {
    name: 'Regional Training Program',
    department_name: 'System Solutioning Division Director',
    is_archived: false,
  },
  {
    name: 'Workflow Automation Pilot',
    department_name: 'Engineering Operations Division Director',
    is_archived: false,
  },
  { name: 'FY25 Forecast Review', department_name: 'Finance Director', is_archived: false },
];

/* ======================== PROJECT DEPARTMENTS ======================== */
export const project_departments = [
  {
    project_name: 'Annual Budget FY25',
    department_name: 'Engineering Operations Division Director',
  },
  { project_name: 'Annual Budget FY25', department_name: 'Finance Director' },
  { project_name: 'Annual Budget FY25', department_name: 'Consultancy Division Director' },
  { project_name: 'Website Redesign', department_name: 'Engineering Operations Division Director' },
  {
    project_name: 'Data Warehouse Lift',
    department_name: 'Engineering Operations Division Director',
  },
  { project_name: 'Data Warehouse Lift', department_name: 'Finance Director' },
  { project_name: 'Data Warehouse Lift', department_name: 'System Solutioning Division Director' },
  {
    project_name: 'Digital Collaboration Rollout',
    department_name: 'System Solutioning Division Director',
  },
  { project_name: 'Digital Collaboration Rollout', department_name: 'Sales Director' },
  {
    project_name: 'Client Onboarding Portal',
    department_name: 'Engineering Operations Division Director',
  },
  { project_name: 'Client Onboarding Portal', department_name: 'Finance Director' },
  {
    project_name: 'Client Onboarding Portal',
    department_name: 'System Solutioning Division Director',
  },
  {
    project_name: 'Internal Analytics Dashboard',
    department_name: 'Engineering Operations Division Director',
  },
  { project_name: 'Internal Analytics Dashboard', department_name: 'Finance Director' },
  {
    project_name: 'Cloud Doc Management',
    department_name: 'Engineering Operations Division Director',
  },
  { project_name: 'Cloud Doc Management', department_name: 'System Solutioning Division Director' },
  {
    project_name: 'Regional Training Program',
    department_name: 'System Solutioning Division Director',
  },
  {
    project_name: 'Workflow Automation Pilot',
    department_name: 'Engineering Operations Division Director',
  },
  { project_name: 'Workflow Automation Pilot', department_name: 'Finance Director' },
  { project_name: 'FY25 Forecast Review', department_name: 'Finance Director' },
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
    status: 'Completed',
    creator_id: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a', // Joel (SMU)
    project_name: 'Annual Budget FY25',
    deadline: new Date('2025-10-05T17:00:00+08:00'),
    notes: 'Use shadcn DataTable; filters in URL.',
    parent_task_external_key: null,
    is_archived: false,
    created_at: new Date('2025-09-19T10:20:00+08:00'),
    updated_at: new Date('2025-09-19T10:20:00+08:00'),
    recurrence_interval: 0,
    recurrence_date: null,
    logged_time: 7200,
  },
  {
    title: 'Implement task board drag/drop',
    description: 'Kanban by status with optimistic updates + Realtime.',
    priority_bucket: '5',
    status: 'To Do',
    creator_id: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a', // Joel (SMU)
    project_name: 'Website Redesign',
    deadline: new Date('2025-10-10T17:00:00+08:00'),
    notes: 'Prevent self-parenting on move.',
    parent_task_external_key: 'Design budget dashboard layout',
    is_archived: false,
    created_at: new Date('2025-09-19T10:22:00+08:00'),
    updated_at: new Date('2025-09-19T10:22:00+08:00'),
    recurrence_interval: 0,
    recurrence_date: null,
    logged_time: 0,
  },
  {
    title: 'Connect sales data source',
    description: 'ETL from SG data mart into DWH; nightly batch.',
    priority_bucket: '7',
    status: 'Completed',
    creator_id: '32635261-038c-4405-b6ed-2d446738f94c', // Garrison (SMU)
    project_name: 'Data Warehouse Lift',
    deadline: new Date('2025-10-12T17:00:00+08:00'),
    notes: 'Mask PII; agree on schema v1.0.',
    parent_task_external_key: null,
    is_archived: false,
    created_at: new Date('2025-09-20T09:00:00+08:00'),
    updated_at: new Date('2025-09-20T09:00:00+08:00'),
    recurrence_interval: 0,
    recurrence_date: null,
    logged_time: 9120,
  },
  {
    title: 'Roll out collaboration tools to SG office',
    description: 'Deploy cloud-based document and chat tools to all SG staff.',
    priority_bucket: '8',
    status: 'To Do',
    creator_id: '32635261-038c-4405-b6ed-2d446738f94c', // Garrison
    project_name: 'Digital Collaboration Rollout',
    deadline: new Date('2025-10-15T17:00:00+08:00'),
    notes: 'Coordinate with IT for licenses and onboarding sessions.',
    parent_task_external_key: null,
    is_archived: false,
    created_at: new Date('2025-09-21T09:00:00+08:00'),
    updated_at: new Date('2025-09-21T09:00:00+08:00'),
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
    project_name: 'Client Onboarding Portal',
    deadline: new Date('2025-10-20T17:00:00+08:00'),
    notes: 'Include regional language support (MY, VN, HK).',
    parent_task_external_key: null,
    is_archived: false,
    created_at: new Date('2025-09-22T10:00:00+08:00'),
    updated_at: new Date('2025-09-22T10:00:00+08:00'),
    recurrence_interval: 0,
    recurrence_date: null,
    logged_time: 30000,
  },
  {
    title: 'Develop finance KPIs for dashboard',
    description: 'Define metrics, create dashboard mockups, link to accounting data.',
    priority_bucket: '9',
    status: 'Completed',
    creator_id: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a', // Joel
    project_name: 'Internal Analytics Dashboard',
    deadline: new Date('2025-10-18T17:00:00+08:00'),
    notes: 'Ensure drill-down for monthly and quarterly reports.',
    parent_task_external_key: null,
    is_archived: false,
    created_at: new Date('2025-09-23T09:30:00+08:00'),
    updated_at: new Date('2025-09-23T09:30:00+08:00'),
    recurrence_interval: 0,
    recurrence_date: null,
    logged_time: 40901,
  },
  {
    title: 'Migrate docs to cloud platform',
    description: 'Move legacy files and folders to new cloud solution.',
    priority_bucket: '6',
    status: 'Completed',
    creator_id: '61ca6b82-6d42-4058-bb4c-9316e7079b24', // Ryan
    project_name: 'Cloud Doc Management',
    deadline: new Date('2025-09-29T17:00:00+08:00'),
    notes: 'Maintain folder structure and access control.',
    parent_task_external_key: null,
    is_archived: false,
    created_at: new Date('2025-09-23T11:00:00+08:00'),
    updated_at: new Date('2025-09-30T11:00:00+08:00'),
    recurrence_interval: 0,
    recurrence_date: null,
    logged_time: 22000,
  },
  {
    title: 'Plan regional training sessions',
    description: 'Schedule training for InCompletedsia and Malaysia offices.',
    priority_bucket: '5',
    status: 'To Do',
    creator_id: '32635261-038c-4405-b6ed-2d446738f94c', // Garrison
    project_name: 'Regional Training Program',
    deadline: new Date('2025-10-25T17:00:00+08:00'),
    notes: 'Include onboarding for new cloud tools and workflows.',
    parent_task_external_key: null,
    is_archived: false,
    created_at: new Date('2025-09-24T09:00:00+08:00'),
    updated_at: new Date('2025-09-24T09:00:00+08:00'),
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
    project_name: 'Workflow Automation Pilot',
    deadline: new Date('2025-10-28T17:00:00+08:00'),
    notes: 'Use test data from FY24 invoices.',
    parent_task_external_key: null,
    is_archived: false,
    created_at: new Date('2025-09-24T10:00:00+08:00'),
    updated_at: new Date('2025-09-24T10:00:00+08:00'),
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
    project_name: 'FY25 Forecast Review',
    deadline: new Date('2025-10-30T17:00:00+08:00'),
    notes: 'Compare with previous 3 years of actuals.',
    parent_task_external_key: null,
    is_archived: false,
    created_at: new Date('2025-09-25T09:30:00+08:00'),
    updated_at: new Date('2025-09-25T09:30:00+08:00'),
    recurrence_interval: 0,
    recurrence_date: null,
    logged_time: 10900,
  },
  {
    title: 'Implement login auth flow',
    description: 'Add JWT-based login with Supabase auth.',
    priority_bucket: 8,
    status: 'In Progress',
    creator_id: 'e1aa6307-0985-4f5b-b25b-0b37fbb8d964', // Mitch
    project_name: 'Workflow Automation Pilot',
    deadline: new Date('2025-10-25T17:00:00+08:00'),
    notes: 'Ensure refresh token handling.',
    parent_task_external_key: null,
    is_archived: false,
    created_at: new Date('2025-09-25T10:00:00+08:00'),
    updated_at: new Date('2025-09-25T10:00:00+08:00'),
    recurrence_interval: 0,
    recurrence_date: null,
    logged_time: 98080,
  },
  {
    title: 'Setup CI/CD pipeline',
    description: 'Automate deployments for staging & prod.',
    priority_bucket: 7,
    status: 'Completed',
    creator_id: '61ca6b82-6d42-4058-bb4c-9316e7079b24', // Ryan
    project_name: 'Website Redesign',
    deadline: new Date('2025-10-28T17:00:00+08:00'),
    notes: 'Use GitHub Actions.',
    parent_task_external_key: null,
    is_archived: false,
    created_at: new Date('2025-09-25T12:00:00+08:00'),
    updated_at: new Date('2025-09-25T12:00:00+08:00'),
    recurrence_interval: 0,
    recurrence_date: null,
    logged_time: 30123,
  },
  {
    title: 'Create onboarding video',
    description: 'Short video tutorial for new hires.',
    priority_bucket: 6,
    status: 'In Progress',
    creator_id: 'e1aa6307-0985-4f5b-b25b-0b37fbb8d964', // Mitch
    project_name: 'Client Onboarding Portal',
    deadline: new Date('2025-10-27T17:00:00+08:00'),
    notes: 'Include captions for APAC regions.',
    parent_task_external_key: null,
    is_archived: false,
    created_at: new Date('2025-09-26T09:00:00+08:00'),
    updated_at: new Date('2025-09-26T09:00:00+08:00'),
    recurrence_interval: 0,
    recurrence_date: null,
    logged_time: 2120,
  },
  {
    title: 'Optimize dashboard queries',
    description: 'Improve SQL performance for FY25 KPIs.',
    priority_bucket: 9,
    status: 'To Do',
    creator_id: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a', // Joel
    project_name: 'Annual Budget FY25',
    deadline: new Date('2025-10-30T17:00:00+08:00'),
    notes: 'Add indexes on key tables.',
    parent_task_external_key: null,
    is_archived: false,
    created_at: new Date('2025-09-26T11:00:00+08:00'),
    updated_at: new Date('2025-09-26T11:00:00+08:00'),
    recurrence_interval: 0,
    recurrence_date: null,
    logged_time: 0,
  },
  {
    title: 'Design API for mobile app',
    description: 'REST endpoints for tasks and projects.',
    priority_bucket: 8,
    status: 'In Progress',
    creator_id: 'aa6209a7-be3b-477e-8426-62b8cfd7043b', // Ryan
    project_name: 'Internal Analytics Dashboard',
    deadline: new Date('2025-11-01T17:00:00+08:00'),
    notes: 'Follow RESTful best practices.',
    parent_task_external_key: null,
    is_archived: false,
    created_at: new Date('2025-09-27T10:00:00+08:00'),
    updated_at: new Date('2025-09-27T10:00:00+08:00'),
    recurrence_interval: 0,
    recurrence_date: null,
    logged_time: 30120,
  },
  {
    title: 'Conduct UX testing',
    description: 'Gather feedback from 10 pilot users.',
    priority_bucket: 5,
    status: 'To Do',
    creator_id: 'e1aa6307-0985-4f5b-b25b-0b37fbb8d964', // Mitch
    project_name: 'Website Redesign',
    deadline: new Date('2025-11-03T17:00:00+08:00'),
    notes: 'Record issues in JIRA.',
    parent_task_external_key: null,
    is_archived: false,
    created_at: new Date('2025-09-28T09:00:00+08:00'),
    updated_at: new Date('2025-09-28T09:00:00+08:00'),
    recurrence_interval: 0,
    recurrence_date: null,
    logged_time: 0,
  },
  {
    title: 'Update project documentation',
    description: 'Ensure docs match latest process changes.',
    priority_bucket: 6,
    status: 'In Progress',
    creator_id: '32635261-038c-4405-b6ed-2d446738f94c', // Garrison
    project_name: 'Digital Collaboration Rollout',
    deadline: new Date('2025-11-05T17:00:00+08:00'),
    notes: 'Use Confluence; tag owners.',
    parent_task_external_key: null,
    is_archived: false,
    created_at: new Date('2025-09-28T11:00:00+08:00'),
    updated_at: new Date('2025-09-28T11:00:00+08:00'),
    recurrence_interval: 0,
    recurrence_date: null,
    logged_time: 1390,
  },
  {
    title: 'Refactor data pipelines',
    description: 'Improve ETL reliability and logging.',
    priority_bucket: 7,
    status: 'Completed',
    creator_id: '61ca6b82-6d42-4058-bb4c-9316e7079b24', // Ryan
    project_name: 'Data Warehouse Lift',
    deadline: new Date('2025-11-07T17:00:00+08:00'),
    notes: 'Add retry logic; monitor failed batches.',
    parent_task_external_key: null,
    is_archived: false,
    created_at: new Date('2025-09-29T09:30:00+08:00'),
    updated_at: new Date('2025-09-29T09:30:00+08:00'),
    recurrence_interval: 0,
    recurrence_date: null,
    logged_time: 42180,
  },
  {
    title: 'Prepare finance report',
    description: 'Consolidate monthly expenses and revenue.',
    priority_bucket: 9,
    status: 'In Progress',
    creator_id: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a', // Joel
    project_name: 'Annual Budget FY25',
    deadline: new Date('2025-11-10T17:00:00+08:00'),
    notes: 'Send PDF to CFO.',
    parent_task_external_key: null,
    is_archived: false,
    created_at: new Date('2025-09-30T10:00:00+08:00'),
    updated_at: new Date('2025-09-30T10:00:00+08:00'),
    recurrence_interval: 0,
    recurrence_date: null,
    logged_time: 41230,
  },
  {
    title: 'Setup analytics dashboards',
    description: 'Create dashboards for all business units.',
    priority_bucket: 8,
    status: 'In Progress',
    creator_id: 'e1aa6307-0985-4f5b-b25b-0b37fbb8d964', // Mitch
    project_name: 'Internal Analytics Dashboard',
    deadline: new Date('2025-11-12T17:00:00+08:00'),
    notes: 'Integrate with accounting and CRM systems.',
    parent_task_external_key: null,
    is_archived: false,
    created_at: new Date('2025-10-01T09:00:00+08:00'),
    updated_at: new Date('2025-10-01T09:00:00+08:00'),
    recurrence_interval: 0,
    recurrence_date: null,
    logged_time: 52120,
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
  { task_title: 'Implement login auth flow', tag_name: 'Infra' },
  { task_title: 'Setup CI/CD pipeline', tag_name: 'Infra' },
  { task_title: 'Setup CI/CD pipeline', tag_name: 'Automation' },
  { task_title: 'Create onboarding video', tag_name: 'Onboarding' },
  { task_title: 'Optimize dashboard queries', tag_name: 'Budget' },
  { task_title: 'Optimize dashboard queries', tag_name: 'Analytics' },
  { task_title: 'Design API for mobile app', tag_name: 'Design' },
  { task_title: 'Conduct UX testing', tag_name: 'Design' },
  { task_title: 'Update project documentation', tag_name: 'Collaboration' },
  { task_title: 'Refactor data pipelines', tag_name: 'Infra' },
  { task_title: 'Refactor data pipelines', tag_name: 'Automation' },
  { task_title: 'Prepare finance report', tag_name: 'Budget' },
  { task_title: 'Prepare finance report', tag_name: 'Reporting' },
  { task_title: 'Setup analytics dashboards', tag_name: 'Analytics' },
  { task_title: 'Setup analytics dashboards', tag_name: 'Reporting' },
];

/* ======================== ASSIGNMENTS (<=5 per task enforced in DB) ======================== */
export const task_assignments = [
  {
    task_title: 'Design budget dashboard layout',
    assignee_id: 'e1aa6307-0985-4f5b-b25b-0b37fbb8d964', // Mitch (SMU)
    assignor_id: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a', // Joel (SMU)
    created_at: new Date('2025-09-19T10:20:00+08:00'),
  },
  {
    task_title: 'Design budget dashboard layout',
    assignee_id: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a', // Joel self-assign to help
    assignor_id: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a',
    created_at: new Date('2025-09-19T10:25:00+08:00'),
  },
  {
    task_title: 'Implement task board drag/drop',
    assignee_id: '61ca6b82-6d42-4058-bb4c-9316e7079b24', // Ryan (SMU)
    assignor_id: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a', // Joel (SMU)
    created_at: new Date('2025-09-19T10:22:00+08:00'),
  },
  {
    task_title: 'Implement task board drag/drop',
    assignee_id: 'e1aa6307-0985-4f5b-b25b-0b37fbb8d964', // Mitch (SMU)
    assignor_id: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a', // Joel (SMU)
    created_at: new Date('2025-09-19T10:23:00+08:00'),
  },
  {
    task_title: 'Connect sales data source',
    assignee_id: '67393282-3a06-452b-a05a-9c93a95b597f', // Kester (SMU)
    assignor_id: '32635261-038c-4405-b6ed-2d446738f94c', // Garrison (SMU)
    created_at: new Date('2025-09-20T09:05:00+08:00'),
  },
  {
    task_title: 'Connect sales data source',
    assignee_id: '61ca6b82-6d42-4058-bb4c-9316e7079b24', // Ryan (SMU)
    assignor_id: '32635261-038c-4405-b6ed-2d446738f94c', // Garrison (SMU)
    created_at: new Date('2025-09-20T09:06:00+08:00'),
  },
  {
    task_title: 'Roll out collaboration tools to SG office',
    assignee_id: '32635261-038c-4405-b6ed-2d446738f94c', // Garrison (SMU)
    assignor_id: '32635261-038c-4405-b6ed-2d446738f94c', // self-assign
    created_at: new Date('2025-09-21T09:05:00+08:00'),
  },
  {
    task_title: 'Roll out collaboration tools to SG office',
    assignee_id: 'e1aa6307-0985-4f5b-b25b-0b37fbb8d964', // Mitch (SMU)
    assignor_id: '32635261-038c-4405-b6ed-2d446738f94c', // Garrison (SMU)
    created_at: new Date('2025-09-21T09:06:00+08:00'),
  },
  {
    task_title: 'Design client onboarding forms',
    assignee_id: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a', // Joel (SMU)
    assignor_id: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a', // self-assign
    created_at: new Date('2025-09-22T10:05:00+08:00'),
  },
  {
    task_title: 'Design client onboarding forms',
    assignee_id: '32635261-038c-4405-b6ed-2d446738f94c', // Garrison (SMU)
    assignor_id: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a', // Joel (SMU)
    created_at: new Date('2025-09-22T10:06:00+08:00'),
  },
  {
    task_title: 'Develop finance KPIs for dashboard',
    assignee_id: '61ca6b82-6d42-4058-bb4c-9316e7079b24', // Ryan (SMU)
    assignor_id: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a', // Joel (SMU)
    created_at: new Date('2025-09-23T09:35:00+08:00'),
  },
  {
    task_title: 'Develop finance KPIs for dashboard',
    assignee_id: '67393282-3a06-452b-a05a-9c93a95b597f', // Kester (SMU)
    assignor_id: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a', // Joel (SMU)
    created_at: new Date('2025-09-23T09:36:00+08:00'),
  },
  {
    task_title: 'Migrate docs to cloud platform',
    assignee_id: '61ca6b82-6d42-4058-bb4c-9316e7079b24', // Ryan (SMU)
    assignor_id: '61ca6b82-6d42-4058-bb4c-9316e7079b24', // self-assign
    created_at: new Date('2025-09-23T11:05:00+08:00'),
  },
  {
    task_title: 'Migrate docs to cloud platform',
    assignee_id: '32635261-038c-4405-b6ed-2d446738f94c', // Garrison (SMU)
    assignor_id: '61ca6b82-6d42-4058-bb4c-9316e7079b24', // Ryan (SMU)
    created_at: new Date('2025-09-23T11:05:00+08:00'),
  },
  {
    task_title: 'Plan regional training sessions',
    assignee_id: '32635261-038c-4405-b6ed-2d446738f94c', // Garrison (SMU)
    assignor_id: '32635261-038c-4405-b6ed-2d446738f94c', // self-assign
    created_at: new Date('2025-09-24T09:05:00+08:00'),
  },
  {
    task_title: 'Plan regional training sessions',
    assignee_id: 'e1aa6307-0985-4f5b-b25b-0b37fbb8d964', // Mitch (SMU)
    assignor_id: '32635261-038c-4405-b6ed-2d446738f94c', // Garrison (SMU)
    created_at: new Date('2025-09-24T09:06:00+08:00'),
  },
  {
    task_title: 'Automate invoice approval workflow',
    assignee_id: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a', // Joel (SMU)
    assignor_id: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a', // self-assign
    created_at: new Date('2025-09-24T10:05:00+08:00'),
  },
  {
    task_title: 'Automate invoice approval workflow',
    assignee_id: '61ca6b82-6d42-4058-bb4c-9316e7079b24', // Ryan (SMU)
    assignor_id: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a', // Joel (SMU)
    created_at: new Date('2025-09-24T10:06:00+08:00'),
  },
  {
    task_title: 'Review FY25 revenue forecast',
    assignee_id: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a', // Joel (SMU)
    assignor_id: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a', // self-assign
    created_at: new Date('2025-09-25T09:35:00+08:00'),
  },
  {
    task_title: 'Review FY25 revenue forecast',
    assignee_id: '67393282-3a06-452b-a05a-9c93a95b597f', // Kester (SMU)
    assignor_id: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a', // Joel (SMU)
    created_at: new Date('2025-09-25T09:36:00+08:00'),
  },
  {
    task_title: 'Implement login auth flow',
    assignee_id: 'aa344933-c44b-4097-b0ac-56987a10734b', // Mitch (personal)
    assignor_id: 'e1aa6307-0985-4f5b-b25b-0b37fbb8d964', // Mitch (SMU)
    created_at: new Date('2025-09-25T10:05:00+08:00'),
  },
  {
    task_title: 'Implement login auth flow',
    assignee_id: '61ca6b82-6d42-4058-bb4c-9316e7079b24', // Ryan (SMU)
    assignor_id: 'e1aa6307-0985-4f5b-b25b-0b37fbb8d964', // Mitch (SMU)
    created_at: new Date('2025-09-25T10:06:00+08:00'),
  },
  {
    task_title: 'Setup CI/CD pipeline',
    assignee_id: '61ca6b82-6d42-4058-bb4c-9316e7079b24', // Ryan (SMU)
    assignor_id: '61ca6b82-6d42-4058-bb4c-9316e7079b24', // self-assign
    created_at: new Date('2025-09-25T12:05:00+08:00'),
  },
  {
    task_title: 'Setup CI/CD pipeline',
    assignee_id: 'e1aa6307-0985-4f5b-b25b-0b37fbb8d964', // Mitch (SMU)
    assignor_id: '61ca6b82-6d42-4058-bb4c-9316e7079b24', // Ryan (SMU)
    created_at: new Date('2025-09-25T12:06:00+08:00'),
  },
  {
    task_title: 'Create onboarding video',
    assignee_id: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a', // Joel (SMU)
    assignor_id: 'e1aa6307-0985-4f5b-b25b-0b37fbb8d964', // Mitch (SMU)
    created_at: new Date('2025-09-26T09:05:00+08:00'),
  },
  {
    task_title: 'Create onboarding video',
    assignee_id: 'e1aa6307-0985-4f5b-b25b-0b37fbb8d964', // Mitch (SMU)
    assignor_id: 'e1aa6307-0985-4f5b-b25b-0b37fbb8d964', // Mitch (SMU)
    created_at: new Date('2025-09-26T09:05:00+08:00'),
  },
  {
    task_title: 'Optimize dashboard queries',
    assignee_id: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a', // Joel (SMU)
    assignor_id: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a', // self-assign
    created_at: new Date('2025-09-26T11:05:00+08:00'),
  },
  {
    task_title: 'Optimize dashboard queries',
    assignee_id: '61ca6b82-6d42-4058-bb4c-9316e7079b24', // Ryan (SMU)
    assignor_id: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a', // Joel (SMU)
    created_at: new Date('2025-09-26T11:06:00+08:00'),
  },
  {
    task_title: 'Design API for mobile app',
    assignee_id: 'aa6209a7-be3b-477e-8426-62b8cfd7043b', // Ryan (personal)
    assignor_id: 'aa6209a7-be3b-477e-8426-62b8cfd7043b', // self-assign
    created_at: new Date('2025-09-27T10:05:00+08:00'),
  },
  {
    task_title: 'Design API for mobile app',
    assignee_id: '61ca6b82-6d42-4058-bb4c-9316e7079b24', // Ryan (SMU)
    assignor_id: 'aa6209a7-be3b-477e-8426-62b8cfd7043b', // Ryan (personal)
    created_at: new Date('2025-09-27T10:05:00+08:00'),
  },
  {
    task_title: 'Conduct UX testing',
    assignee_id: 'e1aa6307-0985-4f5b-b25b-0b37fbb8d964', // Mitch (SMU)
    assignor_id: 'e1aa6307-0985-4f5b-b25b-0b37fbb8d964', // self-assign
    created_at: new Date('2025-09-28T09:05:00+08:00'),
  },
  {
    task_title: 'Conduct UX testing',
    assignee_id: '61ca6b82-6d42-4058-bb4c-9316e7079b24', // Ryan (SMU)
    assignor_id: 'e1aa6307-0985-4f5b-b25b-0b37fbb8d964', // Mitch (SMU)
    created_at: new Date('2025-09-28T09:06:00+08:00'),
  },
  {
    task_title: 'Update project documentation',
    assignee_id: '32635261-038c-4405-b6ed-2d446738f94c', // Garrison (SMU)
    assignor_id: '32635261-038c-4405-b6ed-2d446738f94c', // self-assign
    created_at: new Date('2025-09-28T11:05:00+08:00'),
  },
  {
    task_title: 'Update project documentation',
    assignee_id: 'e1aa6307-0985-4f5b-b25b-0b37fbb8d964', // Mitch (SMU)
    assignor_id: '32635261-038c-4405-b6ed-2d446738f94c', // Garrison (SMU)
    created_at: new Date('2025-09-28T11:06:00+08:00'),
  },
  {
    task_title: 'Refactor data pipelines',
    assignee_id: '61ca6b82-6d42-4058-bb4c-9316e7079b24', // Ryan (SMU)
    assignor_id: '61ca6b82-6d42-4058-bb4c-9316e7079b24', // self-assign
    created_at: new Date('2025-09-29T09:35:00+08:00'),
  },
  {
    task_title: 'Refactor data pipelines',
    assignee_id: '67393282-3a06-452b-a05a-9c93a95b597f', // Kester (SMU)
    assignor_id: '61ca6b82-6d42-4058-bb4c-9316e7079b24', // Ryan (SMU)
    created_at: new Date('2025-09-29T09:35:00+08:00'),
  },
  {
    task_title: 'Prepare finance report',
    assignee_id: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a', // Joel (SMU)
    assignor_id: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a', // self-assign
    created_at: new Date('2025-09-30T10:05:00+08:00'),
  },
  {
    task_title: 'Prepare finance report',
    assignee_id: '67393282-3a06-452b-a05a-9c93a95b597f', // Kester (SMU)
    assignor_id: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a', // Joel (SMU)
    created_at: new Date('2025-09-30T10:05:00+08:00'),
  },
  {
    task_title: 'Setup analytics dashboards',
    assignee_id: 'e1aa6307-0985-4f5b-b25b-0b37fbb8d964', // Mitch (SMU)
    assignor_id: 'e1aa6307-0985-4f5b-b25b-0b37fbb8d964', // self-assign
    created_at: new Date('2025-10-01T09:05:00+08:00'),
  },
  {
    task_title: 'Setup analytics dashboards',
    assignee_id: '61ca6b82-6d42-4058-bb4c-9316e7079b24', // Ryan (SMU)
    assignor_id: 'e1aa6307-0985-4f5b-b25b-0b37fbb8d964', // Mitch (SMU)
    created_at: new Date('2025-10-01T09:05:00+08:00'),
  },
];

/* ======================== ATTACHMENTS (paths only; files not uploaded by seed) ======================== */
export const task_attachments = [
  {
    task_title: 'Design budget dashboard layout',
    storage_path: 'task-attachments/1/design_doc.pdf',
    uploaded_by: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a', // Joel (SMU)
    uploaded_at: new Date('2025-09-19T10:30:00+08:00'),
  },
  {
    task_title: 'Design budget dashboard layout',
    storage_path: 'task-attachments/1/wireframe.png',
    uploaded_by: 'e1aa6307-0985-4f5b-b25b-0b37fbb8d964', // Mitch (SMU)
    uploaded_at: new Date('2025-09-19T11:10:00+08:00'),
  },
  {
    task_title: 'Connect sales data source',
    storage_path: 'task-attachments/3/etl_mapping.xlsx',
    uploaded_by: '32635261-038c-4405-b6ed-2d446738f94c', // Garrison (SMU)
    uploaded_at: new Date('2025-09-20T09:30:00+08:00'),
  },
  {
    task_title: 'Roll out collaboration tools to SG office',
    storage_path: 'TEST FILE.pdf',
    uploaded_by: '32635261-038c-4405-b6ed-2d446738f94c',
    uploaded_at: new Date('2025-09-21T09:15:00+08:00'),
  },
  {
    task_title: 'Design client onboarding forms',
    storage_path: 'task-attachments/5/onboarding_forms.xlsx',
    uploaded_by: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a',
    uploaded_at: new Date('2025-09-22T10:15:00+08:00'),
  },
];

/* ======================== NOTIFICATIONS ======================== */
export const notifications = [
  {
    user_id: '61ca6b82-6d42-4058-bb4c-9316e7079b24', // Ryan (SMU)
    title: 'Task assigned',
    message: 'You have been assigned to "Implement task board drag/drop".',
    type: 'task',
    read: false,
    created_at: new Date('2025-09-19T10:22:05+08:00'),
    updated_at: new Date('2025-09-19T10:22:05+08:00'),
  },
];

/* ======================== COMMENTS ======================== */
export const task_comments = [
  {
    task_title: 'Design budget dashboard layout',
    user_id: '61ca6b82-6d42-4058-bb4c-9316e7079b24', // Ryan (SMU)
    content: 'Add KPI tiles (spend, forecast, burn rate).',
    created_at: new Date('2025-09-19T10:40:00+08:00'),
    updated_at: new Date('2025-09-19T10:40:00+08:00'),
  },
  {
    task_title: 'Design budget dashboard layout',
    user_id: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a', // Joel (SMU)
    content: "Yup, I'll draft a KPI list and metrics definitions.",
    created_at: new Date('2025-09-19T11:00:00+08:00'),
    updated_at: new Date('2025-09-19T11:00:00+08:00'),
  },
  {
    task_title: 'Connect sales data source',
    user_id: '67393282-3a06-452b-a05a-9c93a95b597f', // Kester (SMU)
    content: 'Need access to SG mart. Who can approve?',
    created_at: new Date('2025-09-20T09:45:00+08:00'),
    updated_at: new Date('2025-09-20T09:45:00+08:00'),
  },
  {
    task_title: 'Implement login auth flow',
    user_id: 'e1aa6307-0985-4f5b-b25b-0b37fbb8d964', // Mitch (SMU)
    content: 'Remember to implement token refresh before expiry.',
    created_at: new Date('2025-09-25T14:00:00+08:00'),
    updated_at: new Date('2025-09-25T14:00:00+08:00'),
  },
  {
    task_title: 'Setup CI/CD pipeline',
    user_id: '61ca6b82-6d42-4058-bb4c-9316e7079b24', // Ryan (SMU)
    content: 'Pipeline configured with automatic deployment on PR merge.',
    created_at: new Date('2025-09-25T15:30:00+08:00'),
    updated_at: new Date('2025-09-25T15:30:00+08:00'),
  },
  {
    task_title: 'Create onboarding video',
    user_id: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a', // Joel (SMU)
    content: 'Should we include a section on regional compliance requirements?',
    created_at: new Date('2025-09-26T13:00:00+08:00'),
    updated_at: new Date('2025-09-26T13:00:00+08:00'),
  },
  {
    task_title: 'Design API for mobile app',
    user_id: '61ca6b82-6d42-4058-bb4c-9316e7079b24', // Ryan (SMU)
    content: "Let's use OpenAPI spec for documentation.",
    created_at: new Date('2025-09-27T14:00:00+08:00'),
    updated_at: new Date('2025-09-27T14:00:00+08:00'),
  },
  {
    task_title: 'Refactor data pipelines',
    user_id: '67393282-3a06-452b-a05a-9c93a95b597f', // Kester (SMU)
    content: 'Added retry logic with exponential backoff.',
    created_at: new Date('2025-09-29T16:00:00+08:00'),
    updated_at: new Date('2025-09-29T16:00:00+08:00'),
  },
  {
    task_title: 'Prepare finance report',
    user_id: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a', // Joel (SMU)
    content: 'Need Q3 actuals from accounting before finalizing.',
    created_at: new Date('2025-09-30T12:00:00+08:00'),
    updated_at: new Date('2025-09-30T12:00:00+08:00'),
  },
  {
    task_title: 'Setup analytics dashboards',
    user_id: 'e1aa6307-0985-4f5b-b25b-0b37fbb8d964', // Mitch (SMU)
    content: 'Connected to 3 data sources so far, working on CRM integration.',
    created_at: new Date('2025-10-01T15:00:00+08:00'),
    updated_at: new Date('2025-10-01T15:00:00+08:00'),
  },
];