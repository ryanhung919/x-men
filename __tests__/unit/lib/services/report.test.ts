import { describe, it, expect, vi, beforeEach } from "vitest";
import { tasks } from "@/__tests__/fixtures/database.fixtures";


// Mock dependencies
vi.mock("@/lib/db/report", () => ({
  getTasks: vi.fn(),
}));

vi.mock("jspdf", () => ({
  jsPDF: vi.fn().mockImplementation(() => ({
    text: vi.fn(),
    output: vi.fn().mockReturnValue(Buffer.from("mock-pdf")),
  })),
}));

vi.mock("xlsx", () => ({
  utils: {
    json_to_sheet: vi.fn().mockReturnValue({}),
    book_new: vi.fn().mockReturnValue({}),
    book_append_sheet: vi.fn(),
  },
  write: vi.fn().mockReturnValue(Buffer.from("mock-xlsx")),
}));

// Dynamic import after mocks
const { generateReport, exportReport } = await import("@/lib/services/report");
const { getTasks } = await import("@/lib/db/report");

describe("lib/services/report", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateReport", () => {
    describe("loggedTime report type", () => {
      it("should generate logged time report with correct metrics", async () => {
        const mockTasks = [
          {
            ...tasks[0],
            status: "Done",
            logged_time: 3600, // 1 hour
            deadline: "2024-01-15T00:00:00Z",
            updated_at: "2024-01-14T00:00:00Z", // On time
          },
          {
            ...tasks[1],
            status: "Done",
            logged_time: 7200, // 2 hours
            deadline: "2024-01-20T00:00:00Z",
            updated_at: "2024-01-22T00:00:00Z", // Late by 2 days
          },
          {
            ...tasks[2],
            status: "In Progress",
            logged_time: 1800, // 0.5 hours
            deadline: "2024-01-01T00:00:00Z", // Overdue
          },
        ];

        vi.mocked(getTasks).mockResolvedValue(mockTasks as any);

        const result = await generateReport({
          projectIds: [1],
          type: "loggedTime",
        });

        expect(result).toHaveProperty("totalTime");
        expect(result).toHaveProperty("avgTime");
        expect(result).toHaveProperty("completedCount", 2);
        expect(result).toHaveProperty("overdueCount", 1);
        expect(result).toHaveProperty("onTimeRate");
        expect(result).toHaveProperty("totalLateness");
        expect(result).toHaveProperty("wipTime");
        expect(result).toHaveProperty("overdueLoggedTime");

        // Verify calculations
        expect(result.completedCount).toBe(2);
        expect(result.overdueCount).toBe(1);
        expect(result.onTimeRate).toBe(0.5); // 1 out of 2 on time
      });

      it("should calculate total time correctly", async () => {
        const mockTasks = [
          { ...tasks[0], logged_time: 3600, status: "Done" },
          { ...tasks[1], logged_time: 7200, status: "Done" },
        ];

        vi.mocked(getTasks).mockResolvedValue(mockTasks as any);

        const result = await generateReport({
          type: "loggedTime",
        });

        // Total: (3600 + 7200) / 3600 = 3 hours
        expect(result.totalTime).toBe(3);
      });

      it("should calculate average time correctly", async () => {
        const mockTasks = [
          { ...tasks[0], logged_time: 3600, status: "Done" },
          { ...tasks[1], logged_time: 7200, status: "Done" },
          { ...tasks[2], logged_time: 1800, status: "In Progress" },
        ];

        vi.mocked(getTasks).mockResolvedValue(mockTasks as any);

        const result = await generateReport({
          type: "loggedTime",
        });

        // Avg for completed: (3600 + 7200) / 2 / 3600 = 1.5 hours
        expect(result.avgTime).toBe(1.5);
      });

      it("should handle tasks with no deadline", async () => {
        const mockTasks = [
          { ...tasks[0], status: "Done", logged_time: 3600, deadline: null },
        ];

        vi.mocked(getTasks).mockResolvedValue(mockTasks as any);

        const result = await generateReport({
          type: "loggedTime",
        });

        expect(result.onTimeRate).toBe(0); // No deadlines to compare
      });

      it("should handle empty task list", async () => {
        vi.mocked(getTasks).mockResolvedValue([]);

        const result = await generateReport({
          type: "loggedTime",
        });

        expect(result.totalTime).toBe(0);
        expect(result.avgTime).toBe(0);
        expect(result.completedCount).toBe(0);
        expect(result.overdueCount).toBe(0);
      });

      it("should rollup logged time for subtasks to parent", async () => {
        const mockTasks = [
          { 
            ...tasks[0], 
            id: 1, 
            logged_time: 3600, 
            parent_task_id: null,
            status: "Done" 
          },
          { 
            ...tasks[1], 
            id: 2, 
            logged_time: 1800, 
            parent_task_id: 1,
            status: "Done" 
          },
        ];

        vi.mocked(getTasks).mockResolvedValue(mockTasks as any);

        const result = await generateReport({
          type: "loggedTime",
        });

        // Parent should have its own time + subtask time
        expect(result.timeByTask.get(1)).toBe(3600 + 1800);
        expect(result.timeByTask.get(2)).toBe(1800);
      });

      it("should calculate overdue logged time correctly", async () => {
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const mockTasks = [
          {
            ...tasks[0],
            status: "In Progress",
            logged_time: 7200, // 2 hours
            deadline: yesterday.toISOString(),
          },
        ];

        vi.mocked(getTasks).mockResolvedValue(mockTasks as any);

        const result = await generateReport({
          type: "loggedTime",
        });

        expect(result.overdueLoggedTime).toBe(2);
      });

      it("should calculate lateness in hours", async () => {
        const mockTasks = [
          {
            ...tasks[0],
            status: "Done",
            logged_time: 3600,
            deadline: "2024-01-15T00:00:00Z",
            updated_at: "2024-01-15T12:00:00Z", // 12 hours late
          },
        ];

        vi.mocked(getTasks).mockResolvedValue(mockTasks as any);

        const result = await generateReport({
          type: "loggedTime",
        });

        expect(result.totalLateness).toBeGreaterThan(0);
      });
    });

    it("should pass filters to getTasks", async () => {
      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-12-31");
      const projectIds = [1, 2];

      vi.mocked(getTasks).mockResolvedValue([]);

      await generateReport({
        projectIds,
        startDate,
        endDate,
        type: "loggedTime",
      });

      expect(getTasks).toHaveBeenCalledWith({
        projectIds,
        startDate,
        endDate,
      });
    });

    it("should return empty object for unknown report type", async () => {
      vi.mocked(getTasks).mockResolvedValue([]);

      const result = await generateReport({
        type: "unknownType" as any,
      });

      expect(result).toEqual({});
    });
  });

  // describe("exportReport", () => {
  //   it("should export report as PDF", async () => {
  //     const reportData = { totalTime: 10, avgTime: 5 };

  //     const result = await exportReport(reportData, {
  //       type: "loggedTime",
  //       format: "pdf",
  //     });

  //     expect(result).toHaveProperty("buffer");
  //     expect(result).toHaveProperty("mime", "application/pdf");
  //     expect(result.buffer).toBeInstanceOf(ArrayBuffer);
  //   });

  //   it("should export report as XLSX", async () => {
  //     const reportData = [{ task: "Task 1", time: 10 }];

  //     const result = await exportReport(reportData, {
  //       type: "loggedTime",
  //       format: "xlsx",
  //     });

  //     expect(result).toHaveProperty("buffer");
  //     expect(result).toHaveProperty(
  //       "mime",
  //       "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  //     );
  //   });

  //   it("should handle object data for XLSX export", async () => {
  //     const reportData = { 
  //       totalTime: 10, 
  //       avgTime: 5,
  //       completedCount: 3 
  //     };

  //     const result = await exportReport(reportData, {
  //       type: "loggedTime",
  //       format: "xlsx",
  //     });

  //     expect(result.buffer).toBeDefined();
  //   });

  //   it("should throw error for unsupported format", async () => {
  //     const reportData = { totalTime: 10 };

  //     await expect(
  //       exportReport(reportData, {
  //         type: "loggedTime",
  //         format: "csv" as any,
  //       })
  //     ).rejects.toThrow("Unsupported export format");
  //   });

  //   it("should include report type in PDF", async () => {
  //     const { jsPDF } = await import("jspdf");
  //     const reportData = { totalTime: 10 };

  //     await exportReport(reportData, {
  //       type: "loggedTime",
  //       format: "pdf",
  //     });

  //     const mockInstance = vi.mocked(jsPDF).mock.results[0]?.value;
  //     expect(mockInstance.text).toHaveBeenCalledWith(
  //       "loggedTime Report",
  //       10,
  //       10
  //     );
  //   });
  // });
});