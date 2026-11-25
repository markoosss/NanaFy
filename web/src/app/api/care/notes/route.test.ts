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

const familyProfile: AuthenticatedProfile = {
  profileKey: "papa",
  displayName: "Papa",
  role: "family",
};
const guestProfile: AuthenticatedProfile = {
  profileKey: "invitado",
  displayName: "Invitado",
  role: "guest",
};

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

describe("shared notes API", () => {
  it("returns notes to an authorized family profile", async () => {
    mockGetCurrentProfile.mockResolvedValue(familyProfile);
    mockFetch.mockResolvedValue(
      Response.json([
        {
          id: "note-1",
          content: "Le toca revisión de uñas.",
          created_by: "papa",
          created_at: "2026-11-25T10:00:00.000Z",
        },
      ]),
    );

    const response = await GET();
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.notes[0]).toMatchObject({
      content: "Le toca revisión de uñas.",
      createdBy: "papa",
    });
  });

  it("stores a family note with the authenticated author", async () => {
    mockGetCurrentProfile.mockResolvedValue(familyProfile);
    mockFetch.mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(JSON.parse(String(init?.body))).toEqual({
        content: "Reponer arena",
        created_by: "papa",
      });

      return Response.json({ id: "note-2" }, { status: 201 });
    });

    const response = await POST(
      new Request("http://localhost/api/care/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "  Reponer arena  " }),
      }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ id: "note-2" });
  });

  it("denies guests access to shared notes", async () => {
    mockGetCurrentProfile.mockResolvedValue(guestProfile);

    const response = await GET();

    expect(response.status).toBe(403);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
