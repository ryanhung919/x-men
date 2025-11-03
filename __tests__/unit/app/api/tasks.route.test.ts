import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, GET } from '@/app/api/tasks/route';
import { getAllUsers, getAllProjects } from '@/lib/db/tasks';
import { createTaskService } from '@/lib/services/tasks';
import { NextRequest } from 'next/server';

// Mock the service layer
vi.mock('@/lib/services/tasks', () => ({
  createTaskService: vi.fn(),
}));

// Mock the database functions (for GET endpoint)
vi.mock('@/lib/db/tasks', () => ({
  getAllUsers: vi.fn(),
  getAllProjects: vi.fn(),
}));

// Mock the Supabase server client
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
  },
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabaseClient),
}));

describe('POST /api/tasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a task successfully with valid data', async () => {
    const mockUser = { id: 'user-123' };
    const taskId = 456;

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    (createTaskService as any).mockResolvedValue(taskId);

    const taskData = {
      project_id: 1,
      title: 'Test Task',
      description: 'Test description',
      priority_bucket: 5,
      status: 'todo',
      assignee_ids: ['user-123'],
      deadline: '2025-12-31',
    };

    const formData = new FormData();
    formData.append('taskData', JSON.stringify(taskData));

    const request = new NextRequest('http://localhost:3000/api/tasks', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.taskId).toBe(taskId);
    expect(data.message).toBe('Task created successfully');
    expect(createTaskService).toHaveBeenCalledWith(
      mockSupabaseClient,
      taskData,
      mockUser.id,
      []
    );
  });

  it('should create a task with file attachments', async () => {
    const mockUser = { id: 'user-123' };
    const taskId = 789;

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    (createTaskService as any).mockResolvedValue(taskId);

    const taskData = {
      project_id: 1,
      title: 'Test Task',
      description: 'Test description',
      priority_bucket: 5,
      status: 'todo',
      assignee_ids: ['user-123'],
      deadline: '2025-12-31',
    };

    const formData = new FormData();
    formData.append('taskData', JSON.stringify(taskData));

    // Create a mock file
    const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
    formData.append('file_0', mockFile);

    const request = new NextRequest('http://localhost:3000/api/tasks', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(createTaskService).toHaveBeenCalled();
  });

  it('should return 401 if user is not authenticated', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Unauthorized'),
    });

    const formData = new FormData();
    formData.append('taskData', JSON.stringify({ title: 'Test' }));

    const request = new NextRequest('http://localhost:3000/api/tasks', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
    expect(createTaskService).not.toHaveBeenCalled();
  });

  it('should return 400 if task data is missing', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const formData = new FormData();

    const request = new NextRequest('http://localhost:3000/api/tasks', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Missing task data');
    expect(createTaskService).not.toHaveBeenCalled();
  });

  it('should return 400 if task data is invalid JSON', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const formData = new FormData();
    formData.append('taskData', 'invalid json{');

    const request = new NextRequest('http://localhost:3000/api/tasks', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid task data format');
    expect(createTaskService).not.toHaveBeenCalled();
  });

  it('should return 400 if required field is missing (project_id)', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const taskData = {
      title: 'Test Task',
      description: 'Test description',
      priority_bucket: 5,
      status: 'todo',
      assignee_ids: ['user-123'],
      deadline: '2025-12-31',
    };

    const formData = new FormData();
    formData.append('taskData', JSON.stringify(taskData));

    const request = new NextRequest('http://localhost:3000/api/tasks', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Missing required field: project_id');
    expect(createTaskService).not.toHaveBeenCalled();
  });

  it('should return 400 if required field is missing (title)', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const taskData = {
      project_id: 1,
      description: 'Test description',
      priority_bucket: 5,
      status: 'todo',
      assignee_ids: ['user-123'],
      deadline: '2025-12-31',
    };

    const formData = new FormData();
    formData.append('taskData', JSON.stringify(taskData));

    const request = new NextRequest('http://localhost:3000/api/tasks', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Missing required field: title');
    expect(createTaskService).not.toHaveBeenCalled();
  });

  it('should return 400 if required field is missing (assignee_ids)', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const taskData = {
      project_id: 1,
      title: 'Test Task',
      description: 'Test description',
      priority_bucket: 5,
      status: 'todo',
      deadline: '2025-12-31',
    };

    const formData = new FormData();
    formData.append('taskData', JSON.stringify(taskData));

    const request = new NextRequest('http://localhost:3000/api/tasks', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Missing required field: assignee_ids');
    expect(createTaskService).not.toHaveBeenCalled();
  });

  it('should return 400 if priority bucket is too low', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const taskData = {
      project_id: 1,
      title: 'Test Task',
      description: 'Test description',
      priority_bucket: -1,
      status: 'todo',
      assignee_ids: ['user-123'],
      deadline: '2025-12-31',
    };

    const formData = new FormData();
    formData.append('taskData', JSON.stringify(taskData));

    const request = new NextRequest('http://localhost:3000/api/tasks', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Priority bucket must be between 1 and 10');
    expect(createTaskService).not.toHaveBeenCalled();
  });

  it('should return 400 if priority bucket is too high', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const taskData = {
      project_id: 1,
      title: 'Test Task',
      description: 'Test description',
      priority_bucket: 11,
      status: 'todo',
      assignee_ids: ['user-123'],
      deadline: '2025-12-31',
    };

    const formData = new FormData();
    formData.append('taskData', JSON.stringify(taskData));

    const request = new NextRequest('http://localhost:3000/api/tasks', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Priority bucket must be between 1 and 10');
    expect(createTaskService).not.toHaveBeenCalled();
  });

  it('should return 400 if assignee_ids is empty array', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const taskData = {
      project_id: 1,
      title: 'Test Task',
      description: 'Test description',
      priority_bucket: 5,
      status: 'todo',
      assignee_ids: [],
      deadline: '2025-12-31',
    };

    const formData = new FormData();
    formData.append('taskData', JSON.stringify(taskData));

    const request = new NextRequest('http://localhost:3000/api/tasks', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('At least one assignee is required');
    expect(createTaskService).not.toHaveBeenCalled();
  });

  it('should return 400 if assignee_ids is not an array', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const taskData = {
      project_id: 1,
      title: 'Test Task',
      description: 'Test description',
      priority_bucket: 5,
      status: 'todo',
      assignee_ids: 'user-123',
      deadline: '2025-12-31',
    };

    const formData = new FormData();
    formData.append('taskData', JSON.stringify(taskData));

    const request = new NextRequest('http://localhost:3000/api/tasks', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('At least one assignee is required');
    expect(createTaskService).not.toHaveBeenCalled();
  });

  it('should return 400 if assignee_ids exceeds maximum', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const taskData = {
      project_id: 1,
      title: 'Test Task',
      description: 'Test description',
      priority_bucket: 5,
      status: 'todo',
      assignee_ids: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6'],
      deadline: '2025-12-31',
    };

    const formData = new FormData();
    formData.append('taskData', JSON.stringify(taskData));

    const request = new NextRequest('http://localhost:3000/api/tasks', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Maximum 5 assignees allowed');
    expect(createTaskService).not.toHaveBeenCalled();
  });

  it('should return 400 if total file size exceeds 50MB', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const taskData = {
      project_id: 1,
      title: 'Test Task',
      description: 'Test description',
      priority_bucket: 5,
      status: 'todo',
      assignee_ids: ['user-123'],
      deadline: '2025-12-31',
    };

    const formData = new FormData();
    formData.append('taskData', JSON.stringify(taskData));

    // Create a large mock file (> 50MB)
    const largeContent = 'x'.repeat(51 * 1024 * 1024); // 51MB
    const largeFile = new File([largeContent], 'large.txt', { type: 'text/plain' });
    formData.append('file_0', largeFile);

    const request = new NextRequest('http://localhost:3000/api/tasks', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Total file size exceeds 50MB limit');
    expect(createTaskService).not.toHaveBeenCalled();
  });

  it('should return 500 if createTaskService throws an error', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    (createTaskService as any).mockRejectedValue(new Error('Database error'));

    const taskData = {
      project_id: 1,
      title: 'Test Task',
      description: 'Test description',
      priority_bucket: 5,
      status: 'todo',
      assignee_ids: ['user-123'],
      deadline: '2025-12-31',
    };

    const formData = new FormData();
    formData.append('taskData', JSON.stringify(taskData));

    const request = new NextRequest('http://localhost:3000/api/tasks', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Database error');
  });
});

describe('GET /api/tasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return users when action is "users"', async () => {
    const mockUser = { id: 'user-123' };
    const mockUsers = [
      { id: 'user-1', email: 'user1@example.com' },
      { id: 'user-2', email: 'user2@example.com' },
    ];

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    (getAllUsers as any).mockResolvedValue(mockUsers);

    const request = new NextRequest('http://localhost:3000/api/tasks?action=users', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.users).toEqual(mockUsers);
    expect(getAllUsers).toHaveBeenCalled();
  });

  it('should return projects when action is "projects"', async () => {
    const mockUser = { id: 'user-123' };
    const mockProjects = [
      { id: 1, name: 'Project 1' },
      { id: 2, name: 'Project 2' },
    ];

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    (getAllProjects as any).mockResolvedValue(mockProjects);

    const request = new NextRequest('http://localhost:3000/api/tasks?action=projects', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.projects).toEqual(mockProjects);
    expect(getAllProjects).toHaveBeenCalled();
  });

  it('should return 401 if user is not authenticated', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Unauthorized'),
    });

    const request = new NextRequest('http://localhost:3000/api/tasks?action=users', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
    expect(getAllUsers).not.toHaveBeenCalled();
    expect(getAllProjects).not.toHaveBeenCalled();
  });

  it('should return 400 if action parameter is missing', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const request = new NextRequest('http://localhost:3000/api/tasks', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid action parameter. Use "users" or "projects"');
    expect(getAllUsers).not.toHaveBeenCalled();
    expect(getAllProjects).not.toHaveBeenCalled();
  });

  it('should return 400 if action parameter is invalid', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const request = new NextRequest('http://localhost:3000/api/tasks?action=invalid', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid action parameter. Use "users" or "projects"');
    expect(getAllUsers).not.toHaveBeenCalled();
    expect(getAllProjects).not.toHaveBeenCalled();
  });

  it('should return 500 if getAllUsers throws an error', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    (getAllUsers as any).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/tasks?action=users', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Database error');
  });

  it('should return 500 if getAllProjects throws an error', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    (getAllProjects as any).mockRejectedValue(new Error('Database connection failed'));

    const request = new NextRequest('http://localhost:3000/api/tasks?action=projects', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Database connection failed');
  });
});
