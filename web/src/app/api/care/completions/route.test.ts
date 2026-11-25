import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
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
const scheduleId = "550e8400-e29b-41d4-a716-446655440000";
const activityDate = new Date().toISOString().slice(0, 10);
const dayOfWeek = new Date(`${activityDate}T00:00:00.000Z`).getUTCDay() || 7;

function getRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }

  return input instanceof URL ? input.toString() : input.url;
}

function completionRequest() {
  return new Request("http://localhost/api/care/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      activityType: "feeding",
      scheduleId,
      activityDate,
    }),
  });
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

describe("care completion API", () => {
  it("records guest attribution without changing the saved schedule", async () => {
    mockFetch.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const { pathname } = new URL(getRequestUrl(input));

      if (pathname.endsWith("/feeding_schedules")) {
        return Response.json({ day_of_week: dayOfWeek });
      }

      if (pathname.endsWith("/care_completions")) {
        expect(init?.method).toBe("POST");
        expect(JSON.parse(String(init?.body))).toMatchObject({
          feeding_schedule_id: scheduleId,
          activity_date: activityDate,
          completed_by: "invitado",
        });

        return Response.json(
          {
            id: "completion-1",
            activity_date: activityDate,
            completed_by: "invitado",
            completed_at: "2026-11-25T10:00:00.000Z",
          },
          { status: 201 },
        );
      }

      throw new Error(`Unexpected Supabase request: ${pathname}`);
    });

    const response = await POST(completionRequest());
    const result = await response.json();

    expect(response.status).toBe(201);
    expect(result.completion).toMatchObject({
      activityDate,
      completedBy: "invitado",
    });
  });

  it("rejects completion when the schedule is not planned for that weekday", async () => {
    mockFetch.mockResolvedValue(
      Response.json({ day_of_week: dayOfWeek === 7 ? 6 : dayOfWeek + 1 }),
    );

    const response = await POST(completionRequest());

    expect(response.status).toBe(409);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("returns a conflict when the database reports a duplicate completion", async () => {
    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
      const { pathname } = new URL(getRequestUrl(input));

      if (pathname.endsWith("/feeding_schedules")) {
        return Response.json({ day_of_week: dayOfWeek });
      }

      if (pathname.endsWith("/care_completions")) {
        return Response.json(
          { code: "23505", message: "duplicate key value violates unique constraint" },
          { status: 409 },
        );
      }

      throw new Error(`Unexpected Supabase request: ${pathname}`);
    });

    const response = await POST(completionRequest());

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: "Esta actividad ya se había marcado como completada.",
    });
  });
});
