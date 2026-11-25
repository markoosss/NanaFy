import { describe, expect, it } from "vitest";
import { authorizeProfile, hasPermission } from "./permissions";
import type { AuthenticatedProfile } from "./session";

const adminProfile: AuthenticatedProfile = {
  profileKey: "marcos",
  displayName: "Marcos",
  role: "admin",
};
const familyProfiles: AuthenticatedProfile[] = [
  { profileKey: "mama", displayName: "Mama", role: "family" },
  { profileKey: "papa", displayName: "Papa", role: "family" },
  { profileKey: "kiro", displayName: "Kiro", role: "family" },
];
const guestProfile: AuthenticatedProfile = {
  profileKey: "invitado",
  displayName: "Invitado",
  role: "guest",
};
const profiles = [adminProfile, ...familyProfiles, guestProfile];

describe("API permissions", () => {
  it("allows care completion to all profiles and management only to family or admin", () => {
    for (const profile of profiles) {
      expect(hasPermission(profile, "care:complete")).toBe(true);
      expect(hasPermission(profile, "care:read")).toBe(true);
      expect(hasPermission(profile, "calendar:read")).toBe(true);
    }

    expect(hasPermission(adminProfile, "care-schedules:manage")).toBe(true);
    expect(hasPermission(guestProfile, "care-schedules:manage")).toBe(false);
    for (const profile of familyProfiles) {
      expect(hasPermission(profile, "care-schedules:manage")).toBe(false);
      expect(hasPermission(profile, "calendar:manage")).toBe(true);
      expect(hasPermission(profile, "notes:manage")).toBe(true);
    }

    expect(hasPermission(guestProfile, "calendar:manage")).toBe(false);
    expect(hasPermission(guestProfile, "notes:read")).toBe(false);
  });

  it("denies guests profile administration and history deletion", () => {
    expect(hasPermission(guestProfile, "profiles:manage")).toBe(false);
    expect(hasPermission(guestProfile, "activation-codes:manage")).toBe(false);
    expect(hasPermission(guestProfile, "history:delete")).toBe(false);
    expect(hasPermission(adminProfile, "history:delete")).toBe(true);
  });

  it("returns explicit unauthorized and forbidden API responses", async () => {
    const unauthenticated = authorizeProfile(null, "care:read");
    const forbidden = authorizeProfile(
      guestProfile,
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
