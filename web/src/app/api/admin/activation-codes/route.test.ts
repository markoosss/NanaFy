import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { hashActivationCode } from "@/lib/auth/tokens";
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

describe("activation-code administration API", () => {
  it("allows Marcos to issue a code without storing its raw value", async () => {
    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
      const { pathname } = new URL(getRequestUrl(input));

      if (pathname.endsWith("/profiles")) {
        return Response.json({ profile_key: "mama", activated_at: null });
      }

      if (pathname.endsWith("/rpc/issue_activation_code")) {
        return Response.json(true);
      }

      throw new Error(`Unexpected Supabase request: ${pathname}`);
    });

    const response = await POST(
      new Request("http://localhost/api/admin/activation-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileKey: "mama" }),
      }),
    );
    const result = await response.json();

    expect(response.status).toBe(201);
    expect(result.profileKey).toBe("mama");
    expect(result.activationCode).toMatch(/^[A-Za-z0-9_-]{32}$/);

    const rpcRequest = mockFetch.mock.calls
      .map(([input, init]) => ({
        path: new URL(getRequestUrl(input)).pathname,
        body: typeof init?.body === "string" ? JSON.parse(init.body) : null,
      }))
      .find(({ path }) => path.endsWith("/rpc/issue_activation_code"));

    expect(rpcRequest?.body).toMatchObject({
      p_profile_key: "mama",
      p_code_hash: hashActivationCode(result.activationCode),
      p_created_by: "marcos",
    });
    expect(JSON.stringify(rpcRequest?.body)).not.toContain(result.activationCode);
  });

  it("denies Invitado before looking up or changing profiles", async () => {
    mockGetCurrentProfile.mockResolvedValue(guestProfile);

    const response = await POST(
      new Request("http://localhost/api/admin/activation-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileKey: "mama" }),
      }),
    );

    expect(response.status).toBe(403);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
