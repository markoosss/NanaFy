import { describe, expect, it } from "vitest";
import {
  createActivationCode,
  createSessionToken,
  hashActivationCode,
  hashSessionToken,
  isActivationCode,
  isSessionToken,
} from "./tokens";

describe("opaque authentication tokens", () => {
  it("creates single-use activation codes and stores only their digest", () => {
    const code = createActivationCode();

    expect(isActivationCode(code)).toBe(true);
    expect(hashActivationCode(code)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashActivationCode(code)).not.toBe(code);
  });

  it("creates session tokens with a separate stored digest", () => {
    const token = createSessionToken();

    expect(isSessionToken(token)).toBe(true);
    expect(hashSessionToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashSessionToken(token)).not.toBe(token);
  });
});
