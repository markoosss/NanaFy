import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({
  connection: async () => {},
}));

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
});

describe("public profile selection API", () => {
  it("returns only display fields in the established household order", async () => {
    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
      const { pathname } = new URL(getRequestUrl(input));
      if (!pathname.endsWith("/profiles")) {
        throw new Error(`Unexpected Supabase request: ${pathname}`);
      }

      return Response.json([
        {
          profile_key: "papa",
          display_name: "Papa",
          activated_at: null,
          password_hash: "sensitive-hash",
        },
        {
          profile_key: "marcos",
          display_name: "Marcos",
          activated_at: "2026-01-01T00:00:00.000Z",
          password_hash: "sensitive-hash",
        },
      ]);
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.profiles).toEqual([
      { profileKey: "marcos", displayName: "Marcos", isActivated: true },
      { profileKey: "papa", displayName: "Papa", isActivated: false },
    ]);
    expect(JSON.stringify(body)).not.toContain("sensitive-hash");
  });
});
