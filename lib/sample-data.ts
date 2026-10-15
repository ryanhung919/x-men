/**
 * Demo dataset for NODAL.
 *
 * Everyone here is a fictional persona on the `nodal.demo` domain, except
 * `ryanhung919@gmail.com`, which is the project owner's own admin account.
 * No passwords live in this file: the seed route reads them from
 * DEMO_PASSWORD (all demo personas, including the owner) and GUEST_PASSWORD
 * (the public guest account).
 *
 * All dates are relative to the moment the seed runs, so the dashboard always
 * shows a realistic mix of finished, late, overdue and upcoming work. Call
 * `buildSampleData()` at seed time rather than caching its result.
 *
 * Report semantics this data is shaped around (see lib/services/report.ts):
 * - on time         = status Completed and updated_at <= deadline
 * - completion time = updated_at - created_at
 * - overdue         = not Completed and deadline < now
 * so updated_at is set deliberately for every task.
 */

/* ======================== PERSONAS ======================== */

export type PasswordEnv = 'DEMO_PASSWORD' | 'GUEST_PASSWORD';

export interface Persona {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  department_name: string;
  roles: Array<'staff' | 'manager' | 'admin' | 'demo_viewer'>;
  default_view: 'tasks' | 'schedule';
  password_env: PasswordEnv;
}

export const personas = {
  // Engineering Operations: the main demo team
  daniel: {
    id: '8b241273-ac8c-44f4-8f62-81b759789528',
    email: 'daniel.tan@nodal.demo',
    first_name: 'Daniel',
    last_name: 'Tan',
    department_name: 'Engineering Operations Division Director',
    roles: ['admin', 'manager', 'staff'],
    default_view: 'tasks',
    password_env: 'DEMO_PASSWORD',
  },
  weijie: {
    id: '44543879-c7c9-475c-b946-0a0cc04d9874',
    email: 'weijie.ong@nodal.demo',
    first_name: 'Wei Jie',
    last_name: 'Ong',
    department_name: 'Engineering Operations Division Director',
    roles: ['admin', 'manager', 'staff'],
    default_view: 'tasks',
    password_env: 'DEMO_PASSWORD',
  },
  hannah: {
    id: 'f7b96ff5-e0c2-4b47-a348-fc4f3ec88d9b',
    email: 'hannah.lee@nodal.demo',
    first_name: 'Hannah',
    last_name: 'Lee',
    department_name: 'Senior Engineers',
    roles: ['staff'],
    default_view: 'tasks',
    password_env: 'DEMO_PASSWORD',
  },
  kavya: {
    id: '896fdd75-a866-4941-b228-f92d8abbb361',
    email: 'kavya.menon@nodal.demo',
    first_name: 'Kavya',
    last_name: 'Menon',
    department_name: 'Junior Engineers',
    roles: ['staff'],
    default_view: 'tasks',
    password_env: 'DEMO_PASSWORD',
  },

  // Finance
  priya: {
    id: '567b705f-ed96-4172-ba14-440af578553d',
    email: 'priya.nair@nodal.demo',
    first_name: 'Priya',
    last_name: 'Nair',
    department_name: 'Finance Director',
    roles: ['admin', 'manager', 'staff'],
    default_view: 'tasks',
    password_env: 'DEMO_PASSWORD',
  },
  aisha: {
    id: 'b6bd482e-e002-4653-941e-3d5f7a7ce6b3',
    email: 'aisha.rahman@nodal.demo',
    first_name: 'Aisha',
    last_name: 'Rahman',
    department_name: 'Finance Director',
    roles: ['admin', 'manager', 'staff'],
    default_view: 'tasks',
    password_env: 'DEMO_PASSWORD',
  },
  ryan: {
    // Project owner's own account (kept on purpose).
    id: 'aa6209a7-be3b-477e-8426-62b8cfd7043b',
    email: 'ryanhung919@gmail.com',
    first_name: 'Ryan',
    last_name: 'Hung',
    department_name: 'Finance Managers',
    roles: ['admin', 'staff'],
    default_view: 'tasks',
    password_env: 'DEMO_PASSWORD',
  },
  farah: {
    id: 'd5779ca9-ee53-41dd-9bc4-0636a8e3fd27',
    email: 'farah.iskandar@nodal.demo',
    first_name: 'Farah',
    last_name: 'Iskandar',
    department_name: 'Finance Executive',
    roles: ['staff'],
    default_view: 'tasks',
    password_env: 'DEMO_PASSWORD',
  },

  // System Solutioning
  marcus: {
    id: '0923d9a9-4781-477c-8a5a-2a82287ba159',
    email: 'marcus.lim@nodal.demo',
    first_name: 'Marcus',
    last_name: 'Lim',
    department_name: 'System Solutioning Division Director',
    roles: ['admin', 'manager', 'staff'],
    default_view: 'schedule',
    password_env: 'DEMO_PASSWORD',
  },
  ethan: {
    id: '2ff99ef8-8050-4905-b4be-b88b53e853df',
    email: 'ethan.goh@nodal.demo',
    first_name: 'Ethan',
    last_name: 'Goh',
    department_name: 'System Solutioning Division Director',
    roles: ['staff'],
    default_view: 'tasks',
    password_env: 'DEMO_PASSWORD',
  },
  sofia: {
    id: '09f9fb50-3bad-47c7-ad00-24b909386e38',
    email: 'sofia.reyes@nodal.demo',
    first_name: 'Sofia',
    last_name: 'Reyes',
    department_name: 'Developers',
    roles: ['staff'],
    default_view: 'tasks',
    password_env: 'DEMO_PASSWORD',
  },
  omar: {
    id: '1ee6c80b-3ff0-41d6-a96b-1812a40272fd',
    email: 'omar.haddad@nodal.demo',
    first_name: 'Omar',
    last_name: 'Haddad',
    department_name: 'Support Team',
    roles: ['staff'],
    default_view: 'tasks',
    password_env: 'DEMO_PASSWORD',
  },

  // Public guest account (credentials go in the README). Staff plus the read-only
  // demo_viewer role: can open /report and see its RLS scope, but cannot write anything.
  guest: {
    id: 'b782f303-d0a5-401f-9dec-3abbf5c753c2',
    email: 'guest@nodal.demo',
    first_name: 'Guest',
    last_name: 'Visitor',
    department_name: 'Engineering Operations Division Director',
    roles: ['staff', 'demo_viewer'],
    default_view: 'tasks',
    password_env: 'GUEST_PASSWORD',
  },
} satisfies Record<string, Persona>;

export type PersonaKey = keyof typeof personas;
const P = personas as Record<PersonaKey, Persona>;

/* ======================== ORGANISATION CATALOG ======================== */
export const departments = [
  // Top Level
  { name: 'Managing Director', parent_department_name: null },

  // Second Level (Directors)
  { name: 'Sales Director', parent_department_name: 'Managing Director' },
  { name: 'Consultancy Division Director', parent_department_name: 'Managing Director' },
  { name: 'System Solutioning Division Director', parent_department_name: 'Managing Director' },
  { name: 'Engineering Operations Division Director', parent_department_name: 'Managing Director' },
  { name: 'HR and Admin Director', parent_department_name: 'Managing Director' },
  { name: 'Finance Director', parent_department_name: 'Managing Director' },
  { name: 'IT Director', parent_department_name: 'Managing Director' },

  // Third Level (Teams)
  { name: 'Sales Manager', parent_department_name: 'Sales Director' },
  { name: 'Consultant', parent_department_name: 'Consultancy Division Director' },
  { name: 'Developers', parent_department_name: 'System Solutioning Division Director' },
  { name: 'Support Team', parent_department_name: 'System Solutioning Division Director' },
  { name: 'Senior Engineers', parent_department_name: 'Engineering Operations Division Director' },
  { name: 'Junior Engineers', parent_department_name: 'Engineering Operations Division Director' },
  { name: 'Call Centre', parent_department_name: 'Engineering Operations Division Director' },
  {
    name: 'Operation Planning Team',
    parent_department_name: 'Engineering Operations Division Director',
  },
  { name: 'HR Team', parent_department_name: 'HR and Admin Director' },
  { name: 'L&D Team', parent_department_name: 'HR and Admin Director' },
  { name: 'Admin Team', parent_department_name: 'HR and Admin Director' },
  { name: 'Finance Managers', parent_department_name: 'Finance Director' },
  { name: 'IT Team', parent_department_name: 'IT Director' },

  // Fourth Level
  { name: 'Account Managers', parent_department_name: 'Sales Manager' },
  { name: 'Finance Executive', parent_department_name: 'Finance Managers' },
];

export const roles = [
  { role: 'staff' },
  { role: 'manager' },
  { role: 'admin' },
  { role: 'demo_viewer' },
];

export const projects = [
  { name: 'Customer Portal Revamp', is_archived: false },
  { name: 'Warehouse Sensor Rollout', is_archived: false },
  { name: 'Field Service Mobile App', is_archived: false },
  { name: 'Data Platform Migration', is_archived: false },
  { name: 'Office Network Refresh', is_archived: false },
  { name: 'FY26 Budget Planning', is_archived: false },
  { name: 'Q3 Financial Close', is_archived: false },
  { name: 'Vendor Onboarding Automation', is_archived: false },
  { name: 'Support Desk Playbook', is_archived: false },
  { name: 'Legacy CRM Decommission', is_archived: true },
];

export const tags = [
  { name: 'Budget' },
  { name: 'Design' },
  { name: 'Infra' },
  { name: 'Reporting' },
  { name: 'Security' },
  { name: 'Onboarding' },
  { name: 'Analytics' },
  { name: 'Automation' },
  { name: 'Recurring' },
];

/* ======================== TASK SPECS ======================== */
/*
 * Day offsets are relative to "now" at seed time: negative = past.
 * `updated` is when the task last changed; for Completed tasks it is the
 * completion moment that the reports use.
 */
interface TaskSpec {
  title: string;
  description: string;
  notes?: string;
  project: string;
  creator: PersonaKey;
  assignees: PersonaKey[];
  status: 'To Do' | 'In Progress' | 'Completed' | 'Blocked';
  priority: number;
  created: number;
  deadline: number | null;
  updated: number;
  hours: number;
  parent?: string;
  recurrence?: 0 | 1 | 7 | 30;
  archived?: boolean;
  tags?: string[];
}

const TASKS: TaskSpec[] = [
  /* ---- Customer Portal Revamp ---- */
  {
    title: 'Customer portal v2 launch',
    description: 'Ship the redesigned self-service portal to all B2B customers.',
    notes: 'Go/no-go review with Support two days before launch.',
    project: 'Customer Portal Revamp',
    creator: 'daniel',
    assignees: ['daniel', 'weijie', 'sofia'],
    status: 'In Progress',
    priority: 9,
    created: -68,
    deadline: 12,
    updated: -1,
    hours: 34,
    tags: ['Design', 'Infra'],
  },
  {
    title: 'Define portal information architecture',
    description: 'Card-sort with five customers and agree the new navigation tree.',
    project: 'Customer Portal Revamp',
    creator: 'weijie',
    assignees: ['weijie', 'sofia'],
    status: 'Completed',
    priority: 7,
    created: -66,
    deadline: -52,
    updated: -55.2,
    hours: 14,
    parent: 'Customer portal v2 launch',
    tags: ['Design'],
  },
  {
    title: 'Build account settings pages',
    description: 'Profile, billing contacts and notification preferences.',
    project: 'Customer Portal Revamp',
    creator: 'sofia',
    assignees: ['sofia', 'weijie'],
    status: 'Completed',
    priority: 6,
    created: -50,
    deadline: -30,
    updated: -27,
    hours: 22,
    parent: 'Customer portal v2 launch',
  },
  {
    title: 'Integrate SSO with customer directory',
    description: 'SAML login against each customer identity provider.',
    notes: 'Blocked: waiting on signed IdP certificates from two pilot customers.',
    project: 'Customer Portal Revamp',
    creator: 'daniel',
    assignees: ['weijie', 'marcus'],
    status: 'Blocked',
    priority: 8,
    created: -40,
    deadline: -5,
    updated: -6,
    hours: 11,
    parent: 'Customer portal v2 launch',
    tags: ['Security', 'Infra'],
  },
  {
    title: 'Write SSO rollback runbook',
    description: 'Step-by-step fallback to password login if SSO fails on launch day.',
    project: 'Customer Portal Revamp',
    creator: 'weijie',
    assignees: ['weijie'],
    status: 'To Do',
    priority: 5,
    created: -20,
    deadline: 6,
    updated: -20,
    hours: 0,
    parent: 'Integrate SSO with customer directory',
    tags: ['Security'],
  },
  {
    title: 'Portal accessibility audit',
    description: 'WCAG 2.2 AA pass on login, dashboard and invoices.',
    project: 'Customer Portal Revamp',
    creator: 'hannah',
    assignees: ['hannah', 'daniel'],
    status: 'In Progress',
    priority: 6,
    created: -18,
    deadline: 4,
    updated: -2,
    hours: 6,
    tags: ['Design'],
  },
  {
    title: 'Load test portal checkout flow',
    description: 'k6 scenario at 3x last year peak traffic.',
    project: 'Customer Portal Revamp',
    creator: 'kavya',
    assignees: ['kavya', 'weijie'],
    status: 'To Do',
    priority: 7,
    created: -9,
    deadline: 9,
    updated: -9,
    hours: 0,
    tags: ['Infra'],
  },
  {
    title: 'Portal release notes',
    description: 'Customer-facing summary of what changed in v2.',
    project: 'Customer Portal Revamp',
    creator: 'daniel',
    assignees: ['daniel', 'guest'],
    status: 'To Do',
    priority: 3,
    created: -2,
    deadline: 9,
    updated: -2,
    hours: 0,
  },

  /* ---- Warehouse Sensor Rollout ---- */
  {
    title: 'Install temperature sensors at Tuas warehouse',
    description: '48 sensors across cold-chain bays, wired to the new LoRa gateways.',
    project: 'Warehouse Sensor Rollout',
    creator: 'daniel',
    assignees: ['hannah', 'kavya', 'daniel'],
    status: 'Completed',
    priority: 8,
    created: -63,
    deadline: -40,
    updated: -42,
    hours: 40,
    tags: ['Infra'],
  },
  {
    title: 'Calibrate sensor thresholds',
    description: 'Set alert bands per bay using two weeks of baseline readings.',
    project: 'Warehouse Sensor Rollout',
    creator: 'hannah',
    assignees: ['hannah', 'weijie'],
    status: 'Completed',
    priority: 6,
    created: -45,
    deadline: -35,
    updated: -33.5,
    hours: 9,
    tags: ['Analytics'],
  },
  {
    title: 'Sensor alert routing to on-call',
    description: 'Route threshold breaches to the on-call rota with escalation.',
    project: 'Warehouse Sensor Rollout',
    creator: 'weijie',
    assignees: ['weijie', 'omar'],
    status: 'In Progress',
    priority: 8,
    created: -30,
    deadline: -3,
    updated: -1,
    hours: 16,
    tags: ['Automation'],
  },
  {
    title: 'Replace faulty gateway in Bay 4',
    description: 'Gateway drops packets above 30% humidity.',
    notes: 'Blocked: vendor RMA approved, replacement unit not yet shipped.',
    project: 'Warehouse Sensor Rollout',
    creator: 'kavya',
    assignees: ['kavya', 'daniel'],
    status: 'Blocked',
    priority: 9,
    created: -14,
    deadline: -2,
    updated: -3,
    hours: 3,
    tags: ['Infra'],
  },
  {
    title: 'Warehouse sensor rollout retrospective',
    description: 'What went well, what to change before the Jurong site.',
    project: 'Warehouse Sensor Rollout',
    creator: 'daniel',
    assignees: ['daniel', 'weijie', 'hannah'],
    status: 'To Do',
    priority: 3,
    created: -6,
    deadline: 18,
    updated: -6,
    hours: 0,
  },
  {
    title: 'Evaluate second sensor vendor',
    description: 'Price and battery-life comparison against the current vendor.',
    notes: 'Archived: procurement chose to stay with the current vendor.',
    project: 'Warehouse Sensor Rollout',
    creator: 'daniel',
    assignees: ['daniel', 'hannah'],
    status: 'To Do',
    priority: 3,
    created: -61,
    deadline: -45,
    updated: -50,
    hours: 2,
    archived: true,
  },

  /* ---- Field Service Mobile App ---- */
  {
    title: 'Offline job sheet sync',
    description: 'Technicians can complete job sheets with no signal; sync on reconnect.',
    project: 'Field Service Mobile App',
    creator: 'marcus',
    assignees: ['sofia', 'daniel'],
    status: 'In Progress',
    priority: 8,
    created: -48,
    deadline: -10,
    updated: -2,
    hours: 28,
    tags: ['Infra'],
  },
  {
    title: 'Technician photo upload',
    description: 'Compress and attach before/after photos to each job.',
    project: 'Field Service Mobile App',
    creator: 'sofia',
    assignees: ['sofia', 'weijie'],
    status: 'Completed',
    priority: 6,
    created: -42,
    deadline: -25,
    updated: -24.7,
    hours: 12,
  },
  {
    title: 'Push notifications for job changes',
    description: 'Notify technicians when a job is reassigned or rescheduled.',
    project: 'Field Service Mobile App',
    creator: 'marcus',
    assignees: ['marcus', 'weijie'],
    status: 'To Do',
    priority: 5,
    created: -21,
    deadline: 15,
    updated: -21,
    hours: 0,
  },
  {
    title: 'Field app beta feedback triage',
    description: 'Sort the 60 beta reports into bugs, quick wins and backlog.',
    project: 'Field Service Mobile App',
    creator: 'daniel',
    assignees: ['daniel', 'omar'],
    status: 'In Progress',
    priority: 4,
    created: -12,
    deadline: 2,
    updated: -1,
    hours: 5,
  },
  {
    title: 'App store listing copy',
    description: 'Short description, screenshots and privacy labels.',
    project: 'Field Service Mobile App',
    creator: 'marcus',
    assignees: ['ethan', 'daniel'],
    status: 'Completed',
    priority: 2,
    created: -35,
    deadline: null,
    updated: -28,
    hours: 2,
  },

  /* ---- Data Platform Migration ---- */
  {
    title: 'Migrate nightly ETL to managed Postgres',
    description: 'Move the 14 nightly jobs off the on-prem server.',
    project: 'Data Platform Migration',
    creator: 'marcus',
    assignees: ['marcus', 'ethan', 'weijie'],
    status: 'Completed',
    priority: 9,
    created: -70,
    deadline: -45,
    updated: -49,
    hours: 52,
    tags: ['Infra', 'Reporting'],
  },
  {
    title: 'Backfill historical orders table',
    description: 'Load 2019-2024 orders and reconcile row counts.',
    project: 'Data Platform Migration',
    creator: 'ethan',
    assignees: ['ethan', 'weijie'],
    status: 'Completed',
    priority: 7,
    created: -55,
    deadline: -38,
    updated: -36,
    hours: 18,
    parent: 'Migrate nightly ETL to managed Postgres',
  },
  {
    title: 'Retire on-prem reporting server',
    description: 'Decommission after two clean weeks on the new platform.',
    project: 'Data Platform Migration',
    creator: 'weijie',
    assignees: ['weijie', 'ethan'],
    status: 'To Do',
    priority: 6,
    created: -25,
    deadline: -1,
    updated: -25,
    hours: 1,
    tags: ['Infra'],
  },
  {
    title: 'Data quality checks for finance marts',
    description: 'Null, duplicate and freshness checks on the GL and AR marts.',
    project: 'Data Platform Migration',
    creator: 'priya',
    assignees: ['weijie', 'aisha'],
    status: 'In Progress',
    priority: 7,
    created: -28,
    deadline: 5,
    updated: -3,
    hours: 10,
    tags: ['Reporting', 'Analytics'],
  },
  {
    title: 'Document data platform access policy',
    description: 'Who can query what, and how to request access.',
    project: 'Data Platform Migration',
    creator: 'daniel',
    assignees: ['daniel'],
    status: 'Completed',
    priority: 3,
    created: -33,
    deadline: null,
    updated: -31,
    hours: 1.5,
    tags: ['Security'],
  },
  {
    title: 'Quarterly access review',
    description: 'Confirm every data platform account still needs its access.',
    project: 'Data Platform Migration',
    creator: 'weijie',
    assignees: ['weijie', 'guest'],
    status: 'In Progress',
    priority: 6,
    created: -11,
    deadline: 1,
    updated: -1,
    hours: 3,
    tags: ['Security'],
  },

  /* ---- Office Network Refresh ---- */
  {
    title: 'Replace office Wi-Fi access points',
    description: 'Swap 12 ageing access points for Wi-Fi 6E units.',
    project: 'Office Network Refresh',
    creator: 'daniel',
    assignees: ['kavya', 'daniel'],
    status: 'Completed',
    priority: 5,
    created: -58,
    deadline: -50,
    updated: -46,
    hours: 15,
    tags: ['Infra'],
  },
  {
    title: 'Firewall rule review',
    description: 'Remove stale rules and document the rest.',
    project: 'Office Network Refresh',
    creator: 'weijie',
    assignees: ['weijie', 'hannah'],
    status: 'Completed',
    priority: 7,
    created: -38,
    deadline: -30,
    updated: -31.5,
    hours: 6,
    tags: ['Security'],
  },
  {
    title: 'Monthly patch rollout',
    description: 'Apply OS and firmware patches to office and warehouse devices.',
    project: 'Office Network Refresh',
    creator: 'weijie',
    assignees: ['weijie', 'kavya'],
    status: 'To Do',
    priority: 6,
    created: -40,
    deadline: 6,
    updated: -10,
    hours: 4,
    recurrence: 30,
    tags: ['Recurring', 'Security'],
  },
  {
    title: 'Daily backup verification',
    description: 'Check last night backups completed and test-restore one file.',
    project: 'Office Network Refresh',
    creator: 'daniel',
    assignees: ['kavya', 'daniel'],
    status: 'In Progress',
    priority: 5,
    created: -60,
    deadline: 1,
    updated: -1,
    hours: 20,
    recurrence: 1,
    tags: ['Recurring', 'Infra'],
  },
  {
    title: 'Weekly infra standup',
    description: '30 minutes: incidents, changes this week, blockers.',
    project: 'Office Network Refresh',
    creator: 'daniel',
    assignees: ['daniel', 'weijie', 'hannah', 'kavya'],
    status: 'To Do',
    priority: 4,
    created: -65,
    deadline: 3,
    updated: -4,
    hours: 13,
    recurrence: 7,
    tags: ['Recurring'],
  },
  {
    title: 'Rotate service account credentials',
    description: 'Rotate keys for the backup, monitoring and ETL service accounts.',
    project: 'Office Network Refresh',
    creator: 'hannah',
    assignees: ['hannah', 'weijie'],
    status: 'To Do',
    priority: 8,
    created: -3,
    deadline: 2,
    updated: -3,
    hours: 0,
    tags: ['Security'],
  },
  {
    title: 'Network cabinet labelling',
    description: 'Label patch panels on levels 3 and 4.',
    project: 'Office Network Refresh',
    creator: 'kavya',
    assignees: ['kavya', 'guest'],
    status: 'To Do',
    priority: 2,
    created: -4,
    deadline: null,
    updated: -4,
    hours: 0,
  },
  {
    title: 'Onboard new junior engineer',
    description: 'Laptop, accounts, buddy and a first-week plan.',
    project: 'Office Network Refresh',
    creator: 'daniel',
    assignees: ['daniel', 'kavya'],
    status: 'Completed',
    priority: 4,
    created: -26,
    deadline: -19,
    updated: -20,
    hours: 5,
    tags: ['Onboarding'],
  },

  /* ---- FY26 Budget Planning ---- */
  {
    title: 'FY26 budget submission',
    description: 'Consolidated FY26 operating and capex budget for board approval.',
    project: 'FY26 Budget Planning',
    creator: 'priya',
    assignees: ['priya', 'aisha', 'ryan'],
    status: 'In Progress',
    priority: 9,
    created: -50,
    deadline: 20,
    updated: -2,
    hours: 30,
    tags: ['Budget'],
  },
  {
    title: 'Collect department budget requests',
    description: 'Template out to every director; chase missing submissions.',
    project: 'FY26 Budget Planning',
    creator: 'aisha',
    assignees: ['aisha', 'farah', 'daniel'],
    status: 'Completed',
    priority: 7,
    created: -48,
    deadline: -30,
    updated: -32,
    hours: 12,
    parent: 'FY26 budget submission',
    tags: ['Budget'],
  },
  {
    title: 'Engineering Ops capex estimate',
    description: 'Sensors, network and laptop refresh for FY26.',
    project: 'FY26 Budget Planning',
    creator: 'daniel',
    assignees: ['daniel', 'weijie', 'ryan'],
    status: 'Completed',
    priority: 8,
    created: -40,
    deadline: -26,
    updated: -23,
    hours: 8,
    parent: 'FY26 budget submission',
    tags: ['Budget'],
  },
  {
    title: 'Headcount plan review',
    description: 'Check FY26 hiring plan against the salary budget.',
    project: 'FY26 Budget Planning',
    creator: 'ryan',
    assignees: ['ryan', 'priya'],
    status: 'To Do',
    priority: 6,
    created: -15,
    deadline: 10,
    updated: -15,
    hours: 0,
    parent: 'FY26 budget submission',
    tags: ['Budget'],
  },
  {
    title: 'Board budget presentation deck',
    description: '12 slides: headline numbers, risks, asks.',
    project: 'FY26 Budget Planning',
    creator: 'priya',
    assignees: ['priya', 'aisha'],
    status: 'To Do',
    priority: 7,
    created: -7,
    deadline: 21,
    updated: -7,
    hours: 0,
    tags: ['Budget', 'Reporting'],
  },
  {
    title: 'Weekly finance sync',
    description: 'Cash position, close progress and open approvals.',
    project: 'FY26 Budget Planning',
    creator: 'priya',
    assignees: ['priya', 'aisha', 'ryan', 'farah'],
    status: 'To Do',
    priority: 3,
    created: -60,
    deadline: 2,
    updated: -5,
    hours: 10,
    recurrence: 7,
    tags: ['Recurring'],
  },

  /* ---- Q3 Financial Close ---- */
  {
    title: 'Q3 accruals reconciliation',
    description: 'Reconcile accrued expenses against received invoices.',
    project: 'Q3 Financial Close',
    creator: 'aisha',
    assignees: ['aisha', 'farah'],
    status: 'Completed',
    priority: 8,
    created: -30,
    deadline: -12,
    updated: -13,
    hours: 14,
    tags: ['Reporting'],
  },
  {
    title: 'Intercompany invoice matching',
    description: 'Match SG and MY entity invoices before consolidation.',
    project: 'Q3 Financial Close',
    creator: 'farah',
    assignees: ['farah', 'ryan'],
    status: 'Completed',
    priority: 6,
    created: -28,
    deadline: -14,
    updated: -9,
    hours: 19,
  },
  {
    title: 'Q3 management report',
    description: 'P&L commentary and KPI pack for the leadership team.',
    project: 'Q3 Financial Close',
    creator: 'priya',
    assignees: ['priya', 'ryan', 'aisha'],
    status: 'In Progress',
    priority: 9,
    created: -16,
    deadline: -4,
    updated: -1,
    hours: 9,
    tags: ['Reporting'],
  },
  {
    title: 'Monthly expense report',
    description: 'Department spend vs budget, sent to directors.',
    project: 'Q3 Financial Close',
    creator: 'ryan',
    assignees: ['ryan', 'farah'],
    status: 'To Do',
    priority: 5,
    created: -45,
    deadline: 16,
    updated: -15,
    hours: 6,
    recurrence: 30,
    tags: ['Recurring', 'Budget'],
  },
  {
    title: 'Fixed asset register update',
    description: 'Add Q3 equipment purchases and disposals.',
    notes: 'Blocked: waiting for the Engineering Ops asset list.',
    project: 'Q3 Financial Close',
    creator: 'farah',
    assignees: ['farah', 'weijie'],
    status: 'Blocked',
    priority: 4,
    created: -10,
    deadline: 3,
    updated: -5,
    hours: 2,
  },

  /* ---- Vendor Onboarding Automation ---- */
  {
    title: 'Vendor onboarding workflow design',
    description: 'Map the current 9-step email process and design the new flow.',
    project: 'Vendor Onboarding Automation',
    creator: 'priya',
    assignees: ['priya', 'daniel'],
    status: 'Completed',
    priority: 7,
    created: -56,
    deadline: -42,
    updated: -43,
    hours: 10,
    tags: ['Automation'],
  },
  {
    title: 'Automate vendor bank detail verification',
    description: 'Penny-test new bank details and flag mismatches for review.',
    project: 'Vendor Onboarding Automation',
    creator: 'daniel',
    assignees: ['weijie', 'farah'],
    status: 'In Progress',
    priority: 8,
    created: -35,
    deadline: -6,
    updated: -2,
    hours: 21,
    tags: ['Automation', 'Security'],
  },
  {
    title: 'Vendor portal e-signature integration',
    description: 'Vendors sign the master agreement inside the portal.',
    project: 'Vendor Onboarding Automation',
    creator: 'marcus',
    assignees: ['sofia', 'weijie'],
    status: 'To Do',
    priority: 6,
    created: -8,
    deadline: 13,
    updated: -8,
    hours: 0,
  },
  {
    title: 'Vendor master data cleanup',
    description: 'Merge duplicate vendors and close dormant accounts.',
    project: 'Vendor Onboarding Automation',
    creator: 'ryan',
    assignees: ['ryan', 'farah'],
    status: 'Completed',
    priority: 5,
    created: -24,
    deadline: null,
    updated: -19,
    hours: 7,
  },

  /* ---- Support Desk Playbook ---- */
  {
    title: 'Draft L1 support playbook',
    description: 'Top 20 ticket types with first-response steps.',
    project: 'Support Desk Playbook',
    creator: 'marcus',
    assignees: ['omar', 'ethan'],
    status: 'Completed',
    priority: 5,
    created: -52,
    deadline: -36,
    updated: -38,
    hours: 9,
    tags: ['Onboarding'],
  },
  {
    title: 'Escalation matrix for field incidents',
    description: 'Who to call, by severity and time of day.',
    project: 'Support Desk Playbook',
    creator: 'omar',
    assignees: ['omar', 'daniel'],
    status: 'In Progress',
    priority: 6,
    created: -20,
    deadline: 8,
    updated: -3,
    hours: 4,
  },
  {
    title: 'Support macros for portal launch',
    description: 'Canned replies for the expected launch-week questions.',
    project: 'Support Desk Playbook',
    creator: 'ethan',
    assignees: ['omar', 'ethan'],
    status: 'To Do',
    priority: 4,
    created: -5,
    deadline: 11,
    updated: -5,
    hours: 0,
  },

  /* ---- Legacy CRM Decommission (archived project) ---- */
  {
    title: 'Export legacy CRM contacts',
    description: 'Full export with consent flags for the new CRM import.',
    project: 'Legacy CRM Decommission',
    creator: 'marcus',
    assignees: ['ethan', 'weijie'],
    status: 'Completed',
    priority: 6,
    created: -72,
    deadline: -60,
    updated: -61,
    hours: 8,
    archived: true,
  },
  {
    title: 'Shut down legacy CRM servers',
    description: 'Power off, wipe disks, return the rack space.',
    project: 'Legacy CRM Decommission',
    creator: 'weijie',
    assignees: ['weijie'],
    status: 'Completed',
    priority: 5,
    created: -64,
    deadline: -55,
    updated: -54,
    hours: 3,
    archived: true,
  },
];

interface CommentSpec {
  task: string;
  by: PersonaKey;
  at: number;
  text: string;
}

const COMMENTS: CommentSpec[] = [
  { task: 'Customer portal v2 launch', by: 'daniel', at: -60, text: 'Kick-off done. Target is a soft launch to the three pilot customers first.' },
  { task: 'Customer portal v2 launch', by: 'sofia', at: -21, text: 'Settings pages are merged. Invoices view is next.' },
  { task: 'Customer portal v2 launch', by: 'weijie', at: -4, text: 'SSO is the only thing on the critical path now. Everything else is on track.' },
  { task: 'Customer portal v2 launch', by: 'daniel', at: -1, text: 'Agreed. If certificates are not in by Friday we launch with password login and switch SSO on later.' },
  { task: 'Integrate SSO with customer directory', by: 'marcus', at: -9, text: 'Pilot customer A sent metadata, still waiting on B and C.' },
  { task: 'Integrate SSO with customer directory', by: 'weijie', at: -6, text: 'Marking as blocked until we have all three certificates.' },
  { task: 'Portal accessibility audit', by: 'hannah', at: -2, text: 'Login and dashboard pass. Invoice table needs proper header cells.' },
  { task: 'Sensor alert routing to on-call', by: 'omar', at: -5, text: 'On-call rota is in the paging tool now, you can point the webhook at it.' },
  { task: 'Sensor alert routing to on-call', by: 'weijie', at: -1, text: 'Escalation works in staging. Testing the night-shift path tomorrow.' },
  { task: 'Replace faulty gateway in Bay 4', by: 'kavya', at: -3, text: 'Vendor confirmed the RMA. Moving Bay 4 sensors to the Bay 3 gateway in the meantime.' },
  { task: 'Install temperature sensors at Tuas warehouse', by: 'hannah', at: -44, text: 'All 48 sensors reporting. Two needed new batteries out of the box.' },
  { task: 'Offline job sheet sync', by: 'sofia', at: -12, text: 'Conflict resolution is harder than expected when two technicians edit the same job.' },
  { task: 'Offline job sheet sync', by: 'daniel', at: -2, text: "Last-write-wins per field is fine for the beta. Let's not over-engineer it." },
  { task: 'Field app beta feedback triage', by: 'omar', at: -1, text: '41 of 60 sorted. Most common issue is the photo upload on older Android phones.' },
  { task: 'Migrate nightly ETL to managed Postgres', by: 'ethan', at: -50, text: 'All 14 jobs green for five nights in a row.' },
  { task: 'Data quality checks for finance marts', by: 'aisha', at: -3, text: 'Freshness check flagged the AR mart twice this week. Can we look at the load window?' },
  { task: 'Data quality checks for finance marts', by: 'weijie', at: -3, text: 'The AR extract runs after the check. Moving the check to 06:30.' },
  { task: 'FY26 budget submission', by: 'priya', at: -10, text: 'All departments except Sales have submitted.' },
  { task: 'FY26 budget submission', by: 'ryan', at: -2, text: 'Consolidated draft is in the shared folder. Capex is 8% over the guideline.' },
  { task: 'Engineering Ops capex estimate', by: 'daniel', at: -24, text: 'Attached the estimate. The sensor line can move to H2 if we need to cut.' },
  { task: 'Q3 management report', by: 'priya', at: -2, text: 'Need the intercompany numbers before I can finish the commentary.' },
  { task: 'Q3 management report', by: 'ryan', at: -1, text: 'Intercompany is done, numbers are in the pack.' },
  { task: 'Automate vendor bank detail verification', by: 'farah', at: -7, text: 'Finance needs a manual override for vendors with no local bank account.' },
  { task: 'Automate vendor bank detail verification', by: 'weijie', at: -2, text: 'Override added behind the approver role. Ready for UAT.' },
  { task: 'Fixed asset register update', by: 'farah', at: -5, text: 'Waiting on the asset list from Engineering Ops.' },
  { task: 'Escalation matrix for field incidents', by: 'daniel', at: -3, text: 'Add the warehouse duty manager for anything temperature related.' },
  { task: 'Monthly patch rollout', by: 'kavya', at: -10, text: 'Last month went cleanly. Two laptops needed a second reboot.' },
];

interface AttachmentSpec {
  task: string;
  by: PersonaKey;
  at: number;
  file: string;
  contentType: string;
}

const ATTACHMENTS: AttachmentSpec[] = [
  { task: 'Define portal information architecture', by: 'weijie', at: -56, file: 'portal-sitemap.csv', contentType: 'text/csv' },
  { task: 'Integrate SSO with customer directory', by: 'marcus', at: -9, file: 'sso-certificate-checklist.txt', contentType: 'text/plain' },
  { task: 'Calibrate sensor thresholds', by: 'hannah', at: -34, file: 'sensor-thresholds.csv', contentType: 'text/csv' },
  { task: 'Engineering Ops capex estimate', by: 'daniel', at: -24, file: 'eng-ops-capex-fy26.csv', contentType: 'text/csv' },
  { task: 'Customer portal v2 launch', by: 'daniel', at: -30, file: 'portal-launch-plan.txt', contentType: 'text/plain' },
  { task: 'Q3 accruals reconciliation', by: 'aisha', at: -13, file: 'q3-accruals.csv', contentType: 'text/csv' },
  { task: 'Vendor onboarding workflow design', by: 'priya', at: -44, file: 'vendor-onboarding-flow.txt', contentType: 'text/plain' },
  { task: 'Firewall rule review', by: 'weijie', at: -32, file: 'firewall-review-notes.txt', contentType: 'text/plain' },
];

/* ======================== BUILDERS ======================== */

const DAY_MS = 24 * 60 * 60 * 1000;

/** now + days, pinned to a working hour so timestamps look human. */
function at(now: Date, days: number, hour = 10): Date {
  const whole = Math.trunc(days);
  const frac = days - whole;
  const d = new Date(now.getTime() + whole * DAY_MS);
  d.setHours(hour, 0, 0, 0);
  // Fractions shift within the day (e.g. -24.7 = 0.7 days earlier than -24).
  const shifted = new Date(d.getTime() + frac * DAY_MS);
  // Past offsets must never land in the future (e.g. "-1" when it is 08:00).
  if (days <= 0 && shifted > now) return new Date(now.getTime() - 60 * 60 * 1000);
  return shifted;
}

function fileBody(file: string): string {
  if (file.endsWith('.csv')) {
    return 'item,owner,amount,status\nLine item A,Engineering Ops,12000,approved\nLine item B,Finance,4500,in review\n';
  }
  return `${file}\n\nDemo attachment created by the NODAL seed. Contents are illustrative only.\n`;
}

export function buildSampleData(now: Date = new Date()) {
  const personaList: Persona[] = Object.values(P);

  const user_info = personaList.map((p) => ({
    id: p.id,
    first_name: p.first_name,
    last_name: p.last_name,
    default_view: p.default_view,
    department_name: p.department_name,
  }));

  const user_roles = personaList.flatMap((p) =>
    p.roles.map((role) => ({ user_id: p.id, role }))
  );

  const tasks = TASKS.map((t) => ({
    title: t.title,
    description: t.description,
    priority_bucket: t.priority,
    status: t.status,
    creator_id: P[t.creator].id,
    project_name: t.project,
    deadline: t.deadline === null ? null : at(now, t.deadline, 17),
    notes: t.notes ?? null,
    parent_task_external_key: t.parent ?? null,
    is_archived: t.archived ?? false,
    created_at: at(now, t.created, 9),
    updated_at: at(now, t.updated, 15),
    recurrence_interval: t.recurrence ?? 0,
    recurrence_date: t.recurrence ? at(now, t.created, 9) : null,
    logged_time: Math.round(t.hours * 3600),
  }));

  const task_tags = TASKS.flatMap((t) =>
    (t.tags ?? []).map((tag_name) => ({ task_title: t.title, tag_name }))
  );

  const task_assignments = TASKS.flatMap((t) =>
    t.assignees.map((a, i) => ({
      task_title: t.title,
      assignee_id: P[a].id,
      assignor_id: P[t.creator].id,
      created_at: new Date(at(now, t.created, 9).getTime() + (i + 1) * 60 * 1000),
    }))
  );

  // Link every project to the departments of everyone working on it
  // (the trg_update_project_departments trigger does the same at runtime).
  const pd = new Set<string>();
  for (const t of TASKS) {
    for (const k of [t.creator, ...t.assignees]) {
      pd.add(`${t.project}|${P[k].department_name}`);
    }
  }
  const project_departments = [...pd].map((key) => {
    const [project_name, department_name] = key.split('|');
    return { project_name, department_name };
  });

  const task_comments = COMMENTS.map((c) => {
    const ts = at(now, c.at, 11);
    return { task_title: c.task, user_id: P[c.by].id, content: c.text, created_at: ts, updated_at: ts };
  });

  const task_attachments = ATTACHMENTS.map((a) => ({
    task_title: a.task,
    file_name: a.file,
    content_type: a.contentType,
    body: fileBody(a.file),
    uploaded_by: P[a.by].id,
    uploaded_at: at(now, a.at, 14),
  }));

  // Notifications mirror what the DB triggers would have produced for
  // assignments and comments. Older ones are read, recent ones unread.
  const byTitle = new Map(TASKS.map((t) => [t.title, t]));
  const fullName = (k: PersonaKey) => `${P[k].first_name} ${P[k].last_name}`;
  const notifications: Array<{
    user_id: string;
    title: string;
    message: string;
    type: string;
    read: boolean;
    is_archived: boolean;
    created_at: Date;
    updated_at: Date;
  }> = [];

  for (const t of TASKS) {
    if (t.archived) continue;
    for (const a of t.assignees) {
      if (a === t.creator) continue;
      const ts = at(now, t.created, 9);
      notifications.push({
        user_id: P[a].id,
        title: 'New Task Assignment',
        message: `${fullName(t.creator)} assigned you to task: "${t.title}"`,
        type: 'task_updated',
        read: t.created < -5,
        is_archived: false,
        created_at: ts,
        updated_at: ts,
      });
    }
  }
  for (const c of COMMENTS) {
    const t = byTitle.get(c.task)!;
    for (const a of t.assignees) {
      if (a === c.by) continue;
      const ts = at(now, c.at, 11);
      notifications.push({
        user_id: P[a].id,
        title: 'New Comment',
        message: `${fullName(c.by)} commented on task: "${t.title}"`,
        type: 'task_updated',
        read: c.at < -3,
        is_archived: false,
        created_at: ts,
        updated_at: ts,
      });
    }
  }

  return {
    personas: personaList,
    departments,
    roles,
    projects,
    tags,
    user_info,
    user_roles,
    project_departments,
    tasks,
    task_tags,
    task_assignments,
    task_comments,
    task_attachments,
    notifications,
  };
}

export type SampleData = ReturnType<typeof buildSampleData>;
