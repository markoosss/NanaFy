import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./login/route";
import { hashPassword } from "@/lib/auth/password";

const { mockCookieSet, mockFetch } = vi.hoisted(() => ({
  mockCookieSet: vi.fn(),
  mockFetch: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ set: mockCookieSet }),
}));

const password = "Family-care-2026";

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
  mockCookieSet.mockClear();
  mockFetch.mockReset();
});

describe("profile login API", () => {
  it("authenticates the stored password and creates a session cookie", async () => {
    const passwordHash = await hashPassword(password);
    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
      const requestUrl =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      const { pathname } = new URL(requestUrl);

      if (pathname.endsWith("/profiles")) {
        return Response.json({
          profile_key: "marcos",
          display_name: "Marcos",
          role: "admin",
          password_hash: passwordHash,
          activated_at: new Date().toISOString(),
        });
      }

      if (pathname.endsWith("/profile_sessions")) {
        return new Response(null, { status: 201 });
      }

      throw new Error(`Unexpected Supabase request: ${pathname}`);
    });

    const response = await POST(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileKey: "marcos", password }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      profile: { profileKey: "marcos", displayName: "Marcos", role: "admin" },
    });
    expect(mockCookieSet).toHaveBeenCalledWith(
      "nanafy_session",
      expect.stringMatching(/^[A-Za-z0-9_-]{43}$/),
      expect.objectContaining({ httpOnly: true, sameSite: "lax" }),
    );
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("rejects an incorrect password without creating a session", async () => {
    const passwordHash = await hashPassword(password);
    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
      const requestUrl =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      if (new URL(requestUrl).pathname.endsWith("/profiles")) {
        return Response.json({
          profile_key: "marcos",
          display_name: "Marcos",
          role: "admin",
          password_hash: passwordHash,
          activated_at: new Date().toISOString(),
        });
      }

      throw new Error("An invalid password must not create a session.");
    });

    const response = await POST(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileKey: "marcos",
          password: "incorrect-password",
        }),
      }),
    );

    expect(response.status).toBe(401);
    expect(mockCookieSet).not.toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
