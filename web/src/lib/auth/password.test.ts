import { describe, expect, it } from "vitest";
import {
  hashPassword,
  isValidPassword,
  verifyPassword,
} from "./password";

describe("password hashing", () => {
  it("stores a salted scrypt hash and verifies the original password", async () => {
    const password = "Family-care-2026";
    const hash = await hashPassword(password);

    expect(hash).toMatch(/^scrypt\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+$/);
    expect(hash).not.toContain(password);
    await expect(verifyPassword(password, hash)).resolves.toBe(true);
    await expect(verifyPassword("different-password", hash)).resolves.toBe(
      false,
    );
  });

  it("rejects weak, oversized, and malformed credentials", async () => {
    expect(isValidPassword("short")).toBe(false);
    expect(isValidPassword("a".repeat(1025))).toBe(false);
    await expect(verifyPassword("valid-password", "not-a-hash")).resolves.toBe(
      false,
    );
  });
});
