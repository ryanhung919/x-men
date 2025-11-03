import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PATCH } from '@/app/api/tasks/[id]/archive/route';
import { archiveTaskService } from '@/lib/services/tasks';
import { NextRequest } from 'next/server';

// Mock the service layer
vi.mock('@/lib/services/tasks', () => ({
  archiveTaskService: vi.fn(),
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

describe('PATCH /api/tasks/[id]/archive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should archive a task successfully when user is authorized', async () => {
    const mockUser = { id: 'user-123' };
    const taskId = 123;
    const affectedCount = 3; // Parent + 2 subtasks

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    (archiveTaskService as any).mockResolvedValue(affectedCount);

    const request = new NextRequest('http://localhost:3000/api/tasks/123/archive', {
      method: 'PATCH',
      body: JSON.stringify({ is_archived: true }),
    });

    const params = Promise.resolve({ id: '123' });
    const response = await PATCH(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.taskId).toBe(taskId);
    expect(data.affectedCount).toBe(affectedCount);
    expect(data.message).toContain('archived successfully');
    expect(archiveTaskService).toHaveBeenCalledWith(mockSupabaseClient, mockUser.id, taskId, true);
  });

  it('should unarchive a task successfully when user is authorized', async () => {
    const mockUser = { id: 'user-123' };
    const taskId = 456;
    const affectedCount = 1;

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    (archiveTaskService as any).mockResolvedValue(affectedCount);

    const request = new NextRequest('http://localhost:3000/api/tasks/456/archive', {
      method: 'PATCH',
      body: JSON.stringify({ is_archived: false }),
    });

    const params = Promise.resolve({ id: '456' });
    const response = await PATCH(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.taskId).toBe(taskId);
    expect(data.message).toContain('restored successfully');
    expect(archiveTaskService).toHaveBeenCalledWith(mockSupabaseClient, mockUser.id, taskId, false);
  });

  it('should return 401 if user is not authenticated', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Unauthorized'),
    });

    const request = new NextRequest('http://localhost:3000/api/tasks/123/archive', {
      method: 'PATCH',
      body: JSON.stringify({ is_archived: true }),
    });

    const params = Promise.resolve({ id: '123' });
    const response = await PATCH(request, { params });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
    expect(archiveTaskService).not.toHaveBeenCalled();
  });

  it('should return 403 if user is not a manager', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Service layer will check authorization and throw error
    (archiveTaskService as any).mockRejectedValue(new Error('Only managers can archive tasks'));

    const request = new NextRequest('http://localhost:3000/api/tasks/123/archive', {
      method: 'PATCH',
      body: JSON.stringify({ is_archived: true }),
    });

    const params = Promise.resolve({ id: '123' });
    const response = await PATCH(request, { params });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Only managers can archive tasks');
    expect(archiveTaskService).toHaveBeenCalledWith(mockSupabaseClient, mockUser.id, 123, true);
  });

  it('should return 400 if task ID is invalid', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });


    const request = new NextRequest('http://localhost:3000/api/tasks/invalid/archive', {
      method: 'PATCH',
      body: JSON.stringify({ is_archived: true }),
    });

    const params = Promise.resolve({ id: 'invalid' });
    const response = await PATCH(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid task ID');
    expect(archiveTaskService).not.toHaveBeenCalled();
  });

  it('should return 400 if is_archived is not a boolean', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });


    const request = new NextRequest('http://localhost:3000/api/tasks/123/archive', {
      method: 'PATCH',
      body: JSON.stringify({ is_archived: 'yes' }), // String instead of boolean
    });

    const params = Promise.resolve({ id: '123' });
    const response = await PATCH(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('is_archived must be a boolean');
    expect(archiveTaskService).not.toHaveBeenCalled();
  });

  it('should return 400 if is_archived is missing', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });


    const request = new NextRequest('http://localhost:3000/api/tasks/123/archive', {
      method: 'PATCH',
      body: JSON.stringify({}), // Missing is_archived
    });

    const params = Promise.resolve({ id: '123' });
    const response = await PATCH(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('is_archived must be a boolean');
    expect(archiveTaskService).not.toHaveBeenCalled();
  });

  it('should return 500 if archiveTask throws an error', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    (archiveTaskService as any).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/tasks/123/archive', {
      method: 'PATCH',
      body: JSON.stringify({ is_archived: true }),
    });

    const params = Promise.resolve({ id: '123' });
    const response = await PATCH(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Database error');
  });

  it('should return 500 if task does not exist', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    (archiveTaskService as any).mockRejectedValue(new Error('Task with ID 999 not found'));

    const request = new NextRequest('http://localhost:3000/api/tasks/999/archive', {
      method: 'PATCH',
      body: JSON.stringify({ is_archived: true }),
    });

    const params = Promise.resolve({ id: '999' });
    const response = await PATCH(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Task with ID 999 not found');
  });
});
