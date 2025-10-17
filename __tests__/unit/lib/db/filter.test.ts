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
      const mockUsers = [{ id: authUsersFixtures.alice.id }, { id: authUsersFixtures.carol.id }];

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
    it('should return projects for given departments via project_departments table', async () => {
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
        if (table === 'projects') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [
                  { id: projectsFixtures.alpha.id, name: projectsFixtures.alpha.name },
                  { id: projectsFixtures.gamma.id, name: projectsFixtures.gamma.name },
                ],
                error: null,
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      const result = await fetchProjectsByDepartments(authUsersFixtures.alice.id, [
        departmentsFixtures.engineering.id,
      ]);

      expect(result).toHaveLength(2);
      expect(result).toEqual(
        expect.arrayContaining([
          { id: projectsFixtures.alpha.id, name: projectsFixtures.alpha.name },
          { id: projectsFixtures.gamma.id, name: projectsFixtures.gamma.name },
        ])
      );
    });

    it('should return empty array when departmentIds is empty', async () => {
      const result = await fetchProjectsByDepartments(authUsersFixtures.alice.id, []);
      expect(result).toEqual([]);
    });

    it('should return empty array when no project_departments links found', async () => {
      mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'project_departments') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      const result = await fetchProjectsByDepartments(authUsersFixtures.alice.id, [
        departmentsFixtures.engineering.id,
      ]);

      expect(result).toEqual([]);
    });

    it('should throw error when project_departments query fails', async () => {
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
        fetchProjectsByDepartments(authUsersFixtures.alice.id, [departmentsFixtures.engineering.id])
      ).rejects.toThrow('Query failed');
    });

    it('should deduplicate projects with same ID', async () => {
      mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'project_departments') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [
                  { project_id: projectsFixtures.alpha.id },
                  { project_id: projectsFixtures.alpha.id }, // duplicate
                  { project_id: projectsFixtures.beta.id },
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
                data: [
                  { id: projectsFixtures.alpha.id, name: projectsFixtures.alpha.name },
                  { id: projectsFixtures.beta.id, name: projectsFixtures.beta.name },
                ],
                error: null,
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      const result = await fetchProjectsByDepartments(authUsersFixtures.alice.id, [
        departmentsFixtures.engineering.id,
        departmentsFixtures.finance.id,
      ]);

      expect(result).toHaveLength(2);
      expect(result).toEqual(
        expect.arrayContaining([
          { id: projectsFixtures.alpha.id, name: projectsFixtures.alpha.name },
          { id: projectsFixtures.beta.id, name: projectsFixtures.beta.name },
        ])
      );
    });

    it('should handle multiple department IDs', async () => {
      mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'project_departments') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [
                  { project_id: projectsFixtures.alpha.id },
                  { project_id: projectsFixtures.beta.id },
                  { project_id: projectsFixtures.gamma.id },
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

      const result = await fetchProjectsByDepartments(authUsersFixtures.alice.id, [
        departmentsFixtures.engineering.id,
        departmentsFixtures.finance.id,
      ]);

      expect(result).toHaveLength(3);
    });
  });

  describe('fetchDepartmentsByProjects', () => {
    it('should return department IDs for given project IDs', async () => {
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [
              {
                project_id: projectsFixtures.alpha.id,
                department_id: departmentsFixtures.engineering.id,
              },
              {
                project_id: projectsFixtures.alpha.id,
                department_id: departmentsFixtures.finance.id,
              },
              {
                project_id: projectsFixtures.beta.id,
                department_id: departmentsFixtures.operations.id,
              },
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
              {
                project_id: projectsFixtures.alpha.id,
                department_id: departmentsFixtures.engineering.id,
              },
              {
                project_id: projectsFixtures.beta.id,
                department_id: departmentsFixtures.engineering.id,
              },
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

      await expect(fetchDepartmentsByProjects([projectsFixtures.alpha.id])).rejects.toThrow(
        'Query failed'
      );
    });
  });

  describe('fetchDepartmentDetails', () => {
    it('should return department details for given IDs', async () => {
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [departmentsFixtures.engineering, departmentsFixtures.finance],
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
        expect.arrayContaining([departmentsFixtures.engineering, departmentsFixtures.finance])
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

      await expect(fetchDepartmentDetails([departmentsFixtures.engineering.id])).rejects.toThrow(
        'Query failed'
      );
    });
  });

  describe('getDepartmentsForUser', () => {
    it('should return user hierarchy for managers', async () => {
      let fromCallCount = 0;
      mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
        fromCallCount++;

        if (table === 'user_roles' && fromCallCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { role: 'manager' },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }

        if (table === 'user_info' && fromCallCount === 2) {
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

        if (table === 'departments') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [departmentsFixtures.engineering, departmentsFixtures.operations],
                error: null,
              }),
            }),
          };
        }

        return { select: vi.fn() };
      });

      // Mock hierarchy RPC
      mockSupabaseClient.rpc = vi.fn().mockResolvedValue({
        data: [
          { id: departmentsFixtures.engineering.id },
          { id: departmentsFixtures.operations.id },
        ],
        error: null,
      });

      const result = await getDepartmentsForUser(authUsersFixtures.bob.id);

      expect(result.length).toBe(2);
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: departmentsFixtures.engineering.id }),
          expect.objectContaining({ id: departmentsFixtures.operations.id }),
        ])
      );
    });

    it('should return only own department for non-managers', async () => {
      let fromCallCount = 0;
      mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
        fromCallCount++;

        // Mock user_roles query - no manager role
        if (table === 'user_roles' && fromCallCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { code: 'PGRST116' },
                  }),
                }),
              }),
            }),
          };
        }

        if (table === 'user_info' && fromCallCount === 2) {
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

        if (table === 'departments') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [departmentsFixtures.engineering],
                error: null,
              }),
            }),
          };
        }

        return { select: vi.fn() };
      });

      const result = await getDepartmentsForUser(authUsersFixtures.alice.id);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(departmentsFixtures.engineering);
    });

    it('should return empty array when user has no department', async () => {
      let fromCallCount = 0;
      mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
        fromCallCount++;

        if (table === 'user_roles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { code: 'PGRST116' },
                  }),
                }),
              }),
            }),
          };
        }

        if (table === 'user_info') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          };
        }

        return { select: vi.fn() };
      });

      const result = await getDepartmentsForUser(authUsersFixtures.alice.id);
      expect(result).toEqual([]);
    });

    it('should return empty array when user department_id is null', async () => {
      let fromCallCount = 0;
      mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
        fromCallCount++;

        if (table === 'user_roles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { code: 'PGRST116' },
                  }),
                }),
              }),
            }),
          };
        }

        if (table === 'user_info') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { department_id: null },
                  error: null,
                }),
              }),
            }),
          };
        }

        return { select: vi.fn() };
      });

      const result = await getDepartmentsForUser(authUsersFixtures.alice.id);
      expect(result).toEqual([]);
    });

    it('should throw error when hierarchy RPC fails', async () => {
      let fromCallCount = 0;
      mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
        fromCallCount++;

        if (table === 'user_roles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { role: 'manager' },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }

        if (table === 'user_info') {
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

        return { select: vi.fn() };
      });

      const mockError = new Error('RPC failed');
      mockSupabaseClient.rpc = vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      await expect(getDepartmentsForUser(authUsersFixtures.alice.id)).rejects.toThrow('RPC failed');
    });
  });
});
