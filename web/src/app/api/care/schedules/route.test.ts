import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import type { AuthenticatedProfile } from "@/lib/auth/session";

const { mockFetch, mockGetCurrentProfile } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
  mockGetCurrentProfile: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/session", () => ({
  getCurrentProfile: mockGetCurrentProfile,
  SESSION_COOKIE_NAME: "nanafy_session",
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: "valid-session-token" }) }),
}));

const guestProfile: AuthenticatedProfile = {
  profileKey: "invitado",
  displayName: "Invitado",
  role: "guest",
};

function getRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }

  return input instanceof URL ? input.toString() : input.url;
}

beforeAll(() => {
  process.env.SUPABASE_URL = "http://127.0.0.1:54321";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
  vi.stubGlobal("fetch", mockFetch);
});

afterAll(() => {
  vi.unstubAllGlobals();
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

beforeEach(() => {
  mockFetch.mockReset();
  mockGetCurrentProfile.mockReset();
  mockGetCurrentProfile.mockResolvedValue(guestProfile);
});

describe("daily care schedule API", () => {
  it("shows guests today's schedules, medication details, and completion state", async () => {
    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
      const { pathname } = new URL(getRequestUrl(input));

      if (pathname.endsWith("/feeding_schedules")) {
        return Response.json([
          {
            id: "feeding-1",
            meal_name: "Desayuno",
            portion: "Una ración",
            day_of_week: 1,
            scheduled_time: "08:00:00",
            is_active: true,
          },
        ]);
      }

      if (pathname.endsWith("/medication_schedules")) {
        return Response.json([
          {
            id: "medication-1",
            medication_name: "Tratamiento",
            instructions: "Con comida",
            start_date: "2026-01-05",
            end_date: null,
            is_active: true,
          },
        ]);
      }

      if (pathname.endsWith("/care_tasks")) {
        return Response.json([
          {
            id: "task-1",
            task_name: "Cambiar agua",
            instructions: null,
            day_of_week: 1,
            scheduled_time: null,
            is_active: true,
          },
        ]);
      }

      if (pathname.endsWith("/care_completions")) {
        return Response.json([
          {
            feeding_schedule_id: "feeding-1",
            medication_schedule_id: null,
            care_task_id: null,
            completed_by: "mama",
            completed_at: "2026-01-05T07:55:00.000Z",
            observation: "Dejó algo de comida",
          },
        ]);
      }

      if (pathname.endsWith("/medication_schedule_times")) {
        return Response.json([
          {
            medication_schedule_id: "medication-1",
            day_of_week: 1,
            scheduled_time: "09:00:00",
          },
        ]);
      }

      throw new Error(`Unexpected Supabase request: ${pathname}`);
    });

    const response = await GET(
      new Request("http://localhost/api/care/schedules?date=2026-01-05"),
    );
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.dayOfWeek).toBe(1);
    expect(result.feedings[0]).toMatchObject({
      mealName: "Desayuno",
      isCompleted: true,
      completedBy: "mama",
      completedObservation: "Dejó algo de comida",
    });
    expect(result.medications[0]).toMatchObject({
      medicationName: "Tratamiento",
      instructions: "Con comida",
      times: ["09:00:00"],
      isCompleted: false,
    });
    expect(result.tasks[0]).toMatchObject({
      taskName: "Cambiar agua",
      isCompleted: false,
      completedObservation: null,
    });
  });

  it("rejects malformed dates without querying the database", async () => {
    const response = await GET(
      new Request("http://localhost/api/care/schedules?date=2026-02-30"),
    );

    expect(response.status).toBe(400);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
