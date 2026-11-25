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

const familyProfile: AuthenticatedProfile = {
  profileKey: "marcos",
  displayName: "Marcos",
  role: "admin",
};

function getPathname(input: RequestInfo | URL): string {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

  return new URL(url).pathname;
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
  mockGetCurrentProfile.mockResolvedValue(familyProfile);
});

describe("care history API", () => {
  it("includes the completion observation in history entries", async () => {
    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
      const pathname = getPathname(input);

      if (pathname.endsWith("/care_completions")) {
        return Response.json([
          {
            id: "completion-1",
            activity_date: "2026-11-25",
            feeding_schedule_id: null,
            medication_schedule_id: null,
            care_task_id: "task-1",
            completed_by: "marcos",
            completed_at: "2026-11-25T10:00:00.000Z",
            observation: "Se rellenó el cuenco de agua",
          },
        ]);
      }

      if (pathname.endsWith("/feeding_schedules")) {
        return Response.json([]);
      }

      if (pathname.endsWith("/medication_schedules")) {
        return Response.json([]);
      }

      if (pathname.endsWith("/care_tasks")) {
        return Response.json([
          { id: "task-1", task_name: "Cambiar agua", scheduled_time: null },
        ]);
      }

      if (pathname.endsWith("/profiles")) {
        return Response.json([
          { profile_key: "marcos", display_name: "Marcos" },
        ]);
      }

      throw new Error(`Unexpected Supabase request: ${pathname}`);
    });

    const response = await GET(
      new Request(
        "http://localhost/api/care/history?from=2026-11-25&to=2026-11-25",
      ),
    );
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.entries[0]).toMatchObject({
      label: "Cambiar agua",
      observation: "Se rellenó el cuenco de agua",
    });
  });
});
