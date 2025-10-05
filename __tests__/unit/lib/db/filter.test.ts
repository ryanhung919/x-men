import { describe, it, expect, vi, beforeEach } from "vitest";
import { getProjectsForUser, getDepartmentsForProjects, getDepartmentsForUser } from "@/lib/db/filter";
import { createMockSupabaseClient } from "@/__tests__/mocks/supabase.mock";
import {
  authUsersFixtures,
  projectsFixtures,
  departmentsFixtures,
  tasksFixtures,
} from "@/__tests__/fixtures/database.fixtures";

// Mock the Supabase client module
let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => mockSupabaseClient),
}));

describe("lib/db/filter", () => {
  beforeEach(() => {
    mockSupabaseClient = createMockSupabaseClient();
  });

  describe("getProjectsForUser", () => {
    it("should return projects for user with colleagues and task assignments", async () => {
      // Mock RPC call to return colleagues
      mockSupabaseClient.rpc = vi.fn().mockResolvedValue({
        data: [
          { id: authUsersFixtures.alice.id },
          { id: authUsersFixtures.carol.id },
        ],
        error: null,
      });

      // Mock task_assignments query
      const mockTaskAssignments = [
        {
          task_id: tasksFixtures.designHomepage.id,
          tasks: {
            project_id: projectsFixtures.alpha.id,
            project: { id: projectsFixtures.alpha.id, name: projectsFixtures.alpha.name },
          },
        },
        {
          task_id: tasksFixtures.budgetReport.id,
          tasks: {
            project_id: projectsFixtures.alpha.id,
            project: { id: projectsFixtures.alpha.id, name: projectsFixtures.alpha.name },
          },
        },
        {
          task_id: tasksFixtures.teamMeeting.id,
          tasks: {
            project_id: projectsFixtures.beta.id,
            project: { id: projectsFixtures.beta.id, name: projectsFixtures.beta.name },
          },
        },
      ];

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: mockTaskAssignments,
            error: null,
          }),
        }),
      });

      const result = await getProjectsForUser(authUsersFixtures.alice.id);

      expect(result).toHaveLength(2);
      expect(result).toEqual(
        expect.arrayContaining([
          { id: projectsFixtures.alpha.id, name: projectsFixtures.alpha.name },
          { id: projectsFixtures.beta.id, name: projectsFixtures.beta.name },
        ])
      );

      // Verify RPC was called correctly
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        "get_department_colleagues",
        { user_uuid: authUsersFixtures.alice.id }
      );

      // Verify from was called with correct table
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("task_assignments");
    });

    it("should return empty array when no colleagues found", async () => {
      mockSupabaseClient.rpc = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await getProjectsForUser(authUsersFixtures.alice.id);

      expect(result).toEqual([]);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        "get_department_colleagues",
        { user_uuid: authUsersFixtures.alice.id }
      );
    });

    it("should throw error when RPC call fails", async () => {
      const mockError = new Error("RPC failed");
      mockSupabaseClient.rpc = vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      await expect(getProjectsForUser(authUsersFixtures.alice.id)).rejects.toThrow("RPC failed");
    });

    it("should return empty array when no task assignments found", async () => {
      mockSupabaseClient.rpc = vi.fn().mockResolvedValue({
        data: [{ id: authUsersFixtures.alice.id }],
        error: null,
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });

      const result = await getProjectsForUser(authUsersFixtures.alice.id);

      expect(result).toEqual([]);
    });

    it("should throw error when task assignments query fails", async () => {
      mockSupabaseClient.rpc = vi.fn().mockResolvedValue({
        data: [{ id: authUsersFixtures.alice.id }],
        error: null,
      });

      const mockError = new Error("Query failed");
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: null,
            error: mockError,
          }),
        }),
      });

      await expect(getProjectsForUser(authUsersFixtures.alice.id)).rejects.toThrow("Query failed");
    });

    it("should deduplicate projects correctly", async () => {
      mockSupabaseClient.rpc = vi.fn().mockResolvedValue({
        data: [{ id: authUsersFixtures.alice.id }],
        error: null,
      });

      // Multiple tasks from same project
      const mockTaskAssignments = [
        {
          task_id: 1,
          tasks: {
            project_id: projectsFixtures.alpha.id,
            project: { id: projectsFixtures.alpha.id, name: projectsFixtures.alpha.name },
          },
        },
        {
          task_id: 2,
          tasks: {
            project_id: projectsFixtures.alpha.id,
            project: { id: projectsFixtures.alpha.id, name: projectsFixtures.alpha.name },
          },
        },
        {
          task_id: 3,
          tasks: {
            project_id: projectsFixtures.alpha.id,
            project: { id: projectsFixtures.alpha.id, name: projectsFixtures.alpha.name },
          },
        },
      ];

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: mockTaskAssignments,
            error: null,
          }),
        }),
      });

      const result = await getProjectsForUser(authUsersFixtures.alice.id);

      // Should only return one project despite multiple tasks
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: projectsFixtures.alpha.id,
        name: projectsFixtures.alpha.name,
      });
    });

    it("should handle null project data gracefully", async () => {
      mockSupabaseClient.rpc = vi.fn().mockResolvedValue({
        data: [{ id: authUsersFixtures.alice.id }],
        error: null,
      });

      const mockTaskAssignments = [
        {
          task_id: 1,
          tasks: {
            project_id: projectsFixtures.alpha.id,
            project: { id: projectsFixtures.alpha.id, name: projectsFixtures.alpha.name },
          },
        },
        {
          task_id: 2,
          tasks: null, // Null task
        },
        {
          task_id: 3,
          tasks: {
            project_id: projectsFixtures.beta.id,
            project: null, // Null project
          },
        },
      ];

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: mockTaskAssignments,
            error: null,
          }),
        }),
      });

      const result = await getProjectsForUser(authUsersFixtures.alice.id);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: projectsFixtures.alpha.id,
        name: projectsFixtures.alpha.name,
      });
    });
  });

  describe("getDepartmentsForProjects", () => {
    it("should return departments for given project IDs", async () => {
      let callCount = 0;

      mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
        callCount++;
        
        if (callCount === 1) {
          // First call: project_departments
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [
                  { department_id: departmentsFixtures.engineering.id },
                  { department_id: departmentsFixtures.finance.id },
                  { department_id: departmentsFixtures.engineering.id }, // Duplicate
                ],
                error: null,
              }),
            }),
          };
        } else {
          // Second call: departments
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [
                  { id: departmentsFixtures.engineering.id, name: departmentsFixtures.engineering.name },
                  { id: departmentsFixtures.finance.id, name: departmentsFixtures.finance.name },
                ],
                error: null,
              }),
            }),
          };
        }
      });

      const result = await getDepartmentsForProjects([
        projectsFixtures.alpha.id,
        projectsFixtures.beta.id,
      ]);

      expect(result).toHaveLength(2);
      expect(result).toEqual(
        expect.arrayContaining([
          { id: departmentsFixtures.engineering.id, name: departmentsFixtures.engineering.name },
          { id: departmentsFixtures.finance.id, name: departmentsFixtures.finance.name },
        ])
      );
    });

    it("should return empty array when projectIds is empty", async () => {
      const result = await getDepartmentsForProjects([]);
      
      expect(result).toEqual([]);
      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
    });

    it("should throw error when project_departments query fails", async () => {
      const mockError = new Error("Query failed");
      
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: null,
            error: mockError,
          }),
        }),
      });

      await expect(
        getDepartmentsForProjects([projectsFixtures.alpha.id])
      ).rejects.toThrow("Query failed");
    });

    it("should throw error when departments query fails", async () => {
      let callCount = 0;

      mockSupabaseClient.from = vi.fn().mockImplementation(() => {
        callCount++;
        
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [{ department_id: departmentsFixtures.engineering.id }],
                error: null,
              }),
            }),
          };
        } else {
          const mockError = new Error("Departments query failed");
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: null,
                error: mockError,
              }),
            }),
          };
        }
      });

      await expect(
        getDepartmentsForProjects([projectsFixtures.alpha.id])
      ).rejects.toThrow("Departments query failed");
    });

    it("should return empty array when no project departments found", async () => {
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });

      const result = await getDepartmentsForProjects([projectsFixtures.alpha.id]);
      
      expect(result).toEqual([]);
    });

    it("should handle null departments data", async () => {
      let callCount = 0;

      mockSupabaseClient.from = vi.fn().mockImplementation(() => {
        callCount++;
        
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [{ department_id: departmentsFixtures.engineering.id }],
                error: null,
              }),
            }),
          };
        } else {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          };
        }
      });

      const result = await getDepartmentsForProjects([projectsFixtures.alpha.id]);
      
      expect(result).toEqual([]);
    });
  });

  describe("getDepartmentsForUser", () => {
    it("should return departments via user projects", async () => {
      // Mock getProjectsForUser
      mockSupabaseClient.rpc = vi.fn().mockResolvedValue({
        data: [{ id: authUsersFixtures.alice.id }],
        error: null,
      });

      let callCount = 0;
      mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
        callCount++;
        
        if (table === "task_assignments") {
          // getProjectsForUser call
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [
                  {
                    task_id: 1,
                    tasks: {
                      project_id: projectsFixtures.alpha.id,
                      project: { id: projectsFixtures.alpha.id, name: projectsFixtures.alpha.name },
                    },
                  },
                ],
                error: null,
              }),
            }),
          };
        } else if (callCount === 2) {
          // getDepartmentsForProjects - project_departments
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [{ department_id: departmentsFixtures.engineering.id }],
                error: null,
              }),
            }),
          };
        } else {
          // getDepartmentsForProjects - departments
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [
                  { id: departmentsFixtures.engineering.id, name: departmentsFixtures.engineering.name },
                ],
                error: null,
              }),
            }),
          };
        }
      });

      const result = await getDepartmentsForUser(authUsersFixtures.alice.id);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: departmentsFixtures.engineering.id,
        name: departmentsFixtures.engineering.name,
      });
    });

    it("should return empty array when user has no projects", async () => {
      mockSupabaseClient.rpc = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await getDepartmentsForUser(authUsersFixtures.alice.id);
      
      expect(result).toEqual([]);
    });

    it("should propagate errors from getProjectsForUser", async () => {
      const mockError = new Error("RPC failed");
      mockSupabaseClient.rpc = vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      await expect(
        getDepartmentsForUser(authUsersFixtures.alice.id)
      ).rejects.toThrow("RPC failed");
    });

    it("should handle empty projects array", async () => {
      mockSupabaseClient.rpc = vi.fn().mockResolvedValue({
        data: [{ id: authUsersFixtures.alice.id }],
        error: null,
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });

      const result = await getDepartmentsForUser(authUsersFixtures.alice.id);
      
      expect(result).toEqual([]);
    });
  });
});