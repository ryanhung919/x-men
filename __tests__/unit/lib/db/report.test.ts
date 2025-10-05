import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabaseClient } from "@/__tests__/mocks/supabase.mock";
import { tasks, projectsFixtures } from "@/__tests__/fixtures/database.fixtures";

// Mock the Supabase client module BEFORE importing
let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => mockSupabaseClient),
}));

// Dynamic import AFTER mock setup
const { getTasks } = await import("@/lib/db/report");

describe("lib/db/report", () => {
  beforeEach(() => {
    mockSupabaseClient = createMockSupabaseClient();
  });

  describe("getTasks", () => {
    it("should return all tasks when no filters provided", async () => {
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: tasks,
          error: null,
        }),
      });

      const result = await getTasks({});

      expect(mockSupabaseClient.from).toHaveBeenCalledWith("tasks");
      expect(result).toEqual(tasks);
      expect(result).toHaveLength(tasks.length);
    });

    it("should filter by single projectId", async () => {
      const filteredTasks = tasks.filter(
        (task) => task.project_id === projectsFixtures.alpha.id
      );

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: filteredTasks,
            error: null,
          }),
        }),
      });

      const result = await getTasks({ projectIds: [projectsFixtures.alpha.id] });

      expect(result).toEqual(filteredTasks);
    });

    it("should filter by multiple projectIds", async () => {
      const projectIds = [projectsFixtures.alpha.id, projectsFixtures.beta.id];
      const filteredTasks = tasks.filter((task) =>
        projectIds.includes(task.project_id)
      );

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: filteredTasks,
            error: null,
          }),
        }),
      });

      const result = await getTasks({ projectIds });

      expect(result).toHaveLength(filteredTasks.length);
    });

    it("should filter by startDate", async () => {
      const startDate = new Date("2024-01-01");

      const mockGte = vi.fn().mockResolvedValue({
        data: tasks,
        error: null,
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          gte: mockGte,
        }),
      });

      const result = await getTasks({ startDate });

      expect(mockGte).toHaveBeenCalledWith("created_at", startDate.toISOString());
      expect(result).toEqual(tasks);
    });

    it("should filter by endDate", async () => {
      const endDate = new Date("2024-12-31");

      const mockLte = vi.fn().mockResolvedValue({
        data: tasks,
        error: null,
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          lte: mockLte,
        }),
      });

      const result = await getTasks({ endDate });

      expect(mockLte).toHaveBeenCalledWith("created_at", endDate.toISOString());
      expect(result).toEqual(tasks);
    });

    it("should filter by date range (startDate and endDate)", async () => {
      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-12-31");

      const mockGte = vi.fn().mockReturnThis();
      const mockLte = vi.fn().mockResolvedValue({
        data: tasks,
        error: null,
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          gte: mockGte,
          lte: mockLte,
        }),
      });

      const result = await getTasks({ startDate, endDate });

      expect(mockGte).toHaveBeenCalledWith("created_at", startDate.toISOString());
      expect(mockLte).toHaveBeenCalledWith("created_at", endDate.toISOString());
      expect(result).toEqual(tasks);
    });

    it("should handle combined filters (projectIds and date range)", async () => {
      const projectIds = [projectsFixtures.alpha.id];
      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-12-31");

      const mockIn = vi.fn().mockReturnThis();
      const mockGte = vi.fn().mockReturnThis();
      const mockLte = vi.fn().mockResolvedValue({
        data: tasks,
        error: null,
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: mockIn,
          gte: mockGte,
          lte: mockLte,
        }),
      });

      const result = await getTasks({ projectIds, startDate, endDate });

      expect(mockIn).toHaveBeenCalledWith("project_id", projectIds);
      expect(mockGte).toHaveBeenCalledWith("created_at", startDate.toISOString());
      expect(mockLte).toHaveBeenCalledWith("created_at", endDate.toISOString());
    });

    it("should return empty array if no tasks found", async () => {
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      const result = await getTasks({});

      expect(result).toEqual([]);
    });

    it("should return empty array if data is null", async () => {
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      const result = await getTasks({});

      expect(result).toEqual([]);
    });

    it("should throw error if query fails", async () => {
      const mockError = new Error("Database query failed");

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: null,
          error: mockError,
        }),
      });

      await expect(getTasks({})).rejects.toThrow("Database query failed");
    });

    it("should not apply projectIds filter when array is empty", async () => {
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: tasks,
          error: null,
        }),
      });

      const result = await getTasks({ projectIds: [] });

      expect(result).toEqual(tasks);
    });

    it("should select correct task fields", async () => {
      const mockSelect = vi.fn().mockResolvedValue({
        data: tasks,
        error: null,
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      await getTasks({});

      expect(mockSelect).toHaveBeenCalledWith(
        expect.stringContaining("id")
      );
      expect(mockSelect).toHaveBeenCalledWith(
        expect.stringContaining("title")
      );
      expect(mockSelect).toHaveBeenCalledWith(
        expect.stringContaining("status")
      );
    });
  });
});