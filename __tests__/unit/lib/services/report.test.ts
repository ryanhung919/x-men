import { describe, it, expect, vi, beforeEach } from "vitest";
import { tasks } from "@/__tests__/fixtures/database.fixtures";

// Mock dependencies
vi.mock("@/lib/db/report", () => ({
  getTasks: vi.fn(),
}));

// Dynamic import after mocks
const { 
  generateLoggedTimeReport,
  generateTeamSummaryReport,
  generateTaskCompletionReport,
} = await import("@/lib/services/report");
const { getTasks } = await import("@/lib/db/report");

describe("lib/services/report", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateLoggedTimeReport", () => {
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

      const result = await generateLoggedTimeReport({
        projectIds: [1],
      });

      expect(result).toHaveProperty("kind", "loggedTime");
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

      const result = await generateLoggedTimeReport({});

      // Total: (3600 + 7200) / 3600 = 3 hours
      expect(result.totalTime).toBe(3);
      expect(result.kind).toBe("loggedTime");
    });

    it("should calculate average time correctly", async () => {
      const mockTasks = [
        { ...tasks[0], logged_time: 3600, status: "Done" },
        { ...tasks[1], logged_time: 7200, status: "Done" },
        { ...tasks[2], logged_time: 1800, status: "In Progress" },
      ];

      vi.mocked(getTasks).mockResolvedValue(mockTasks as any);

      const result = await generateLoggedTimeReport({});

      // Avg for completed: (3600 + 7200) / 2 / 3600 = 1.5 hours
      expect(result.avgTime).toBe(1.5);
    });

    it("should handle tasks with no deadline", async () => {
      const mockTasks = [
        { ...tasks[0], status: "Done", logged_time: 3600, deadline: null },
      ];

      vi.mocked(getTasks).mockResolvedValue(mockTasks as any);

      const result = await generateLoggedTimeReport({});

      expect(result.onTimeRate).toBe(0); // No deadlines to compare
    });

    it("should handle empty task list", async () => {
      vi.mocked(getTasks).mockResolvedValue([]);

      const result = await generateLoggedTimeReport({});

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

      const result = await generateLoggedTimeReport({});

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

      const result = await generateLoggedTimeReport({});

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

      const result = await generateLoggedTimeReport({});

      expect(result.totalLateness).toBeGreaterThan(0);
    });

    it("should pass filters to getTasks", async () => {
      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-12-31");
      const projectIds = [1, 2];

      vi.mocked(getTasks).mockResolvedValue([]);

      await generateLoggedTimeReport({
        projectIds,
        startDate,
        endDate,
      });

      expect(getTasks).toHaveBeenCalledWith({
        projectIds,
        startDate,
        endDate,
      });
    });
  });

  describe("generateTeamSummaryReport", () => {
    it("should generate team summary report with correct data", async () => {
      const mockTasks = [
        { ...tasks[0], status: "Done", creator_id: "user1" },
        { ...tasks[1], status: "In Progress", creator_id: "user1" },
        { ...tasks[2], status: "Done", creator_id: "user2" },
      ];

      vi.mocked(getTasks).mockResolvedValue(mockTasks as any);

      const result = await generateTeamSummaryReport({});

      expect(result).toHaveProperty("kind", "teamSummary");
      expect(result).toHaveProperty("totalTasks", 3);
      expect(result).toHaveProperty("tasksByCreator");
      
      // Verify tasks by creator
      expect(result.tasksByCreator.get("user1")).toBe(2);
      expect(result.tasksByCreator.get("user2")).toBe(1);
    });

    it("should handle tasks with no creator_id", async () => {
      const mockTasks = [
        { ...tasks[0], creator_id: undefined },
        { ...tasks[1], creator_id: "user1" },
      ];

      vi.mocked(getTasks).mockResolvedValue(mockTasks as any);

      const result = await generateTeamSummaryReport({});

      expect(result.tasksByCreator.get("unknown")).toBe(1);
      expect(result.tasksByCreator.get("user1")).toBe(1);
    });

    it("should handle empty task list", async () => {
      vi.mocked(getTasks).mockResolvedValue([]);

      const result = await generateTeamSummaryReport({});

      expect(result.totalTasks).toBe(0);
      expect(result.tasksByCreator.size).toBe(0);
    });

    it("should pass filters to getTasks", async () => {
      const projectIds = [1, 2];
      vi.mocked(getTasks).mockResolvedValue([]);

      await generateTeamSummaryReport({ projectIds });

      expect(getTasks).toHaveBeenCalledWith({
        projectIds,
        startDate: undefined,
        endDate: undefined,
      });
    });
  });

  describe("generateTaskCompletionReport", () => {
    it("should generate task completion report with correct data", async () => {
      const mockTasks = [
        { ...tasks[0], status: "Done", project_id: 1 },
        { ...tasks[1], status: "Done", project_id: 1 },
        { ...tasks[2], status: "In Progress", project_id: 2 },
        { ...tasks[3], status: "To Do", project_id: 2 },
      ];

      vi.mocked(getTasks).mockResolvedValue(mockTasks as any);

      const result = await generateTaskCompletionReport({});

      expect(result).toHaveProperty("kind", "taskCompletions");
      expect(result).toHaveProperty("completionRate");
      expect(result).toHaveProperty("completedByProject");

      // 2 completed out of 4 total = 0.5
      expect(result.completionRate).toBe(0.5);
      
      // Project 1 has 2 completed
      expect(result.completedByProject.get(1)).toBe(2);
      
      // Project 2 has 0 completed
      expect(result.completedByProject.get(2)).toBeUndefined();
    });

    it("should handle all completed tasks", async () => {
      const mockTasks = [
        { ...tasks[0], status: "Done", project_id: 1 },
        { ...tasks[1], status: "Done", project_id: 1 },
      ];

      vi.mocked(getTasks).mockResolvedValue(mockTasks as any);

      const result = await generateTaskCompletionReport({});

      expect(result.completionRate).toBe(1); // 100% completion
      expect(result.completedByProject.get(1)).toBe(2);
    });

    it("should handle no completed tasks", async () => {
      const mockTasks = [
        { ...tasks[0], status: "To Do", project_id: 1 },
        { ...tasks[1], status: "In Progress", project_id: 1 },
      ];

      vi.mocked(getTasks).mockResolvedValue(mockTasks as any);

      const result = await generateTaskCompletionReport({});

      expect(result.completionRate).toBe(0);
      expect(result.completedByProject.size).toBe(0);
    });

    it("should handle empty task list", async () => {
      vi.mocked(getTasks).mockResolvedValue([]);

      const result = await generateTaskCompletionReport({});

      // Empty list: 0 / 1 = 0 (due to `|| 1` in denominator)
      expect(result.completionRate).toBe(0);
      expect(result.completedByProject.size).toBe(0);
    });

    it("should aggregate completions per project correctly", async () => {
      const mockTasks = [
        { ...tasks[0], status: "Done", project_id: 1 },
        { ...tasks[1], status: "Done", project_id: 2 },
        { ...tasks[2], status: "Done", project_id: 2 },
        { ...tasks[3], status: "In Progress", project_id: 3 },
      ];

      vi.mocked(getTasks).mockResolvedValue(mockTasks as any);

      const result = await generateTaskCompletionReport({});

      expect(result.completedByProject.get(1)).toBe(1);
      expect(result.completedByProject.get(2)).toBe(2);
      expect(result.completedByProject.get(3)).toBeUndefined();
    });

    it("should pass filters to getTasks", async () => {
      const projectIds = [1];
      const startDate = new Date("2024-01-01");

      vi.mocked(getTasks).mockResolvedValue([]);

      await generateTaskCompletionReport({ projectIds, startDate });

      expect(getTasks).toHaveBeenCalledWith({
        projectIds,
        startDate,
        endDate: undefined,
      });
    });
  });
});