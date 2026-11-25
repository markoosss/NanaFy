import { describe, expect, it } from "vitest";
import { authorizeProfile, hasPermission } from "./permissions";
import type { AuthenticatedProfile } from "./session";

const profiles: Record<"admin" | "family" | "guest", AuthenticatedProfile> = {
  admin: { profileKey: "marcos", displayName: "Marcos", role: "admin" },
  family: { profileKey: "mama", displayName: "Mama", role: "family" },
  guest: { profileKey: "invitado", displayName: "Invitado", role: "guest" },
};

describe("API permissions", () => {
  it("allows care completion to all profiles and management only to family or admin", () => {
    for (const profile of Object.values(profiles)) {
      expect(hasPermission(profile, "care:complete")).toBe(true);
      expect(hasPermission(profile, "care:read")).toBe(true);
      expect(hasPermission(profile, "calendar:read")).toBe(true);
    }

    expect(hasPermission(profiles.admin, "care-schedules:manage")).toBe(true);
    expect(hasPermission(profiles.family, "care-schedules:manage")).toBe(false);
    expect(hasPermission(profiles.guest, "care-schedules:manage")).toBe(false);
    expect(hasPermission(profiles.family, "calendar:manage")).toBe(true);
    expect(hasPermission(profiles.guest, "calendar:manage")).toBe(false);
  });

  it("denies guests profile administration and history deletion", () => {
    expect(hasPermission(profiles.guest, "profiles:manage")).toBe(false);
    expect(hasPermission(profiles.guest, "activation-codes:manage")).toBe(false);
    expect(hasPermission(profiles.guest, "history:delete")).toBe(false);
    expect(hasPermission(profiles.admin, "history:delete")).toBe(true);
  });

  it("returns explicit unauthorized and forbidden API responses", async () => {
    const unauthenticated = authorizeProfile(null, "care:read");
    const forbidden = authorizeProfile(
      profiles.guest,
      "care-schedules:manage",
    );

    expect(unauthenticated).toBeInstanceOf(Response);
    expect(forbidden).toBeInstanceOf(Response);

    if (unauthenticated instanceof Response && forbidden instanceof Response) {
      expect(unauthenticated.status).toBe(401);
      expect(forbidden.status).toBe(403);
      await expect(forbidden.json()).resolves.toEqual({
        error: "No tienes permiso para realizar esta acción.",
      });
    }
  });
});
