/* --------------------- AUTH USERS --------------------- */
export const authUsersFixtures = {
  alice: { 
    id: '11111111-1111-1111-1111-111111111111', 
    email: 'alice@example.com' 
  },
  bob: { 
    id: '22222222-2222-2222-2222-222222222222', 
    email: 'bob@example.com' 
  },
  carol: { 
    id: '33333333-3333-3333-3333-333333333333', 
    email: 'carol@example.com' 
  },
  dave: { 
    id: '44444444-4444-4444-4444-444444444444', 
    email: 'dave@example.com' 
  },
  eve: { 
    id: '55555555-5555-5555-5555-555555555555', 
    email: 'eve@example.com' 
  },
};

export const auth_users = Object.values(authUsersFixtures);

/* --------------------- NOTIFICATIONS --------------------- */
export const notificationsFixtures = {
  aliceTaskAssigned: {
    id: 1,
    user_id: authUsersFixtures.alice.id,
    title: 'New Task Assignment',
    message: 'Bob Johnson assigned you to task: "Design Homepage"',
    type: 'task_assigned',
    read: false,
    is_archived: false,
    created_at: new Date('2025-10-06T10:00:00Z').toISOString(),
    updated_at: new Date('2025-10-06T10:00:00Z').toISOString(),
  },
  bobTaskAssigned: {
    id: 2,
    user_id: authUsersFixtures.bob.id,
    title: 'New Task Assignment',
    message: 'Alice Smith assigned you to task: "Budget Report"',
    type: 'task_assigned',
    read: true,
    is_archived: false,
    created_at: new Date('2025-10-05T14:30:00Z').toISOString(),
    updated_at: new Date('2025-10-05T15:00:00Z').toISOString(),
  },
};


/* --------------------- DEPARTMENTS --------------------- */
export const departmentsFixtures = {
  engineering: { id: 1, name: 'Engineering', parent_department_id: null },
  finance: { id: 2, name: 'Finance', parent_department_id: null },
  operations: { id: 3, name: 'Operations', parent_department_id: 1 }, // child of Engineering
  marketing: { id: 4, name: 'Marketing', parent_department_id: null },
  hr: { id: 5, name: 'HR', parent_department_id: 4 }, // child of Marketing
};


export const departments = Object.values(departmentsFixtures);

/* --------------------- USER INFO --------------------- */
export const user_info = [
  { 
    id: authUsersFixtures.alice.id, 
    first_name: 'Alice', 
    last_name: 'Smith', 
    mode: 'light', 
    default_view: 'tasks', 
    department_id: departmentsFixtures.engineering.id 
  },
  { 
    id: authUsersFixtures.bob.id, 
    first_name: 'Bob', 
    last_name: 'Johnson', 
    mode: 'dark', 
    default_view: 'calendar', 
    department_id: departmentsFixtures.finance.id 
  },
  { 
    id: authUsersFixtures.carol.id, 
    first_name: 'Carol', 
    last_name: 'Williams', 
    mode: 'light', 
    default_view: 'tasks', 
    department_id: departmentsFixtures.operations.id 
  },
  { 
    id: authUsersFixtures.dave.id, 
    first_name: 'Dave', 
    last_name: 'Brown', 
    mode: 'light', 
    default_view: 'tasks', 
    department_id: departmentsFixtures.marketing.id 
  },
  { 
    id: authUsersFixtures.eve.id, 
    first_name: 'Eve', 
    last_name: 'Davis', 
    mode: 'dark', 
    default_view: 'tasks', 
    department_id: departmentsFixtures.hr.id 
  },
];

/* --------------------- ROLES --------------------- */
export const roles = [
  { role: 'staff' },
  { role: 'manager' },
  { role: 'admin' },
];

/* --------------------- USER ROLES --------------------- */
export const user_roles = [
  { user_id: authUsersFixtures.alice.id, role: 'admin' },
  { user_id: authUsersFixtures.bob.id, role: 'manager' },
  { user_id: authUsersFixtures.carol.id, role: 'staff' },
  { user_id: authUsersFixtures.dave.id, role: 'staff' },
  { user_id: authUsersFixtures.eve.id, role: 'staff' },
];

/* --------------------- PROJECTS --------------------- */
export const projectsFixtures = {
  alpha: { 
    id: 1, 
    name: 'Project Alpha', 
    is_archived: false, 
    created_at: new Date('2024-01-01'), 
    updated_at: new Date('2024-01-01') 
  },
  beta: { 
    id: 2, 
    name: 'Project Beta', 
    is_archived: false, 
    created_at: new Date('2024-01-02'), 
    updated_at: new Date('2024-01-02') 
  },
  gamma: { 
    id: 3, 
    name: 'Project Gamma', 
    is_archived: true, 
    created_at: new Date('2024-01-03'), 
    updated_at: new Date('2024-01-03') 
  },
  delta: { 
    id: 4, 
    name: 'Project Delta', 
    is_archived: false, 
    created_at: new Date('2024-01-04'), 
    updated_at: new Date('2024-01-04') 
  },
  epsilon: { 
    id: 5, 
    name: 'Project Epsilon', 
    is_archived: false, 
    created_at: new Date('2024-01-05'), 
    updated_at: new Date('2024-01-05') 
  },
};

export const projects = Object.values(projectsFixtures);

/* --------------------- PROJECT DEPARTMENTS --------------------- */
export const project_departments = [
  { project_id: projectsFixtures.alpha.id, department_id: departmentsFixtures.engineering.id },
  { project_id: projectsFixtures.alpha.id, department_id: departmentsFixtures.finance.id },
  { project_id: projectsFixtures.beta.id, department_id: departmentsFixtures.operations.id },
  { project_id: projectsFixtures.beta.id, department_id: departmentsFixtures.marketing.id },
  { project_id: projectsFixtures.gamma.id, department_id: departmentsFixtures.engineering.id },
  { project_id: projectsFixtures.delta.id, department_id: departmentsFixtures.finance.id },
  { project_id: projectsFixtures.delta.id, department_id: departmentsFixtures.hr.id },
  { project_id: projectsFixtures.epsilon.id, department_id: departmentsFixtures.operations.id },
];

/* --------------------- TAGS --------------------- */
export const tags = [
  { id: 1, name: 'Design' },
  { id: 2, name: 'Budget' },
  { id: 3, name: 'Reporting' },
  { id: 4, name: 'Collaboration' },
  { id: 5, name: 'Analytics' },
];

/* --------------------- TASKS --------------------- */
export const tasksFixtures = {
  designHomepage: {
    id: 1,
    title: 'Task 1',
    description: 'Design homepage',
    priority_bucket: 5,
    status: 'To Do',
    creator_id: authUsersFixtures.alice.id,
    project_id: projectsFixtures.alpha.id,
    deadline: new Date('2024-02-01'),
    notes: '',
    parent_task_id: null,
    recurrence_interval: 0,
    recurrence_date: null,
    logged_time: 0,
    is_archived: false,
    created_at: new Date('2024-01-10'),
    updated_at: new Date('2024-01-10'),
  },
  budgetReport: {
    id: 2,
    title: 'Task 2',
    description: 'Prepare budget report',
    priority_bucket: 7,
    status: 'In Progress',
    creator_id: authUsersFixtures.bob.id,
    project_id: projectsFixtures.alpha.id,
    deadline: new Date('2024-02-05'),
    notes: '',
    parent_task_id: null,
    recurrence_interval: 0,
    recurrence_date: null,
    logged_time: 0,
    is_archived: false,
    created_at: new Date('2024-01-11'),
    updated_at: new Date('2024-01-11'),
  },
  teamMeeting: {
    id: 3,
    title: 'Task 3',
    description: 'Team meeting',
    priority_bucket: 3,
    status: 'Completed',
    creator_id: authUsersFixtures.carol.id,
    project_id: projectsFixtures.beta.id,
    deadline: new Date('2024-02-10'),
    notes: '',
    parent_task_id: null,
    recurrence_interval: 7,
    recurrence_date: new Date('2024-02-17'),
    logged_time: 0,
    is_archived: false,
    created_at: new Date('2024-01-12'),
    updated_at: new Date('2024-01-12'),
  },
  marketingCampaign: {
    id: 4,
    title: 'Task 4',
    description: 'Launch marketing campaign',
    priority_bucket: 8,
    status: 'To Do',
    creator_id: authUsersFixtures.dave.id,
    project_id: projectsFixtures.beta.id,
    deadline: new Date('2024-02-15'),
    notes: '',
    parent_task_id: null,
    recurrence_interval: 0,
    recurrence_date: null,
    logged_time: 0,
    is_archived: false,
    created_at: new Date('2024-01-13'),
    updated_at: new Date('2024-01-13'),
  },
  analyticsDashboard: {
    id: 5,
    title: 'Task 5',
    description: 'Update analytics dashboard',
    priority_bucket: 6,
    status: 'In Progress',
    creator_id: authUsersFixtures.eve.id,
    project_id: projectsFixtures.epsilon.id,
    deadline: new Date('2024-02-20'),
    notes: '',
    parent_task_id: null,
    recurrence_interval: 0,
    recurrence_date: null,
    logged_time: 0,
    is_archived: false,
    created_at: new Date('2024-01-14'),
    updated_at: new Date('2024-01-14'),
  },
};

export const tasks = Object.values(tasksFixtures);

/* --------------------- TASK TAGS --------------------- */
export const task_tags = [
  { task_id: tasksFixtures.designHomepage.id, tag_id: 1 },
  { task_id: tasksFixtures.budgetReport.id, tag_id: 2 },
  { task_id: tasksFixtures.teamMeeting.id, tag_id: 4 },
  { task_id: tasksFixtures.marketingCampaign.id, tag_id: 4 },
  { task_id: tasksFixtures.analyticsDashboard.id, tag_id: 5 },
];

/* --------------------- TASK ASSIGNMENTS --------------------- */
export const task_assignments = [
  { 
    id: 1, 
    task_id: tasksFixtures.designHomepage.id, 
    assignee_id: authUsersFixtures.carol.id, 
    assignor_id: authUsersFixtures.alice.id, 
    created_at: new Date('2024-01-10') 
  },
  { 
    id: 2, 
    task_id: tasksFixtures.budgetReport.id, 
    assignee_id: authUsersFixtures.bob.id, 
    assignor_id: authUsersFixtures.alice.id, 
    created_at: new Date('2024-01-11') 
  },
  { 
    id: 3, 
    task_id: tasksFixtures.teamMeeting.id, 
    assignee_id: authUsersFixtures.dave.id, 
    assignor_id: authUsersFixtures.carol.id, 
    created_at: new Date('2024-01-12') 
  },
  { 
    id: 4, 
    task_id: tasksFixtures.marketingCampaign.id, 
    assignee_id: authUsersFixtures.eve.id, 
    assignor_id: authUsersFixtures.dave.id, 
    created_at: new Date('2024-01-13') 
  },
  { 
    id: 5, 
    task_id: tasksFixtures.analyticsDashboard.id, 
    assignee_id: authUsersFixtures.alice.id, 
    assignor_id: authUsersFixtures.eve.id, 
    created_at: new Date('2024-01-14') 
  },
];

/* --------------------- TASK ATTACHMENTS --------------------- */
export const task_attachments = [
  { 
    id: 1, 
    task_id: tasksFixtures.designHomepage.id, 
    storage_path: 'attachments/task1/file1.pdf', 
    uploaded_by: authUsersFixtures.alice.id, 
    uploaded_at: new Date('2024-01-10') 
  },
  { 
    id: 2, 
    task_id: tasksFixtures.budgetReport.id, 
    storage_path: 'attachments/task2/file2.docx', 
    uploaded_by: authUsersFixtures.bob.id, 
    uploaded_at: new Date('2024-01-11') 
  },
  { 
    id: 3, 
    task_id: tasksFixtures.teamMeeting.id, 
    storage_path: 'attachments/task3/file3.png', 
    uploaded_by: authUsersFixtures.carol.id, 
    uploaded_at: new Date('2024-01-12') 
  },
];

/* --------------------- TASK COMMENTS --------------------- */
export const task_comments = [
  { 
    id: 1, 
    task_id: tasksFixtures.designHomepage.id, 
    user_id: authUsersFixtures.bob.id, 
    content: 'Please review design', 
    created_at: new Date('2024-01-10'), 
    updated_at: new Date('2024-01-10'), 
    is_archived: false 
  },
  { 
    id: 2, 
    task_id: tasksFixtures.budgetReport.id, 
    user_id: authUsersFixtures.alice.id, 
    content: 'Budget numbers updated', 
    created_at: new Date('2024-01-11'), 
    updated_at: new Date('2024-01-11'), 
    is_archived: false 
  },
  { 
    id: 3, 
    task_id: tasksFixtures.teamMeeting.id, 
    user_id: authUsersFixtures.dave.id, 
    content: 'Meeting scheduled', 
    created_at: new Date('2024-01-12'), 
    updated_at: new Date('2024-01-12'), 
    is_archived: false 
  },
];

/* --------------------- NOTIFICATIONS --------------------- */
// Using notification fixtures defined earlier
export const notifications = Object.values(notificationsFixtures);