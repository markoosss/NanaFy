import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";
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
const familyProfile: AuthenticatedProfile = {
  profileKey: "mama",
  displayName: "Mama",
  role: "family",
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
});

describe("care calendar API", () => {
  it("allows guests to review shared events in the requested date range", async () => {
    mockGetCurrentProfile.mockResolvedValue(guestProfile);
    mockFetch.mockResolvedValue(
      Response.json([
        {
          id: "event-1",
          title: "Revisión veterinaria",
          event_type: "veterinary",
          event_date: "2026-12-10",
          event_time: "10:30:00",
          details: "Revisión anual",
          created_by: "mama",
        },
      ]),
    );

    const response = await GET(
      new Request(
        "http://localhost/api/care/calendar?from=2026-12-01&to=2026-12-31",
      ),
    );
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.events[0]).toMatchObject({
      title: "Revisión veterinaria",
      eventType: "veterinary",
      eventDate: "2026-12-10",
      createdBy: "mama",
    });
  });

  it("lets a family member create a shared event as their own profile", async () => {
    mockGetCurrentProfile.mockResolvedValue(familyProfile);
    mockFetch.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(new URL(getRequestUrl(input)).pathname).toContain("/calendar_events");
      expect(init?.method).toBe("POST");
      expect(JSON.parse(String(init?.body))).toMatchObject({
        title: "Vacuna",
        event_type: "veterinary",
        created_by: "mama",
      });

      return Response.json({ id: "new-event" }, { status: 201 });
    });

    const response = await POST(
      new Request("http://localhost/api/care/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Vacuna",
          eventType: "veterinary",
          eventDate: "2026-12-10",
          eventTime: null,
          details: null,
        }),
      }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ id: "new-event" });
  });

  it("does not allow guests to create calendar events", async () => {
    mockGetCurrentProfile.mockResolvedValue(guestProfile);

    const response = await POST(
      new Request("http://localhost/api/care/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Vacuna",
          eventType: "veterinary",
          eventDate: "2026-12-10",
        }),
      }),
    );

    expect(response.status).toBe(403);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
