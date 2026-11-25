import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { POST, PATCH } from "./route";
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

const adminProfile: AuthenticatedProfile = {
  profileKey: "marcos",
  displayName: "Marcos",
  role: "admin",
};
const guestProfile: AuthenticatedProfile = {
  profileKey: "invitado",
  displayName: "Invitado",
  role: "guest",
};
const scheduleId = "13f414e0-df66-4aeb-98a8-0374f11a5308";

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
  mockGetCurrentProfile.mockResolvedValue(adminProfile);
});

describe("care schedule administration API", () => {
  it("allows Marcos to create medication instructions and planned times", async () => {
    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
      const { pathname } = new URL(getRequestUrl(input));
      if (pathname.endsWith("/rpc/save_medication_schedule")) {
        return Response.json(scheduleId);
      }

      throw new Error(`Unexpected Supabase request: ${pathname}`);
    });

    const response = await POST(
      new Request("http://localhost/api/admin/care-schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "medication",
          medicationName: "Tratamiento",
          instructions: "Administrar con comida",
          startDate: "2026-01-05",
          endDate: null,
          isActive: true,
          times: [{ dayOfWeek: 1, scheduledTime: "08:30" }],
        }),
      }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ id: scheduleId });
    const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(requestBody).toMatchObject({
      p_medication_name: "Tratamiento",
      p_instructions: "Administrar con comida",
      p_times: [{ dayOfWeek: 1, scheduledTime: "08:30" }],
      p_created_by: "marcos",
    });
  });

  it("updates an existing schedule and returns not found for a missing ID", async () => {
    mockFetch
      .mockResolvedValueOnce(Response.json(scheduleId))
      .mockResolvedValueOnce(Response.json(null));

    const makeRequest = () =>
      new Request("http://localhost/api/admin/care-schedules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: scheduleId,
          kind: "feeding",
          mealName: "Desayuno",
          portion: "Una ración",
          dayOfWeek: 1,
          scheduledTime: "08:00",
          isActive: true,
        }),
      });

    const updated = await PATCH(makeRequest());
    expect(updated.status).toBe(200);
    await expect(updated.json()).resolves.toEqual({ id: scheduleId });

    const missing = await PATCH(makeRequest());
    expect(missing.status).toBe(404);
  });

  it("denies Invitado before writing a care schedule", async () => {
    mockGetCurrentProfile.mockResolvedValue(guestProfile);

    const response = await POST(
      new Request("http://localhost/api/admin/care-schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "feeding",
          mealName: "Desayuno",
          portion: null,
          dayOfWeek: 1,
          scheduledTime: "08:00",
          isActive: true,
        }),
      }),
    );

    expect(response.status).toBe(403);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("rejects duplicated medication times before calling the database", async () => {
    const response = await POST(
      new Request("http://localhost/api/admin/care-schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "medication",
          medicationName: "Tratamiento",
          instructions: "Con comida",
          startDate: "2026-01-05",
          endDate: null,
          isActive: true,
          times: [
            { dayOfWeek: 1, scheduledTime: "08:30" },
            { dayOfWeek: 1, scheduledTime: "08:30" },
          ],
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
