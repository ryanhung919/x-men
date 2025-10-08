import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  authUsersFixtures,
  projectsFixtures,
  departmentsFixtures,
} from "@/__tests__/fixtures/database.fixtures";
import { createMockSupabaseClient } from "@/__tests__/mocks/supabase.mock";

// Mock all dependencies
let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => mockSupabaseClient),
}));

vi.mock("@/lib/services/report", () => ({
  generateLoggedTimeReport: vi.fn(),
  generateTeamSummaryReport: vi.fn(),
  generateTaskCompletionReport: vi.fn(),
}));

vi.mock("@/lib/services/filter", () => ({
  filterDepartments: vi.fn(),
  filterProjects: vi.fn(),
}));

// Dynamic imports after mocks
const { GET } = await import("@/app/api/reports/route");
const { 
  generateLoggedTimeReport,
  generateTeamSummaryReport,
  generateTaskCompletionReport 
} = await import("@/lib/services/report");
const { filterDepartments, filterProjects } = await import("@/lib/services/filter");

describe("app/api/reports/route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseClient = createMockSupabaseClient();
  });

  // Helper to create mock NextRequest
  function createMockRequest(url: string): NextRequest {
    return new NextRequest(new URL(url, "http://localhost:3000"));
  }

  describe("GET /api/reports", () => {
    describe("action=departments", () => {
      it("should return departments for authenticated user", async () => {
        const mockDepartments = [
          departmentsFixtures.engineering,
          departmentsFixtures.finance,
        ];

        mockSupabaseClient.auth = {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: authUsersFixtures.alice.id } },
            error: null,
          }),
        } as any;

        vi.mocked(filterDepartments).mockResolvedValue(mockDepartments);

        const request = createMockRequest("/api/reports?action=departments");
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual(mockDepartments);
        expect(filterDepartments).toHaveBeenCalledWith(
          authUsersFixtures.alice.id,
          undefined
        );
      });

      it("should filter departments by projectIds", async () => {
        const projectIds = [projectsFixtures.alpha.id, projectsFixtures.beta.id];
        const mockDepartments = [departmentsFixtures.engineering];

        mockSupabaseClient.auth = {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: authUsersFixtures.alice.id } },
            error: null,
          }),
        } as any;

        vi.mocked(filterDepartments).mockResolvedValue(mockDepartments);

        const request = createMockRequest(
          `/api/reports?action=departments&projectIds=${projectIds.join(",")}`
        );
        const response = await GET(request);
        const data = await response.json();

        expect(data).toEqual(mockDepartments);
        expect(filterDepartments).toHaveBeenCalledWith(
          authUsersFixtures.alice.id,
          projectIds
        );
      });

      it("should return empty array for unauthenticated user", async () => {
        mockSupabaseClient.auth = {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: new Error("Not authenticated"),
          }),
        } as any;

        const request = createMockRequest("/api/reports?action=departments");
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual([]);
      });
    });

    describe("action=projects", () => {
      it("should return projects for authenticated user", async () => {
        const mockProjects = [projectsFixtures.alpha, projectsFixtures.beta];

        mockSupabaseClient.auth = {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: authUsersFixtures.alice.id } },
            error: null,
          }),
        } as any;

        vi.mocked(filterProjects).mockResolvedValue(mockProjects);

        const request = createMockRequest("/api/reports?action=projects");
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveLength(2);
        expect(data[0]).toMatchObject({
          id: projectsFixtures.alpha.id,
          name: projectsFixtures.alpha.name,
        });
        expect(filterProjects).toHaveBeenCalledWith(
          authUsersFixtures.alice.id,
          undefined
        );
      });

      it("should filter projects by departmentIds", async () => {
        const departmentIds = [
          departmentsFixtures.engineering.id,
          departmentsFixtures.finance.id,
        ];
        const mockProjects = [projectsFixtures.alpha];

        mockSupabaseClient.auth = {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: authUsersFixtures.alice.id } },
            error: null,
          }),
        } as any;

        vi.mocked(filterProjects).mockResolvedValue(mockProjects);

        const request = createMockRequest(
          `/api/reports?action=projects&departmentIds=${departmentIds.join(",")}`
        );
        const response = await GET(request);
        const data = await response.json();

        expect(data).toHaveLength(1);
        expect(data[0]).toMatchObject({
          id: projectsFixtures.alpha.id,
          name: projectsFixtures.alpha.name,
        });
        expect(filterProjects).toHaveBeenCalledWith(
          authUsersFixtures.alice.id,
          departmentIds
        );
      });
    });

    describe("action=time (loggedTime report)", () => {
      it("should generate logged time report with JSON response", async () => {
        const mockReportData = {
          kind: "loggedTime" as const,
          totalTime: 10,
          avgTime: 5,
          completedCount: 3,
          overdueCount: 1,
          timeByTask: new Map(),
          wipTime: 2,
          onTimeRate: 0.8,
          totalLateness: 1.5,
          overdueLoggedTime: 0.5,
        };

        mockSupabaseClient.auth = {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: authUsersFixtures.alice.id } },
            error: null,
          }),
        } as any;

        vi.mocked(generateLoggedTimeReport).mockResolvedValue(mockReportData);

        const request = createMockRequest("/api/reports?action=time");
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toMatchObject({
          kind: "loggedTime",
          totalTime: 10,
          avgTime: 5,
          completedCount: 3,
        });
        expect(generateLoggedTimeReport).toHaveBeenCalledWith({
          projectIds: [],
          startDate: undefined,
          endDate: undefined,
        });
      });

      it("should generate report with filters", async () => {
        const projectIds = [projectsFixtures.alpha.id];
        const startDate = "2024-01-01";
        const endDate = "2024-12-31";
        const mockReportData = {
          kind: "loggedTime" as const,
          totalTime: 10,
          avgTime: 5,
          completedCount: 3,
          overdueCount: 0,
          timeByTask: new Map(),
          wipTime: 0,
          onTimeRate: 1,
          totalLateness: 0,
          overdueLoggedTime: 0,
        };

        mockSupabaseClient.auth = {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: authUsersFixtures.alice.id } },
            error: null,
          }),
        } as any;

        vi.mocked(generateLoggedTimeReport).mockResolvedValue(mockReportData);

        const request = createMockRequest(
          `/api/reports?action=time&projectIds=${projectIds.join(",")}&startDate=${startDate}&endDate=${endDate}`
        );
        const response = await GET(request);
        const data = await response.json();

        expect(data).toMatchObject({
          kind: "loggedTime",
          totalTime: 10,
        });
        expect(generateLoggedTimeReport).toHaveBeenCalledWith({
          projectIds,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        });
      });

      it("should default to time action when no action specified", async () => {
        const mockReportData = {
          kind: "loggedTime" as const,
          totalTime: 0,
          avgTime: 0,
          completedCount: 0,
          overdueCount: 0,
          timeByTask: new Map(),
          wipTime: 0,
          onTimeRate: 0,
          totalLateness: 0,
          overdueLoggedTime: 0,
        };

        mockSupabaseClient.auth = {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: authUsersFixtures.alice.id } },
            error: null,
          }),
        } as any;

        vi.mocked(generateLoggedTimeReport).mockResolvedValue(mockReportData);

        const request = createMockRequest("/api/reports");
        const response = await GET(request);

        expect(response.status).toBe(200);
        expect(generateLoggedTimeReport).toHaveBeenCalled();
      });
    });

    describe("action=team (teamSummary report)", () => {
      it("should generate team summary report", async () => {
        const mockReportData = {
          kind: "teamSummary" as const,
          totalTasks: 5,
          tasksByCreator: new Map([
            ["user1", 3],
            ["user2", 2],
          ]),
        };

        mockSupabaseClient.auth = {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: authUsersFixtures.alice.id } },
            error: null,
          }),
        } as any;

        vi.mocked(generateTeamSummaryReport).mockResolvedValue(mockReportData);

        const request = createMockRequest("/api/reports?action=team");
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toMatchObject({
          kind: "teamSummary",
          totalTasks: 5,
        });
        expect(generateTeamSummaryReport).toHaveBeenCalledWith({
          projectIds: [],
          startDate: undefined,
          endDate: undefined,
        });
      });

      it("should pass filters to team summary report", async () => {
        const projectIds = [1, 2];
        const mockReportData = {
          kind: "teamSummary" as const,
          totalTasks: 2,
          tasksByCreator: new Map(),
        };

        mockSupabaseClient.auth = {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: authUsersFixtures.alice.id } },
            error: null,
          }),
        } as any;

        vi.mocked(generateTeamSummaryReport).mockResolvedValue(mockReportData);

        const request = createMockRequest(
          `/api/reports?action=team&projectIds=${projectIds.join(",")}`
        );
        await GET(request);

        expect(generateTeamSummaryReport).toHaveBeenCalledWith({
          projectIds,
          startDate: undefined,
          endDate: undefined,
        });
      });
    });

    describe("action=task (taskCompletion report)", () => {
      it("should generate task completion report", async () => {
        const mockReportData = {
          kind: "taskCompletions" as const,
          completionRate: 0.75,
          completedByProject: new Map([
            [1, 5],
            [2, 3],
          ]),
        };

        mockSupabaseClient.auth = {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: authUsersFixtures.alice.id } },
            error: null,
          }),
        } as any;

        vi.mocked(generateTaskCompletionReport).mockResolvedValue(mockReportData);

        const request = createMockRequest("/api/reports?action=task");
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toMatchObject({
          kind: "taskCompletions",
          completionRate: 0.75,
        });
        expect(generateTaskCompletionReport).toHaveBeenCalledWith({
          projectIds: [],
          startDate: undefined,
          endDate: undefined,
        });
      });

      it("should pass filters to task completion report", async () => {
        const projectIds = [1];
        const startDate = "2024-01-01";
        const mockReportData = {
          kind: "taskCompletions" as const,
          completionRate: 0.5,
          completedByProject: new Map(),
        };

        mockSupabaseClient.auth = {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: authUsersFixtures.alice.id } },
            error: null,
          }),
        } as any;

        vi.mocked(generateTaskCompletionReport).mockResolvedValue(mockReportData);

        const request = createMockRequest(
          `/api/reports?action=task&projectIds=${projectIds.join(",")}&startDate=${startDate}`
        );
        await GET(request);

        expect(generateTaskCompletionReport).toHaveBeenCalledWith({
          projectIds,
          startDate: new Date(startDate),
          endDate: undefined,
        });
      });
    });

    describe("error handling", () => {
      it("should return 400 for invalid action", async () => {
        mockSupabaseClient.auth = {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: authUsersFixtures.alice.id } },
            error: null,
          }),
        } as any;

        const request = createMockRequest("/api/reports?action=invalid");
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data).toHaveProperty("error", "Invalid action");
      });

      it("should return 500 on server error", async () => {
        mockSupabaseClient.auth = {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: authUsersFixtures.alice.id } },
            error: null,
          }),
        } as any;

        vi.mocked(filterDepartments).mockRejectedValue(
          new Error("Database connection failed")
        );

        const request = createMockRequest("/api/reports?action=departments");
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data).toHaveProperty("error", "Server error");
        expect(data).toHaveProperty("details");
      });
    });

    describe("parameter parsing", () => {
      it("should parse comma-separated projectIds correctly", async () => {
        mockSupabaseClient.auth = {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: authUsersFixtures.alice.id } },
            error: null,
          }),
        } as any;

        vi.mocked(filterDepartments).mockResolvedValue([]);

        const request = createMockRequest(
          "/api/reports?action=departments&projectIds=1,2,3"
        );
        await GET(request);

        expect(filterDepartments).toHaveBeenCalledWith(
          authUsersFixtures.alice.id,
          [1, 2, 3]
        );
      });

      it("should filter out invalid numbers from comma-separated params", async () => {
        mockSupabaseClient.auth = {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: authUsersFixtures.alice.id } },
            error: null,
          }),
        } as any;

        vi.mocked(filterDepartments).mockResolvedValue([]);

        const request = createMockRequest(
          "/api/reports?action=departments&projectIds=1,invalid,2,NaN,3"
        );
        await GET(request);

        expect(filterDepartments).toHaveBeenCalledWith(
          authUsersFixtures.alice.id,
          [1, 2, 3]
        );
      });

      it("should handle empty comma-separated params", async () => {
        mockSupabaseClient.auth = {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: authUsersFixtures.alice.id } },
            error: null,
          }),
        } as any;

        vi.mocked(filterDepartments).mockResolvedValue([]);

        const request = createMockRequest(
          "/api/reports?action=departments&projectIds="
        );
        await GET(request);

        // Empty string results in undefined after parseArrayParam
        const calls = vi.mocked(filterDepartments).mock.calls[0];
        expect(calls[0]).toBe(authUsersFixtures.alice.id);
        expect(calls[1]).toBeUndefined();
      });

      it("should parse date strings correctly", async () => {
        mockSupabaseClient.auth = {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: authUsersFixtures.alice.id } },
            error: null,
          }),
        } as any;

        vi.mocked(generateLoggedTimeReport).mockResolvedValue({
          kind: "loggedTime" as const,
          totalTime: 0,
          avgTime: 0,
          completedCount: 0,
          overdueCount: 0,
          timeByTask: new Map(),
          wipTime: 0,
          onTimeRate: 0,
          totalLateness: 0,
          overdueLoggedTime: 0,
        });

        const request = createMockRequest(
          "/api/reports?action=time&startDate=2024-01-01T00:00:00Z&endDate=2024-12-31T23:59:59Z"
        );
        await GET(request);

        expect(generateLoggedTimeReport).toHaveBeenCalledWith(
          expect.objectContaining({
            startDate: new Date("2024-01-01T00:00:00Z"),
            endDate: new Date("2024-12-31T23:59:59Z"),
          })
        );
      });

      it("should handle invalid date strings", async () => {
        mockSupabaseClient.auth = {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: authUsersFixtures.alice.id } },
            error: null,
          }),
        } as any;

        vi.mocked(generateLoggedTimeReport).mockResolvedValue({
          kind: "loggedTime",
          totalTime: 0,
          avgTime: 0,
          completedCount: 0,
          overdueCount: 0,
          timeByTask: new Map(),
          wipTime: 0,
          onTimeRate: 0,
          totalLateness: 0,
          overdueLoggedTime: 0,
        });

        const request = createMockRequest(
          "/api/reports?action=time&startDate=invalid-date"
        );
        await GET(request);

        expect(generateLoggedTimeReport).toHaveBeenCalledWith({
          projectIds: [],
          startDate: undefined, // Invalid date becomes undefined
          endDate: undefined,
        });
      });
    });
  });
});