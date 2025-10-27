import { describe, it, expect, vi, beforeEach } from 'vitest';
import { archiveTask } from '@/lib/db/tasks';

// Mock Supabase client
const mockServiceClient = {
  from: vi.fn(),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockServiceClient),
}));

describe('archiveTask', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock chain for from().select().eq().single()
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockSingle = vi.fn();
    const mockUpdate = vi.fn().mockReturnThis();
    const mockIn = vi.fn();

    mockServiceClient.from.mockImplementation(() => ({
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
      update: mockUpdate,
      in: mockIn,
    }));
  });

  it('should successfully archive a task without subtasks', async () => {
    const taskId = 123;

    // Mock task exists check
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockSingle = vi.fn().mockResolvedValue({ data: { id: taskId }, error: null });
    const mockUpdate = vi.fn().mockReturnThis();
    const mockIn = vi.fn().mockResolvedValue({ error: null });

    let callCount = 0;
    mockServiceClient.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // First call: verify task exists
        return {
          select: mockSelect,
          eq: mockEq,
          single: mockSingle,
        };
      } else if (callCount === 2) {
        // Second call: fetch subtasks
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      } else {
        // Third call: update tasks
        return {
          update: mockUpdate,
          in: mockIn,
        };
      }
    });

    const affectedCount = await archiveTask(taskId, true);

    expect(affectedCount).toBe(1); // Only the parent task
    expect(mockServiceClient.from).toHaveBeenCalledWith('tasks');
    expect(mockUpdate).toHaveBeenCalledWith({ is_archived: true });
    expect(mockIn).toHaveBeenCalledWith('id', [taskId]);
  });

  it('should archive a task and its subtasks', async () => {
    const taskId = 123;
    const subtasks = [{ id: 124 }, { id: 125 }];

    let callCount = 0;
    mockServiceClient.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // First call: verify task exists
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: taskId }, error: null }),
        };
      } else if (callCount === 2) {
        // Second call: fetch subtasks
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: subtasks, error: null }),
        };
      } else {
        // Third call: update tasks
        return {
          update: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ error: null }),
        };
      }
    });

    const affectedCount = await archiveTask(taskId, true);

    expect(affectedCount).toBe(3); // Parent + 2 subtasks
  });

  it('should unarchive a task and its subtasks', async () => {
    const taskId = 123;
    const subtasks = [{ id: 124 }];

    let callCount = 0;
    const mockUpdate = vi.fn().mockReturnThis();
    const mockIn = vi.fn().mockResolvedValue({ error: null });

    mockServiceClient.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: taskId }, error: null }),
        };
      } else if (callCount === 2) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: subtasks, error: null }),
        };
      } else {
        return {
          update: mockUpdate,
          in: mockIn,
        };
      }
    });

    await archiveTask(taskId, false);

    expect(mockUpdate).toHaveBeenCalledWith({ is_archived: false });
    expect(mockIn).toHaveBeenCalledWith('id', [taskId, 124]);
  });

  it('should throw error if task does not exist', async () => {
    const taskId = 999;

    mockServiceClient.from.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
    }));

    await expect(archiveTask(taskId, true)).rejects.toThrow('Task with ID 999 not found');
  });

  it('should throw error if fetching subtasks fails', async () => {
    const taskId = 123;

    let callCount = 0;
    mockServiceClient.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: taskId }, error: null }),
        };
      } else {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
          }),
        };
      }
    });

    await expect(archiveTask(taskId, true)).rejects.toThrow('Failed to fetch subtasks');
  });

  it('should throw error if updating tasks fails', async () => {
    const taskId = 123;

    let callCount = 0;
    mockServiceClient.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: taskId }, error: null }),
        };
      } else if (callCount === 2) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      } else {
        return {
          update: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ error: { message: 'Update failed' } }),
        };
      }
    });

    await expect(archiveTask(taskId, true)).rejects.toThrow('Failed to archive tasks');
  });
});
