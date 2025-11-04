import { PATCH } from '@/app/api/tasks/[id]/route';
import {
    addAssignee,
    addComment,
    addTag,
    addTaskAttachments,
    deleteComment,
    linkSubtaskToParent,
    removeAssignee,
    removeTag,
    removeTaskAttachment,
    updateComment,
    updateDeadline,
    updateDescription,
    updateNotes,
    updatePriority,
    updateRecurrence,
    updateStatus,
    updateTitle,
} from '@/lib/services/tasks';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock all service functions
vi.mock('@/lib/services/tasks', () => ({
  updateTitle: vi.fn(),
  updateDescription: vi.fn(),
  updateStatus: vi.fn(),
  updatePriority: vi.fn(),
  updateDeadline: vi.fn(),
  updateNotes: vi.fn(),
  updateRecurrence: vi.fn(),
  addAssignee: vi.fn(),
  removeAssignee: vi.fn(),
  addTag: vi.fn(),
  removeTag: vi.fn(),
  addTaskAttachments: vi.fn(),
  removeTaskAttachment: vi.fn(),
  addComment: vi.fn(),
  updateComment: vi.fn(),
  deleteComment: vi.fn(),
  linkSubtaskToParent: vi.fn(),
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

describe('PATCH /api/tasks/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============ COMMON TESTS ============

  it('should return 401 if user is not authenticated', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Unauthorized'),
    });

    const request = new NextRequest('http://localhost:3000/api/tasks/1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'updateTitle', title: 'New Title' }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 400 if task ID is invalid', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const request = new NextRequest('http://localhost:3000/api/tasks/invalid', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'updateTitle', title: 'New Title' }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: 'invalid' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid task ID');
  });

  it('should return 400 if content type is invalid', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const request = new NextRequest('http://localhost:3000/api/tasks/1', {
      method: 'PATCH',
      body: 'invalid',
      headers: { 'content-type': 'text/plain' },
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid content type');
  });

  it('should return 400 if action is invalid', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const request = new NextRequest('http://localhost:3000/api/tasks/1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'invalidAction' }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid action');
  });

  it('should handle 500 errors gracefully', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    (updateTitle as any).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/tasks/1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'updateTitle', title: 'New Title' }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Database error');
  });

  // ============ UPDATE TITLE ============

  it('should update task title successfully', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    (updateTitle as any).mockResolvedValue({ id: 1, title: 'New Title' });

    const request = new NextRequest('http://localhost:3000/api/tasks/1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'updateTitle', title: 'New Title' }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe(1);
    expect(data.title).toBe('New Title');
    expect(updateTitle).toHaveBeenCalledWith(1, 'New Title', mockUser.id);
  });

  it('should return 400 if title is missing for updateTitle', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const request = new NextRequest('http://localhost:3000/api/tasks/1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'updateTitle' }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Title required');
    expect(updateTitle).not.toHaveBeenCalled();
  });

  // ============ UPDATE DESCRIPTION ============

  it('should update task description successfully', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    (updateDescription as any).mockResolvedValue({ id: 1, description: 'New description' });

    const request = new NextRequest('http://localhost:3000/api/tasks/1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'updateDescription', description: 'New description' }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe(1);
    expect(data.description).toBe('New description');
    expect(updateDescription).toHaveBeenCalledWith(1, 'New description', mockUser.id);
  });

  // ============ UPDATE STATUS ============

  it('should update task status successfully', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    (updateStatus as any).mockResolvedValue({ id: 1, status: 'In Progress' });

    const request = new NextRequest('http://localhost:3000/api/tasks/1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'updateStatus', status: 'In Progress' }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe(1);
    expect(data.status).toBe('In Progress');
    expect(updateStatus).toHaveBeenCalledWith(1, 'In Progress', mockUser.id);
  });

  it('should return 400 if status is missing for updateStatus', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const request = new NextRequest('http://localhost:3000/api/tasks/1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'updateStatus' }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Status required');
    expect(updateStatus).not.toHaveBeenCalled();
  });

  // ============ UPDATE PRIORITY ============

  it('should update task priority successfully', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    (updatePriority as any).mockResolvedValue({ id: 1, priority_bucket: 8 });

    const request = new NextRequest('http://localhost:3000/api/tasks/1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'updatePriority', priority_bucket: 8 }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe(1);
    expect(data.priority_bucket).toBe(8);
    expect(updatePriority).toHaveBeenCalledWith(1, 8, mockUser.id);
  });

  it('should return 400 if priority is missing for updatePriority', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const request = new NextRequest('http://localhost:3000/api/tasks/1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'updatePriority' }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Priority required');
    expect(updatePriority).not.toHaveBeenCalled();
  });

  // ============ UPDATE DEADLINE ============

  it('should update task deadline successfully', async () => {
    const mockUser = { id: 'user-123' };
    const newDeadline = '2025-12-31T23:59:59Z';

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    (updateDeadline as any).mockResolvedValue({ id: 1, deadline: newDeadline });

    const request = new NextRequest('http://localhost:3000/api/tasks/1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'updateDeadline', deadline: newDeadline }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe(1);
    expect(data.deadline).toBe(newDeadline);
    expect(updateDeadline).toHaveBeenCalledWith(1, newDeadline, mockUser.id);
  });

  it('should allow null deadline for updateDeadline', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    (updateDeadline as any).mockResolvedValue({ id: 1, deadline: null });

    const request = new NextRequest('http://localhost:3000/api/tasks/1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'updateDeadline', deadline: null }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.deadline).toBeNull();
    expect(updateDeadline).toHaveBeenCalledWith(1, null, mockUser.id);
  });

  // ============ UPDATE NOTES ============

  it('should update task notes successfully', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    (updateNotes as any).mockResolvedValue({ id: 1, notes: 'Updated notes' });

    const request = new NextRequest('http://localhost:3000/api/tasks/1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'updateNotes', notes: 'Updated notes' }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe(1);
    expect(data.notes).toBe('Updated notes');
    expect(updateNotes).toHaveBeenCalledWith(1, 'Updated notes', mockUser.id);
  });

  it('should return 400 if notes is missing for updateNotes', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const request = new NextRequest('http://localhost:3000/api/tasks/1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'updateNotes' }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Notes required');
    expect(updateNotes).not.toHaveBeenCalled();
  });

  // ============ UPDATE RECURRENCE ============

  it('should update task recurrence successfully', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    (updateRecurrence as any).mockResolvedValue({
      id: 1,
      recurrence_interval: 7,
      recurrence_date: '2025-12-20T00:00:00Z',
    });

    const request = new NextRequest('http://localhost:3000/api/tasks/1', {
      method: 'PATCH',
      body: JSON.stringify({
        action: 'updateRecurrence',
        recurrenceInterval: 7,
        recurrenceDate: '2025-12-20T00:00:00Z',
      }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe(1);
    expect(data.recurrence_interval).toBe(7);
    expect(updateRecurrence).toHaveBeenCalledWith(1, 7, '2025-12-20T00:00:00Z', mockUser.id);
  });

  it('should return 400 if recurrence interval is missing', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const request = new NextRequest('http://localhost:3000/api/tasks/1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'updateRecurrence', recurrenceDate: '2025-12-20T00:00:00Z' }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Recurrence interval required');
    expect(updateRecurrence).not.toHaveBeenCalled();
  });

  it('should handle recurrence service errors', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    (updateRecurrence as any).mockRejectedValue(new Error('Invalid recurrence date'));

    const request = new NextRequest('http://localhost:3000/api/tasks/1', {
      method: 'PATCH',
      body: JSON.stringify({
        action: 'updateRecurrence',
        recurrenceInterval: 7,
        recurrenceDate: '2020-01-01T00:00:00Z',
      }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Invalid recurrence date');
  });

  // ============ ADD ASSIGNEE ============

  it('should add assignee successfully', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    (addAssignee as any).mockResolvedValue('user-456');

    const request = new NextRequest('http://localhost:3000/api/tasks/1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'addAssignee', assignee_id: 'user-456' }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.assignee_id).toBe('user-456');
    expect(addAssignee).toHaveBeenCalledWith(1, 'user-456', mockUser.id);
  });

  it('should return 400 if assignee_id is missing', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const request = new NextRequest('http://localhost:3000/api/tasks/1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'addAssignee' }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Assignee ID required');
    expect(addAssignee).not.toHaveBeenCalled();
  });

  // ============ REMOVE ASSIGNEE ============

  it('should remove assignee successfully', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    (removeAssignee as any).mockResolvedValue('user-456');

    const request = new NextRequest('http://localhost:3000/api/tasks/1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'removeAssignee', assignee_id: 'user-456' }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.assignee_id).toBe('user-456');
    expect(removeAssignee).toHaveBeenCalledWith(1, 'user-456', mockUser.id);
  });

  // ============ ADD TAG ============

  it('should add tag successfully', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    (addTag as any).mockResolvedValue('urgent');

    const request = new NextRequest('http://localhost:3000/api/tasks/1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'addTag', tag_name: 'urgent' }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.tag).toBe('urgent');
    expect(addTag).toHaveBeenCalledWith(1, 'urgent', mockUser.id);
  });

  it('should return 400 if tag_name is missing', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const request = new NextRequest('http://localhost:3000/api/tasks/1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'addTag' }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Tag name required');
    expect(addTag).not.toHaveBeenCalled();
  });

  // ============ REMOVE TAG ============

  it('should remove tag successfully', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    (removeTag as any).mockResolvedValue('urgent');

    const request = new NextRequest('http://localhost:3000/api/tasks/1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'removeTag', tag_name: 'urgent' }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.tag).toBe('urgent');
    expect(removeTag).toHaveBeenCalledWith(1, 'urgent', mockUser.id);
  });

  // ============ ADD ATTACHMENTS ============

  it('should add attachments successfully', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    (addTaskAttachments as any).mockResolvedValue([
      { id: 1, storage_path: 'tasks/1/file.pdf' },
    ]);

    // Create a proper FormData with files
    const formData = new FormData();
    formData.append('action', 'addAttachments');
    const testFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    formData.append('file_0', testFile);

    const request = new NextRequest('http://localhost:3000/api/tasks/1', {
      method: 'PATCH',
      body: formData as any,
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.attachments).toHaveLength(1);
    expect(data.attachments[0].id).toBe(1);
    expect(addTaskAttachments).toHaveBeenCalled();
  });

  it('should return 400 if no files provided for addAttachments', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const formData = new FormData();
    formData.append('action', 'addAttachments');

    const request = new NextRequest('http://localhost:3000/api/tasks/1', {
      method: 'PATCH',
      body: formData as any,
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('No files provided');
    expect(addTaskAttachments).not.toHaveBeenCalled();
  });

  // ============ REMOVE ATTACHMENT ============

  it('should remove attachment successfully', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    (removeTaskAttachment as any).mockResolvedValue('tasks/1/test.pdf');

    const request = new NextRequest('http://localhost:3000/api/tasks/1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'removeAttachment', attachment_id: 1 }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.removed_path).toBe('tasks/1/test.pdf');
    expect(removeTaskAttachment).toHaveBeenCalledWith(1, 1, mockUser.id);
  });

  it('should return 400 if attachment_id is missing', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const request = new NextRequest('http://localhost:3000/api/tasks/1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'removeAttachment' }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Attachment ID required');
    expect(removeTaskAttachment).not.toHaveBeenCalled();
  });

  // ============ ADD COMMENT ============

  it('should add comment successfully', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    (addComment as any).mockResolvedValue({
      id: 1,
      content: 'Great work!',
      created_at: '2025-11-04T10:00:00Z',
      user_id: 'user-123',
    });

    const request = new NextRequest('http://localhost:3000/api/tasks/1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'addComment', content: 'Great work!' }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.comment.id).toBe(1);
    expect(data.comment.content).toBe('Great work!');
    expect(addComment).toHaveBeenCalledWith(1, 'Great work!', mockUser.id);
  });

  it('should return 400 if comment content is missing', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const request = new NextRequest('http://localhost:3000/api/tasks/1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'addComment' }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Comment content required');
    expect(addComment).not.toHaveBeenCalled();
  });

  it('should return 400 if comment content is empty string', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const request = new NextRequest('http://localhost:3000/api/tasks/1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'addComment', content: '   ' }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Comment content required');
    expect(addComment).not.toHaveBeenCalled();
  });

  it('should handle addComment service errors', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    (addComment as any).mockRejectedValue(new Error('Task not found'));

    const request = new NextRequest('http://localhost:3000/api/tasks/1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'addComment', content: 'Great work!' }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Task not found');
  });

  // ============ UPDATE COMMENT ============

  it('should update comment successfully', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    (updateComment as any).mockResolvedValue({
      id: 1,
      content: 'Updated comment',
      updated_at: '2025-11-04T11:00:00Z',
    });

    const request = new NextRequest('http://localhost:3000/api/tasks/1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'updateComment', commentId: 1, content: 'Updated comment' }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.comment.content).toBe('Updated comment');
    expect(updateComment).toHaveBeenCalledWith(1, 'Updated comment', mockUser.id);
  });

  it('should return 400 if commentId is missing', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const request = new NextRequest('http://localhost:3000/api/tasks/1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'updateComment', content: 'Updated comment' }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Comment ID required');
    expect(updateComment).not.toHaveBeenCalled();
  });

  // ============ DELETE COMMENT ============

  it('should delete comment successfully', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    (deleteComment as any).mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost:3000/api/tasks/1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'deleteComment', commentId: 1 }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Comment deleted successfully');
    expect(deleteComment).toHaveBeenCalledWith(1, mockUser.id);
  });

  it('should return 400 if commentId is missing for deleteComment', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const request = new NextRequest('http://localhost:3000/api/tasks/1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'deleteComment' }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Comment ID required');
    expect(deleteComment).not.toHaveBeenCalled();
  });

  // ============ LINK SUBTASK ============

  it('should link subtask successfully', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    (linkSubtaskToParent as any).mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost:3000/api/tasks/1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'linkSubtask', subtaskId: 2 }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Subtask linked successfully');
    expect(linkSubtaskToParent).toHaveBeenCalledWith(2, 1);
  });

  it('should return 400 if subtaskId is missing', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const request = new NextRequest('http://localhost:3000/api/tasks/1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'linkSubtask' }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Subtask ID required');
    expect(linkSubtaskToParent).not.toHaveBeenCalled();
  });

  it('should handle linkSubtask service errors', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    (linkSubtaskToParent as any).mockRejectedValue(new Error('A task cannot be its own parent'));

    const request = new NextRequest('http://localhost:3000/api/tasks/1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'linkSubtask', subtaskId: 1 }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('A task cannot be its own parent');
  });
});
