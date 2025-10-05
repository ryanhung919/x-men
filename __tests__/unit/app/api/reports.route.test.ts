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
  generateReport: vi.fn(),
  exportReport: vi.fn(),
}));

vi.mock("@/lib/services/filter", () => ({
  filterDepartments: vi.fn(),
  filterProjects: vi.fn(),
}));

// Dynamic imports after mocks
const { GET } = await import("@/app/api/reports/route");
const { generateReport, exportReport } = await import("@/lib/services/report");
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

    describe("action=report", () => {
      it("should generate report with JSON response", async () => {
        const mockReportData = {
          totalTime: 10,
          avgTime: 5,
          completedCount: 3,
        };

        mockSupabaseClient.auth = {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: authUsersFixtures.alice.id } },
            error: null,
          }),
        } as any;

        vi.mocked(generateReport).mockResolvedValue(mockReportData);

        const request = createMockRequest(
          "/api/reports?action=report&type=loggedTime"
        );
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual(mockReportData);
        expect(generateReport).toHaveBeenCalledWith({
          projectIds: [],
          startDate: undefined,
          endDate: undefined,
          type: "loggedTime",
        });
      });

      it("should generate report with filters", async () => {
        const projectIds = [projectsFixtures.alpha.id];
        const startDate = "2024-01-01";
        const endDate = "2024-12-31";
        const mockReportData = { totalTime: 10 };

        mockSupabaseClient.auth = {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: authUsersFixtures.alice.id } },
            error: null,
          }),
        } as any;

        vi.mocked(generateReport).mockResolvedValue(mockReportData);

        const request = createMockRequest(
          `/api/reports?action=report&type=loggedTime&projectIds=${projectIds.join(",")}&startDate=${startDate}&endDate=${endDate}`
        );
        const response = await GET(request);
        const data = await response.json();

        expect(data).toEqual(mockReportData);
        expect(generateReport).toHaveBeenCalledWith({
          projectIds,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          type: "loggedTime",
        });
      });

      it("should export report as PDF", async () => {
        const mockReportData = { totalTime: 10 };
        const mockPdfBuffer = Buffer.from("mock-pdf");

        mockSupabaseClient.auth = {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: authUsersFixtures.alice.id } },
            error: null,
          }),
        } as any;

        vi.mocked(generateReport).mockResolvedValue(mockReportData);
        vi.mocked(exportReport).mockResolvedValue({
          buffer: mockPdfBuffer,
          mime: "application/pdf",
        });

        const request = createMockRequest(
          "/api/reports?action=report&type=loggedTime&format=pdf"
        );
        const response = await GET(request);

        expect(response.status).toBe(200);
        expect(response.headers.get("Content-Type")).toBe("application/pdf");
        expect(exportReport).toHaveBeenCalledWith(mockReportData, {
          projectIds: [],
          startDate: undefined,
          endDate: undefined,
          type: "loggedTime",
          format: "pdf",
        });
      });

      it("should export report as XLSX", async () => {
        const mockReportData = { totalTime: 10 };
        const mockXlsxBuffer = Buffer.from("mock-xlsx");

        mockSupabaseClient.auth = {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: authUsersFixtures.alice.id } },
            error: null,
          }),
        } as any;

        vi.mocked(generateReport).mockResolvedValue(mockReportData);
        vi.mocked(exportReport).mockResolvedValue({
          buffer: mockXlsxBuffer,
          mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        const request = createMockRequest(
          "/api/reports?action=report&type=loggedTime&format=xlsx"
        );
        const response = await GET(request);

        expect(response.status).toBe(200);
        expect(response.headers.get("Content-Type")).toBe(
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
      });

      it("should default to loggedTime report type", async () => {
        mockSupabaseClient.auth = {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: authUsersFixtures.alice.id } },
            error: null,
          }),
        } as any;

        vi.mocked(generateReport).mockResolvedValue({});

        const request = createMockRequest("/api/reports?action=report");
        await GET(request);

        expect(generateReport).toHaveBeenCalledWith(
          expect.objectContaining({ type: "loggedTime" })
        );
      });
    });

    describe("action=time", () => {
      it("should handle time action as alias for report", async () => {
        const mockReportData = { totalTime: 10 };

        mockSupabaseClient.auth = {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: authUsersFixtures.alice.id } },
            error: null,
          }),
        } as any;

        vi.mocked(generateReport).mockResolvedValue(mockReportData);

        const request = createMockRequest("/api/reports?action=time&type=loggedTime");
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual(mockReportData);
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

      it("should handle missing action parameter", async () => {
        mockSupabaseClient.auth = {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: authUsersFixtures.alice.id } },
            error: null,
          }),
        } as any;

        const request = createMockRequest("/api/reports");
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data).toHaveProperty("error");
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
      })

      it("should parse date strings correctly", async () => {
        mockSupabaseClient.auth = {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: authUsersFixtures.alice.id } },
            error: null,
          }),
        } as any;

        vi.mocked(generateReport).mockResolvedValue({});

        const request = createMockRequest(
          "/api/reports?action=report&startDate=2024-01-01T00:00:00Z&endDate=2024-12-31T23:59:59Z"
        );
        await GET(request);

        expect(generateReport).toHaveBeenCalledWith(
          expect.objectContaining({
            startDate: new Date("2024-01-01T00:00:00Z"),
            endDate: new Date("2024-12-31T23:59:59Z"),
          })
        );
      });
    });
  });
});