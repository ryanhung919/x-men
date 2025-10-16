import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getDepartmentsForUser,
  fetchProjectsByDepartments,
  fetchDepartmentsByProjects,
  fetchDepartmentDetails,
  getUserIdsFromDepartments,
} from '@/lib/db/filter';
import { createMockSupabaseClient } from '@/__tests__/mocks/supabase.mock';
import {
  authUsersFixtures,
  projectsFixtures,
  departmentsFixtures,
  tasksFixtures,
} from '@/__tests__/fixtures/database.fixtures';

// Mock the Supabase client module
let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabaseClient),
}));

describe('lib/db/filter', () => {
  beforeEach(() => {
    mockSupabaseClient = createMockSupabaseClient();
    vi.clearAllMocks();
  });

  describe('getUserIdsFromDepartments', () => {
    it('should return user IDs for given department IDs', async () => {
      const mockUsers = [
        { id: authUsersFixtures.alice.id },
        { id: authUsersFixtures.carol.id },
      ];

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: mockUsers,
            error: null,
          }),
        }),
      });

      const result = await getUserIdsFromDepartments(
        [departmentsFixtures.engineering.id],
        mockSupabaseClient
      );

      expect(result).toEqual([authUsersFixtures.alice.id, authUsersFixtures.carol.id]);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_info');
    });

    it('should return empty array when no users found', async () => {
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });

      const result = await getUserIdsFromDepartments(
        [departmentsFixtures.engineering.id],
        mockSupabaseClient
      );

      expect(result).toEqual([]);
    });

    it('should throw error when query fails', async () => {
      const mockError = new Error('Query failed');
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: null,
            error: mockError,
          }),
        }),
      });

      await expect(
        getUserIdsFromDepartments([departmentsFixtures.engineering.id], mockSupabaseClient)
      ).rejects.toThrow('Query failed');
    });
  });

  describe('fetchProjectsByDepartments', () => {
    it('should return projects for given departments including hierarchy', async () => {
      // Mock get_department_hierarchy RPC
      mockSupabaseClient.rpc = vi.fn().mockResolvedValue({
        data: [
          { id: departmentsFixtures.engineering.id },
          { id: departmentsFixtures.operations.id }, // child dept
        ],
        error: null,
      });

      // Mock project_departments query
      mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'project_departments') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [
                  { project_id: projectsFixtures.alpha.id },
                  { project_id: projectsFixtures.gamma.id },
                ],
                error: null,
              }),
            }),
          };
        }
        if (table === 'user_info') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [{ id: authUsersFixtures.alice.id }],
                error: null,
              }),
            }),
          };
        }
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [{ project_id: projectsFixtures.beta.id }],
                error: null,
              }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [
                  { id: projectsFixtures.alpha.id, name: projectsFixtures.alpha.name },
                  { id: projectsFixtures.beta.id, name: projectsFixtures.beta.name },
                  { id: projectsFixtures.gamma.id, name: projectsFixtures.gamma.name },
                ],
                error: null,
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      const result = await fetchProjectsByDepartments([departmentsFixtures.engineering.id]);

      expect(result).toHaveLength(3);
      expect(result).toEqual(
        expect.arrayContaining([
          { id: projectsFixtures.alpha.id, name: projectsFixtures.alpha.name },
          { id: projectsFixtures.beta.id, name: projectsFixtures.beta.name },
          { id: projectsFixtures.gamma.id, name: projectsFixtures.gamma.name },
        ])
      );
    });

    it('should return empty array when departmentIds is empty', async () => {
      const result = await fetchProjectsByDepartments([]);
      expect(result).toEqual([]);
    });

    it('should throw error when hierarchy RPC fails', async () => {
      const mockError = new Error('RPC failed');
      mockSupabaseClient.rpc = vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      await expect(
        fetchProjectsByDepartments([departmentsFixtures.engineering.id])
      ).rejects.toThrow('RPC failed');
    });

    it('should deduplicate projects from multiple sources', async () => {
      mockSupabaseClient.rpc = vi.fn().mockResolvedValue({
        data: [{ id: departmentsFixtures.engineering.id }],
        error: null,
      });

      mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'project_departments') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [
                  { project_id: projectsFixtures.alpha.id },
                  { project_id: projectsFixtures.alpha.id }, // duplicate
                ],
                error: null,
              }),
            }),
          };
        }
        if (table === 'user_info') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [{ id: authUsersFixtures.alice.id }],
                error: null,
              }),
            }),
          };
        }
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [
                  { project_id: projectsFixtures.alpha.id }, // same as dept link
                ],
                error: null,
              }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [{ id: projectsFixtures.alpha.id, name: projectsFixtures.alpha.name }],
                error: null,
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      const result = await fetchProjectsByDepartments([departmentsFixtures.engineering.id]);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: projectsFixtures.alpha.id,
        name: projectsFixtures.alpha.name,
      });
    });
  });

  describe('fetchDepartmentsByProjects', () => {
    it('should return department IDs for given project IDs', async () => {
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [
              { project_id: projectsFixtures.alpha.id, department_id: departmentsFixtures.engineering.id },
              { project_id: projectsFixtures.alpha.id, department_id: departmentsFixtures.finance.id },
              { project_id: projectsFixtures.beta.id, department_id: departmentsFixtures.operations.id },
            ],
            error: null,
          }),
        }),
      });

      const result = await fetchDepartmentsByProjects([
        projectsFixtures.alpha.id,
        projectsFixtures.beta.id,
      ]);

      expect(result).toHaveLength(3);
      expect(result).toEqual(
        expect.arrayContaining([
          departmentsFixtures.engineering.id,
          departmentsFixtures.finance.id,
          departmentsFixtures.operations.id,
        ])
      );
    });

    it('should return empty array when no projects provided', async () => {
      const result = await fetchDepartmentsByProjects([]);
      expect(result).toEqual([]);
    });

    it('should deduplicate department IDs', async () => {
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [
              { project_id: projectsFixtures.alpha.id, department_id: departmentsFixtures.engineering.id },
              { project_id: projectsFixtures.beta.id, department_id: departmentsFixtures.engineering.id },
            ],
            error: null,
          }),
        }),
      });

      const result = await fetchDepartmentsByProjects([
        projectsFixtures.alpha.id,
        projectsFixtures.beta.id,
      ]);

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(departmentsFixtures.engineering.id);
    });

    it('should throw error when query fails', async () => {
      const mockError = new Error('Query failed');
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: null,
            error: mockError,
          }),
        }),
      });

      await expect(
        fetchDepartmentsByProjects([projectsFixtures.alpha.id])
      ).rejects.toThrow('Query failed');
    });
  });

  describe('fetchDepartmentDetails', () => {
    it('should return department details for given IDs', async () => {
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [
              departmentsFixtures.engineering,
              departmentsFixtures.finance,
            ],
            error: null,
          }),
        }),
      });

      const result = await fetchDepartmentDetails([
        departmentsFixtures.engineering.id,
        departmentsFixtures.finance.id,
      ]);

      expect(result).toHaveLength(2);
      expect(result).toEqual(
        expect.arrayContaining([
          departmentsFixtures.engineering,
          departmentsFixtures.finance,
        ])
      );
    });

    it('should return empty array when no IDs provided', async () => {
      const result = await fetchDepartmentDetails([]);
      expect(result).toEqual([]);
      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
    });

    it('should throw error when query fails', async () => {
      const mockError = new Error('Query failed');
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: null,
            error: mockError,
          }),
        }),
      });

      await expect(
        fetchDepartmentDetails([departmentsFixtures.engineering.id])
      ).rejects.toThrow('Query failed');
    });
  });

  describe('getDepartmentsForUser', () => {
    it('should return user hierarchy + shared task departments', async () => {
      // Mock user's department query
      let fromCallCount = 0;
      mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
        fromCallCount++;
        
        if (table === 'user_info' && fromCallCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { department_id: departmentsFixtures.engineering.id },
                  error: null,
                }),
              }),
            }),
          };
        }
        
        if (table === 'task_assignments') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [
                  { task_id: 1, assignee_id: authUsersFixtures.alice.id },
                  { task_id: 1, assignee_id: authUsersFixtures.bob.id },
                ],
                error: null,
              }),
            }),
          };
        }
        
        if (table === 'user_info' && fromCallCount > 1) {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                not: vi.fn().mockResolvedValue({
                  data: [
                    { department_id: departmentsFixtures.finance.id },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }
        
        if (table === 'departments') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [
                  departmentsFixtures.engineering,
                  departmentsFixtures.operations,
                  departmentsFixtures.finance,
                ],
                error: null,
              }),
            }),
          };
        }
        
        return { select: vi.fn() };
      });

      // Mock hierarchy RPC
      let rpcCallCount = 0;
      mockSupabaseClient.rpc = vi.fn().mockImplementation((funcName: string) => {
        rpcCallCount++;
        
        if (funcName === 'get_department_hierarchy') {
          return Promise.resolve({
            data: [
              { id: departmentsFixtures.engineering.id },
              { id: departmentsFixtures.operations.id },
            ],
            error: null,
          });
        }
        
        if (funcName === 'get_department_colleagues') {
          return Promise.resolve({
            data: [
              { id: authUsersFixtures.alice.id },
              { id: authUsersFixtures.carol.id },
            ],
            error: null,
          });
        }
        
        return Promise.resolve({ data: [], error: null });
      });

      const result = await getDepartmentsForUser(authUsersFixtures.alice.id);

      expect(result.length).toBeGreaterThan(0);
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: departmentsFixtures.engineering.id }),
        ])
      );
    });

    it('should return empty array when user has no department', async () => {
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });

      const result = await getDepartmentsForUser(authUsersFixtures.alice.id);
      expect(result).toEqual([]);
    });

    it('should return empty array when user department_id is null', async () => {
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { department_id: null },
              error: null,
            }),
          }),
        }),
      });

      const result = await getDepartmentsForUser(authUsersFixtures.alice.id);
      expect(result).toEqual([]);
    });

    it('should throw error when hierarchy RPC fails', async () => {
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { department_id: departmentsFixtures.engineering.id },
              error: null,
            }),
          }),
        }),
      });

      const mockError = new Error('RPC failed');
      mockSupabaseClient.rpc = vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      await expect(
        getDepartmentsForUser(authUsersFixtures.alice.id)
      ).rejects.toThrow('RPC failed');
    });

    it('should handle empty shared tasks', async () => {
      let fromCallCount = 0;
      mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
        fromCallCount++;
        
        if (table === 'user_info' && fromCallCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { department_id: departmentsFixtures.engineering.id },
                  error: null,
                }),
              }),
            }),
          };
        }
        
        if (table === 'task_assignments') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          };
        }
        
        if (table === 'departments') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [
                  departmentsFixtures.engineering,
                  departmentsFixtures.operations,
                ],
                error: null,
              }),
            }),
          };
        }
        
        return { select: vi.fn() };
      });

      mockSupabaseClient.rpc = vi.fn().mockImplementation((funcName: string) => {
        if (funcName === 'get_department_hierarchy') {
          return Promise.resolve({
            data: [
              { id: departmentsFixtures.engineering.id },
              { id: departmentsFixtures.operations.id },
            ],
            error: null,
          });
        }
        
        if (funcName === 'get_department_colleagues') {
          return Promise.resolve({
            data: [{ id: authUsersFixtures.alice.id }],
            error: null,
          });
        }
        
        return Promise.resolve({ data: [], error: null });
      });

      const result = await getDepartmentsForUser(authUsersFixtures.alice.id);

      expect(result).toHaveLength(2);
      expect(result).toEqual(
        expect.arrayContaining([
          departmentsFixtures.engineering,
          departmentsFixtures.operations,
        ])
      );
    });
  });
});