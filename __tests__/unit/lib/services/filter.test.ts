import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockSupabaseClient } from '@/__tests__/mocks/supabase.mock';
import {
  authUsersFixtures,
  projectsFixtures,
  departmentsFixtures,
} from '@/__tests__/fixtures/database.fixtures';

// Mock the Supabase client module BEFORE importing
let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabaseClient),
}));

// Mock the database filter functions
vi.mock('@/lib/db/filter', () => ({
  fetchProjectsByDepartments: vi.fn(),
  getDepartmentsForUser: vi.fn(),
  fetchDepartmentsByProjects: vi.fn(),
  fetchDepartmentDetails: vi.fn(),
  getUserIdsFromDepartments: vi.fn(),
}));

// Dynamic import after mocks
const { filterDepartments, filterProjects } = await import('@/lib/services/filter');
const dbFilter = await import('@/lib/db/filter');

describe('lib/services/filter', () => {
  beforeEach(() => {
    mockSupabaseClient = createMockSupabaseClient();
    vi.clearAllMocks();
    // Clear console mocks
    vi.mocked(console.log).mockClear();
    vi.mocked(console.error).mockClear();
    vi.mocked(console.warn).mockClear();
  });

  describe('filterProjects', () => {
    it('should return all projects sorted alphabetically when no departmentIds provided', async () => {
      const mockProjects = [
        { id: projectsFixtures.beta.id, name: projectsFixtures.beta.name },
        { id: projectsFixtures.alpha.id, name: projectsFixtures.alpha.name },
      ];

      vi.mocked(dbFilter.fetchProjectsByDepartments).mockResolvedValue(mockProjects);

      const result = await filterProjects(authUsersFixtures.alice.id);

      expect(dbFilter.fetchProjectsByDepartments).toHaveBeenCalledWith(
        authUsersFixtures.alice.id,
        []
      );
      expect(result).toHaveLength(2);
      // Should be sorted alphabetically
      expect(result[0].name).toBe(projectsFixtures.alpha.name);
      expect(result[1].name).toBe(projectsFixtures.beta.name);
    });

    it('should filter projects by departmentIds when provided', async () => {
      const departmentIds = [
        departmentsFixtures.engineering.id,
        departmentsFixtures.finance.id,
      ];
      const mockProjects = [
        projectsFixtures.alpha,
        projectsFixtures.gamma,
      ];

      vi.mocked(dbFilter.fetchProjectsByDepartments).mockResolvedValue(mockProjects);

      const result = await filterProjects(authUsersFixtures.alice.id, departmentIds);

      expect(dbFilter.fetchProjectsByDepartments).toHaveBeenCalledWith(
        authUsersFixtures.alice.id,
        departmentIds
      );
      expect(result).toHaveLength(2);
    });

    it('should handle empty departmentIds array', async () => {
      const mockProjects = [projectsFixtures.alpha];

      vi.mocked(dbFilter.fetchProjectsByDepartments).mockResolvedValue(mockProjects);

      const result = await filterProjects(authUsersFixtures.alice.id, []);

      expect(dbFilter.fetchProjectsByDepartments).toHaveBeenCalledWith(
        authUsersFixtures.alice.id,
        []
      );
      expect(result).toEqual([projectsFixtures.alpha]);
    });

    it('should return empty array when no projects found', async () => {
      vi.mocked(dbFilter.fetchProjectsByDepartments).mockResolvedValue([]);

      const result = await filterProjects(authUsersFixtures.alice.id);

      expect(result).toEqual([]);
    });

    it('should return empty array when userId is missing', async () => {
      const result = await filterProjects('');

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(
        'filterProjects: Missing required userId'
      );
      expect(dbFilter.fetchProjectsByDepartments).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      const mockError = new Error('Database error');
      vi.mocked(dbFilter.fetchProjectsByDepartments).mockRejectedValue(mockError);

      const result = await filterProjects(authUsersFixtures.alice.id);

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(
        'filterProjects: Failed to fetch projects',
        expect.objectContaining({
          userId: authUsersFixtures.alice.id,
          error: 'Database error',
        })
      );
    });

    it('should filter out invalid department IDs', async () => {
      const invalidDeptIds = [
        departmentsFixtures.engineering.id,
        -1, // negative
        0, // zero
        1.5, // float
        departmentsFixtures.finance.id,
      ];

      const mockProjects = [projectsFixtures.alpha];
      vi.mocked(dbFilter.fetchProjectsByDepartments).mockResolvedValue(mockProjects);

      const result = await filterProjects(authUsersFixtures.alice.id, invalidDeptIds);

      expect(console.warn).toHaveBeenCalledWith(
        'filterProjects: Invalid department IDs detected and filtered out',
        expect.objectContaining({
          userId: authUsersFixtures.alice.id,
          valid: [departmentsFixtures.engineering.id, departmentsFixtures.finance.id],
        })
      );
      expect(dbFilter.fetchProjectsByDepartments).toHaveBeenCalledWith(
        authUsersFixtures.alice.id,
        [departmentsFixtures.engineering.id, departmentsFixtures.finance.id]
      );
    });

    it('should deduplicate projects with same ID', async () => {
      // Mock returns duplicates with same ID but potentially different metadata
      const mockProjects = [
        { ...projectsFixtures.alpha },
        { ...projectsFixtures.alpha }, // exact duplicate
        { ...projectsFixtures.beta },
      ];

      vi.mocked(dbFilter.fetchProjectsByDepartments).mockResolvedValue(mockProjects);

      const result = await filterProjects(authUsersFixtures.alice.id);

      // Should deduplicate by ID
      expect(result).toHaveLength(2);
      
      // Verify each ID appears only once
      const ids = result.map(p => p.id);
      const uniqueIds = [...new Set(ids)];
      expect(ids.length).toBe(uniqueIds.length);
      
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: projectsFixtures.alpha.id }),
          expect.objectContaining({ id: projectsFixtures.beta.id })
        ])
      );
    });

    it('should handle multiple department IDs correctly', async () => {
      const departmentIds = [
        departmentsFixtures.engineering.id,
        departmentsFixtures.finance.id,
        departmentsFixtures.operations.id,
      ];

      const mockProjects = [
        projectsFixtures.alpha,
        projectsFixtures.beta,
        projectsFixtures.gamma,
      ];

      vi.mocked(dbFilter.fetchProjectsByDepartments).mockResolvedValue(mockProjects);

      const result = await filterProjects(authUsersFixtures.alice.id, departmentIds);

      expect(result).toHaveLength(3);
      expect(dbFilter.fetchProjectsByDepartments).toHaveBeenCalledWith(authUsersFixtures.alice.id, departmentIds);
    });
  });

  describe('filterDepartments', () => {
    it('should return all user departments sorted alphabetically when no projectIds provided', async () => {
      const mockDepartments = [
        departmentsFixtures.finance,
        departmentsFixtures.engineering,
      ];

      vi.mocked(dbFilter.getDepartmentsForUser).mockResolvedValue(mockDepartments);

      const result = await filterDepartments(authUsersFixtures.alice.id);

      expect(dbFilter.getDepartmentsForUser).toHaveBeenCalledWith(authUsersFixtures.alice.id);
      expect(result).toHaveLength(2);
      // Should be sorted alphabetically
      expect(result[0].name).toBe(departmentsFixtures.engineering.name);
      expect(result[1].name).toBe(departmentsFixtures.finance.name);
      expect(console.log).toHaveBeenCalledWith(
        'filterDepartments: Fetching departments for user',
        { userId: authUsersFixtures.alice.id }
      );
    });

    it('should filter departments by projectIds when provided', async () => {
      const projectIds = [projectsFixtures.alpha.id, projectsFixtures.beta.id];
      const allDepartments = [
        departmentsFixtures.engineering,
        departmentsFixtures.finance,
        departmentsFixtures.operations,
      ];
      const matchingDeptIds = [
        departmentsFixtures.engineering.id,
        departmentsFixtures.finance.id,
      ];

      vi.mocked(dbFilter.getDepartmentsForUser).mockResolvedValue(allDepartments);
      vi.mocked(dbFilter.fetchDepartmentsByProjects).mockResolvedValue(matchingDeptIds);

      const result = await filterDepartments(authUsersFixtures.alice.id, projectIds);

      expect(dbFilter.getDepartmentsForUser).toHaveBeenCalledWith(authUsersFixtures.alice.id);
      expect(dbFilter.fetchDepartmentsByProjects).toHaveBeenCalledWith(projectIds);
      expect(result).toHaveLength(2);
      expect(result).toEqual(
        expect.arrayContaining([
          departmentsFixtures.engineering,
          departmentsFixtures.finance,
        ])
      );
      expect(console.log).toHaveBeenCalledWith(
        'filterDepartments: Results',
        expect.objectContaining({
          userId: authUsersFixtures.alice.id,
          totalAvailable: 3,
          filtered: 2,
        })
      );
    });

    it('should handle empty projectIds array', async () => {
      const mockDepartments = [departmentsFixtures.engineering];

      vi.mocked(dbFilter.getDepartmentsForUser).mockResolvedValue(mockDepartments);

      const result = await filterDepartments(authUsersFixtures.alice.id, []);

      expect(dbFilter.getDepartmentsForUser).toHaveBeenCalledWith(authUsersFixtures.alice.id);
      expect(dbFilter.fetchDepartmentsByProjects).not.toHaveBeenCalled();
      expect(result).toEqual([departmentsFixtures.engineering]);
    });

    it('should return empty array when user has no departments', async () => {
      vi.mocked(dbFilter.getDepartmentsForUser).mockResolvedValue([]);

      const result = await filterDepartments(authUsersFixtures.alice.id);

      expect(result).toEqual([]);
    });

    it('should return empty array when userId is missing', async () => {
      const result = await filterDepartments('');

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(
        'filterDepartments: Missing required userId'
      );
      expect(dbFilter.getDepartmentsForUser).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      const mockError = new Error('Database error');
      vi.mocked(dbFilter.getDepartmentsForUser).mockRejectedValue(mockError);

      const result = await filterDepartments(authUsersFixtures.alice.id);

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(
        'filterDepartments: Failed to fetch departments',
        expect.objectContaining({
          userId: authUsersFixtures.alice.id,
          error: 'Database error',
        })
      );
    });

    it('should filter out invalid project IDs', async () => {
      const invalidProjIds = [
        projectsFixtures.alpha.id,
        -1, // negative
        0, // zero
        1.5, // float
        projectsFixtures.beta.id,
      ];

      const mockDepartments = [departmentsFixtures.engineering];
      const mockDeptIds = [departmentsFixtures.engineering.id];

      vi.mocked(dbFilter.getDepartmentsForUser).mockResolvedValue(mockDepartments);
      vi.mocked(dbFilter.fetchDepartmentsByProjects).mockResolvedValue(mockDeptIds);

      const result = await filterDepartments(authUsersFixtures.alice.id, invalidProjIds);

      expect(console.warn).toHaveBeenCalledWith(
        'filterDepartments: Invalid project IDs detected and filtered out',
        expect.objectContaining({
          userId: authUsersFixtures.alice.id,
          valid: [projectsFixtures.alpha.id, projectsFixtures.beta.id],
        })
      );
      expect(dbFilter.fetchDepartmentsByProjects).toHaveBeenCalledWith([
        projectsFixtures.alpha.id,
        projectsFixtures.beta.id,
      ]);
    });

    it('should handle single projectId', async () => {
      const projectIds = [projectsFixtures.alpha.id];
      const mockDepartments = [departmentsFixtures.engineering];
      const mockDeptIds = [departmentsFixtures.engineering.id];

      vi.mocked(dbFilter.getDepartmentsForUser).mockResolvedValue(mockDepartments);
      vi.mocked(dbFilter.fetchDepartmentsByProjects).mockResolvedValue(mockDeptIds);

      const result = await filterDepartments(authUsersFixtures.alice.id, projectIds);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(departmentsFixtures.engineering);
    });

    it('should handle multiple departments', async () => {
      const mockDepartments = [
        departmentsFixtures.engineering,
        departmentsFixtures.finance,
        departmentsFixtures.operations,
      ];

      vi.mocked(dbFilter.getDepartmentsForUser).mockResolvedValue(mockDepartments);

      const result = await filterDepartments(authUsersFixtures.alice.id);

      expect(result).toHaveLength(3);
    });

    it('should filter departments not in project filter', async () => {
      const projectIds = [projectsFixtures.alpha.id];
      const allDepartments = [
        departmentsFixtures.engineering,
        departmentsFixtures.finance,
        departmentsFixtures.operations,
      ];
      const matchingDeptIds = [departmentsFixtures.engineering.id];

      vi.mocked(dbFilter.getDepartmentsForUser).mockResolvedValue(allDepartments);
      vi.mocked(dbFilter.fetchDepartmentsByProjects).mockResolvedValue(matchingDeptIds);

      const result = await filterDepartments(authUsersFixtures.alice.id, projectIds);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(departmentsFixtures.engineering);
    });

    it('should handle undefined projectIds parameter', async () => {
      const mockDepartments = [departmentsFixtures.engineering];

      vi.mocked(dbFilter.getDepartmentsForUser).mockResolvedValue(mockDepartments);

      const result = await filterDepartments(authUsersFixtures.alice.id, undefined);

      expect(result).toEqual([departmentsFixtures.engineering]);
      expect(dbFilter.fetchDepartmentsByProjects).not.toHaveBeenCalled();
    });

    it('should handle errors in fetchDepartmentsByProjects', async () => {
      const projectIds = [projectsFixtures.alpha.id];
      const mockDepartments = [departmentsFixtures.engineering];
      const mockError = new Error('Fetch departments by projects failed');

      vi.mocked(dbFilter.getDepartmentsForUser).mockResolvedValue(mockDepartments);
      vi.mocked(dbFilter.fetchDepartmentsByProjects).mockRejectedValue(mockError);

      const result = await filterDepartments(authUsersFixtures.alice.id, projectIds);

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle null userId gracefully in filterDepartments', async () => {
      const result = await filterDepartments(null as any);

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(
        'filterDepartments: Missing required userId'
      );
    });

    it('should handle null userId gracefully in filterProjects', async () => {
      const result = await filterProjects(null as any);

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(
        'filterProjects: Missing required userId'
      );
    });

    it('should handle concurrent filterDepartments calls correctly', async () => {
      const mockDepartments = [departmentsFixtures.engineering];

      vi.mocked(dbFilter.getDepartmentsForUser).mockResolvedValue(mockDepartments);

      const results = await Promise.all([
        filterDepartments(authUsersFixtures.alice.id),
        filterDepartments(authUsersFixtures.bob.id),
        filterDepartments(authUsersFixtures.carol.id),
      ]);

      expect(results).toHaveLength(3);
      expect(dbFilter.getDepartmentsForUser).toHaveBeenCalledTimes(3);
    });

    it('should handle concurrent filterProjects calls correctly', async () => {
      const mockProjects = [projectsFixtures.alpha];

      vi.mocked(dbFilter.fetchProjectsByDepartments).mockResolvedValue(mockProjects);

      const results = await Promise.all([
        filterProjects(authUsersFixtures.alice.id),
        filterProjects(authUsersFixtures.bob.id),
        filterProjects(authUsersFixtures.carol.id),
      ]);

      expect(results).toHaveLength(3);
      expect(dbFilter.fetchProjectsByDepartments).toHaveBeenCalledTimes(3);
    });

    it('should handle empty strings as userId', async () => {
      const deptResult = await filterDepartments('');
      const projResult = await filterProjects('');

      expect(deptResult).toEqual([]);
      expect(projResult).toEqual([]);
    });

    it('should sort departments case-insensitively', async () => {
      const mockDepartments = [
        { id: 1, name: 'zebra' },
        { id: 2, name: 'Apple' },
        { id: 3, name: 'banana' },
      ];

      vi.mocked(dbFilter.getDepartmentsForUser).mockResolvedValue(mockDepartments);

      const result = await filterDepartments(authUsersFixtures.alice.id);

      expect(result[0].name).toBe('Apple');
      expect(result[1].name).toBe('banana');
      expect(result[2].name).toBe('zebra');
    });

    it('should sort projects case-insensitively', async () => {
      const mockProjects = [
        { id: 1, name: 'Zebra Project' },
        { id: 2, name: 'apple Project' },
        { id: 3, name: 'Banana Project' },
      ];

      vi.mocked(dbFilter.fetchProjectsByDepartments).mockResolvedValue(mockProjects);

      const result = await filterProjects(authUsersFixtures.alice.id);

      expect(result[0].name).toBe('apple Project');
      expect(result[1].name).toBe('Banana Project');
      expect(result[2].name).toBe('Zebra Project');
    });

    it('should handle projects with special characters in names', async () => {
      const mockProjects = [
        { id: 1, name: 'Project: Alpha & Beta' },
        { id: 2, name: 'Project #1' },
        { id: 3, name: 'Project (2025)' },
      ];

      vi.mocked(dbFilter.fetchProjectsByDepartments).mockResolvedValue(mockProjects);

      const result = await filterProjects(authUsersFixtures.alice.id);

      expect(result).toHaveLength(3);
    });

    it('should handle departments with special characters in names', async () => {
      const mockDepartments = [
        { id: 1, name: 'R&D Department' },
        { id: 2, name: 'Sales & Marketing' },
        { id: 3, name: 'IT (Infrastructure)' },
      ];

      vi.mocked(dbFilter.getDepartmentsForUser).mockResolvedValue(mockDepartments);

      const result = await filterDepartments(authUsersFixtures.alice.id);

      expect(result).toHaveLength(3);
    });
  });
});