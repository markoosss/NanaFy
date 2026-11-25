import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./activate/route";
import { hashActivationCode, createActivationCode } from "@/lib/auth/tokens";

const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
}));

vi.mock("server-only", () => ({}));

const password = "Family-care-2026";

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

describe("profile activation API", () => {
  it("activates an unclaimed profile with a valid one-time code", async () => {
    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
      const { pathname } = new URL(getRequestUrl(input));

      if (pathname.endsWith("/profiles")) {
        return Response.json({ profile_key: "mama", activated_at: null });
      }

      if (pathname.endsWith("/activation_codes")) {
        return Response.json({ id: "activation-code-id" });
      }

      if (pathname.endsWith("/rpc/activate_profile")) {
        return Response.json(true);
      }

      throw new Error(`Unexpected Supabase request: ${pathname}`);
    });

    const activationCode = createActivationCode();
    const response = await POST(
      new Request("http://localhost/api/auth/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileKey: "mama",
          activationCode,
          password,
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(mockFetch).toHaveBeenCalledTimes(3);
    const rpcRequest = mockFetch.mock.calls
      .map(([input, init]) => ({
        path: new URL(getRequestUrl(input)).pathname,
        body: typeof init?.body === "string" ? JSON.parse(init.body) : null,
      }))
      .find(({ path }) => path.endsWith("/rpc/activate_profile"));

    expect(rpcRequest?.body).toMatchObject({
      p_profile_key: "mama",
      p_code_hash: hashActivationCode(activationCode),
    });
    expect(JSON.stringify(rpcRequest?.body)).not.toContain(activationCode);
    expect(JSON.stringify(rpcRequest?.body)).not.toContain(password);
  });

  it("rejects a code rejected by the atomic activation function", async () => {
    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
      const { pathname } = new URL(getRequestUrl(input));

      if (pathname.endsWith("/profiles")) {
        return Response.json({ profile_key: "mama", activated_at: null });
      }

      if (pathname.endsWith("/activation_codes")) {
        return Response.json({ id: "activation-code-id" });
      }

      if (pathname.endsWith("/rpc/activate_profile")) {
        return Response.json(false);
      }

      throw new Error(`Unexpected Supabase request: ${pathname}`);
    });

    const response = await POST(
      new Request("http://localhost/api/auth/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileKey: "mama",
          activationCode: createActivationCode(),
          password,
        }),
      }),
    );

    expect(response.status).toBe(409);
  });
});
