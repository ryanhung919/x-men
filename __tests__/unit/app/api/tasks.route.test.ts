import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, GET } from '@/app/api/tasks/route';
import { createTask, getAllUsers, getAllProjects } from '@/lib/db/tasks';
import { NextRequest } from 'next/server';

// Polyfill File API for Node.js environment
if (typeof File === 'undefined') {
  global.File = class File extends Blob {
    name: string;
    lastModified: number;
    type: string;

    constructor(bits: BlobPart[], name: string, options?: FilePropertyBag) {
      super(bits, options);
      this.name = name;
      this.type = options?.type || '';
      this.lastModified = options?.lastModified ?? Date.now();
    }

    get [Symbol.toStringTag]() {
      return 'File';
    }
  } as any;
}

// Mock the database functions
vi.mock('@/lib/db/tasks', () => ({
  createTask: vi.fn(),
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

  it('should create a task successfully', async () => {
    const mockUser = { id: 'user-123' };
    const taskId = 456;

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    (createTask as any).mockResolvedValue(taskId);

    const formData = new FormData();
    formData.append(
      'taskData',
      JSON.stringify({
        project_id: 1,
        title: 'Test Task',
        description: 'Test Description',
        priority_bucket: 5,
        status: 'To Do',
        assignee_ids: ['user-456'],
        deadline: '2025-12-31T23:59:59Z',
      })
    );

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
    expect(createTask).toHaveBeenCalledWith(
      mockSupabaseClient,
      expect.objectContaining({
        project_id: 1,
        title: 'Test Task',
        description: 'Test Description',
        priority_bucket: 5,
        status: 'To Do',
        assignee_ids: ['user-456'],
        deadline: '2025-12-31T23:59:59Z',
      }),
      mockUser.id,
      []
    );
  });

  it('should return 401 if user is not authenticated', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Unauthorized'),
    });

    const formData = new FormData();
    formData.append(
      'taskData',
      JSON.stringify({
        project_id: 1,
        title: 'Test Task',
        description: 'Test Description',
        priority_bucket: 5,
        status: 'To Do',
        assignee_ids: ['user-456'],
        deadline: '2025-12-31T23:59:59Z',
      })
    );

    const request = new NextRequest('http://localhost:3000/api/tasks', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
    expect(createTask).not.toHaveBeenCalled();
  });

  it('should return 400 if taskData is missing', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const formData = new FormData();
    // No taskData appended

    const request = new NextRequest('http://localhost:3000/api/tasks', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Missing task data');
    expect(createTask).not.toHaveBeenCalled();
  });

  it('should return 400 if taskData is invalid JSON', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const formData = new FormData();
    formData.append('taskData', 'invalid json');

    const request = new NextRequest('http://localhost:3000/api/tasks', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid task data format');
    expect(createTask).not.toHaveBeenCalled();
  });

  it('should return 400 if required fields are missing', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const formData = new FormData();
    formData.append(
      'taskData',
      JSON.stringify({
        // Missing required fields
        title: 'Test Task',
      })
    );

    const request = new NextRequest('http://localhost:3000/api/tasks', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Missing required field');
    expect(createTask).not.toHaveBeenCalled();
  });

  it('should return 400 if priority_bucket is out of range', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const formData = new FormData();
    formData.append(
      'taskData',
      JSON.stringify({
        project_id: 1,
        title: 'Test Task',
        description: 'Test Description',
        priority_bucket: 11, // Out of range
        status: 'To Do',
        assignee_ids: ['user-456'],
        deadline: '2025-12-31T23:59:59Z',
      })
    );

    const request = new NextRequest('http://localhost:3000/api/tasks', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Priority bucket must be between 1 and 10');
    expect(createTask).not.toHaveBeenCalled();
  });

  it('should return 400 if no assignees provided', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const formData = new FormData();
    formData.append(
      'taskData',
      JSON.stringify({
        project_id: 1,
        title: 'Test Task',
        description: 'Test Description',
        priority_bucket: 5,
        status: 'To Do',
        assignee_ids: [], // Empty array
        deadline: '2025-12-31T23:59:59Z',
      })
    );

    const request = new NextRequest('http://localhost:3000/api/tasks', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('At least one assignee is required');
    expect(createTask).not.toHaveBeenCalled();
  });

  it('should return 400 if more than 5 assignees provided', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const formData = new FormData();
    formData.append(
      'taskData',
      JSON.stringify({
        project_id: 1,
        title: 'Test Task',
        description: 'Test Description',
        priority_bucket: 5,
        status: 'To Do',
        assignee_ids: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6'],
        deadline: '2025-12-31T23:59:59Z',
      })
    );

    const request = new NextRequest('http://localhost:3000/api/tasks', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Maximum 5 assignees allowed');
    expect(createTask).not.toHaveBeenCalled();
  });

  it('should handle file attachments', async () => {
    const mockUser = { id: 'user-123' };
    const taskId = 456;

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    (createTask as any).mockResolvedValue(taskId);

    const formData = new FormData();
    formData.append(
      'taskData',
      JSON.stringify({
        project_id: 1,
        title: 'Test Task',
        description: 'Test Description',
        priority_bucket: 5,
        status: 'To Do',
        assignee_ids: ['user-456'],
        deadline: '2025-12-31T23:59:59Z',
      })
    );

    const mockFile1 = new File(['test content 1'], 'test1.pdf', { type: 'application/pdf' });
    const mockFile2 = new File(['test content 2'], 'test2.pdf', { type: 'application/pdf' });
    formData.append('file_0', mockFile1);
    formData.append('file_1', mockFile2);

    const request = new NextRequest('http://localhost:3000/api/tasks', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);

    // Verify createTask was called with correct arguments
    expect(createTask).toHaveBeenCalledWith(
      mockSupabaseClient,
      expect.anything(),
      mockUser.id,
      expect.any(Array)
    );

    // Verify the files array has correct properties
    const callArgs = (createTask as any).mock.calls[0];
    const filesArray = callArgs[3];
    expect(filesArray).toHaveLength(2);
    expect(filesArray[0]).toHaveProperty('name', 'test1.pdf');
    expect(filesArray[0]).toHaveProperty('type', 'application/pdf');
    expect(filesArray[1]).toHaveProperty('name', 'test2.pdf');
    expect(filesArray[1]).toHaveProperty('type', 'application/pdf');
  });

  it('should return 400 if total file size exceeds 50MB', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const formData = new FormData();
    formData.append(
      'taskData',
      JSON.stringify({
        project_id: 1,
        title: 'Test Task',
        description: 'Test Description',
        priority_bucket: 5,
        status: 'To Do',
        assignee_ids: ['user-456'],
        deadline: '2025-12-31T23:59:59Z',
      })
    );

    // Create a file larger than 50MB
    const largeFileSize = 51 * 1024 * 1024; // 51MB
    const largeFile = new File([new ArrayBuffer(largeFileSize)], 'large.pdf', {
      type: 'application/pdf',
    });
    formData.append('file_0', largeFile);

    const request = new NextRequest('http://localhost:3000/api/tasks', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Total file size exceeds 50MB limit');
    expect(createTask).not.toHaveBeenCalled();
  });

  it('should return 500 if createTask throws an error', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    (createTask as any).mockRejectedValue(new Error('Database error'));

    const formData = new FormData();
    formData.append(
      'taskData',
      JSON.stringify({
        project_id: 1,
        title: 'Test Task',
        description: 'Test Description',
        priority_bucket: 5,
        status: 'To Do',
        assignee_ids: ['user-456'],
        deadline: '2025-12-31T23:59:59Z',
      })
    );

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

  it('should return users when action=users', async () => {
    const mockUser = { id: 'user-123' };
    const mockUsers = [
      { id: 'user-1', first_name: 'Alice', last_name: 'Smith' },
      { id: 'user-2', first_name: 'Bob', last_name: 'Jones' },
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

  it('should return projects when action=projects', async () => {
    const mockUser = { id: 'user-123' };
    const mockProjects = [
      { id: 1, name: 'Project A' },
      { id: 2, name: 'Project B' },
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

    (getAllProjects as any).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/tasks?action=projects', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Database error');
  });
});
