import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { hashSessionToken, isSessionToken } from "@/lib/auth/tokens";

export const SESSION_COOKIE_NAME = "nanafy_session";
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export type ProfileRole = "admin" | "family" | "guest";

export type AuthenticatedProfile = {
  profileKey: string;
  displayName: string;
  role: ProfileRole;
};

function isProfileRole(value: string): value is ProfileRole {
  return value === "admin" || value === "family" || value === "guest";
}

export async function getCurrentProfile(
  token: string | undefined,
): Promise<AuthenticatedProfile | null> {
  if (!isSessionToken(token)) {
    return null;
  }

  const supabase = getSupabaseAdminClient();
  const { data: session, error: sessionError } = await supabase
    .from("profile_sessions")
    .select("profile_key")
    .eq("token_hash", hashSessionToken(token))
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (sessionError) {
    throw new Error(`Could not verify profile session: ${sessionError.message}`);
  }

  if (!session) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("profile_key, display_name, role, activated_at")
    .eq("profile_key", session.profile_key)
    .maybeSingle();

  if (profileError) {
    throw new Error(`Could not read profile: ${profileError.message}`);
  }

  if (!profile || !profile.activated_at) {
    return null;
  }

  if (!isProfileRole(profile.role)) {
    throw new Error("Profile has an unsupported role.");
  }

  return {
    profileKey: profile.profile_key,
    displayName: profile.display_name,
    role: profile.role,
  };
}
