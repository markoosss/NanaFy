import type { AuthenticatedProfile, ProfileRole } from "@/lib/auth/session";

export type ApiPermission =
  | "care:read"
  | "care:complete"
  | "care-schedules:manage"
  | "profiles:manage"
  | "activation-codes:manage"
  | "calendar:read"
  | "calendar:manage"
  | "notes:read"
  | "notes:manage"
  | "history:delete";

const PERMISSIONS_BY_ROLE: Record<ProfileRole, ReadonlySet<ApiPermission>> = {
  admin: new Set([
    "care:read",
    "care:complete",
    "care-schedules:manage",
    "profiles:manage",
    "activation-codes:manage",
    "calendar:read",
    "calendar:manage",
    "notes:read",
    "notes:manage",
    "history:delete",
  ]),
  family: new Set([
    "care:read",
    "care:complete",
    "calendar:read",
    "calendar:manage",
    "notes:read",
    "notes:manage",
  ]),
  guest: new Set(["care:read", "care:complete", "calendar:read"]),
};

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export function hasPermission(
  profile: Pick<AuthenticatedProfile, "role"> | null,
  permission: ApiPermission,
): boolean {
  return profile
    ? PERMISSIONS_BY_ROLE[profile.role].has(permission)
    : false;
}

export function authorizeProfile(
  profile: AuthenticatedProfile | null,
  permission: ApiPermission,
): AuthenticatedProfile | Response {
  if (!profile) {
    return Response.json(
      { error: "Inicia sesión para continuar." },
      { status: 401, headers: NO_STORE_HEADERS },
    );
  }

  if (!hasPermission(profile, permission)) {
    return Response.json(
      { error: "No tienes permiso para realizar esta acción." },
      { status: 403, headers: NO_STORE_HEADERS },
    );
  }

  return profile;
}
