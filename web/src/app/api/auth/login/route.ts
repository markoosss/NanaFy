import { cookies } from "next/headers";
import { isValidPassword, verifyPassword } from "@/lib/auth/password";
import {
  createSessionToken,
  hashSessionToken,
} from "@/lib/auth/tokens";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth/session";
import { isRecord, readJsonBody } from "@/lib/http/json";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };
const PROFILE_KEY_PATTERN = /^[a-z0-9][a-z0-9_-]{0,49}$/;
const INVALID_CREDENTIALS_MESSAGE = "Perfil o contraseña incorrectos.";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await readJsonBody(request);
  } catch (error) {
    console.error(
      "Could not read login request:",
      error instanceof Error ? error.message : "Unknown request error",
    );
    return Response.json(
      { error: "No se pudo leer la solicitud." },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  if (
    !isRecord(body) ||
    typeof body.profileKey !== "string" ||
    !PROFILE_KEY_PATTERN.test(body.profileKey) ||
    !isValidPassword(body.password)
  ) {
    return Response.json(
      { error: INVALID_CREDENTIALS_MESSAGE },
      { status: 401, headers: NO_STORE_HEADERS },
    );
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("profile_key, display_name, role, password_hash, activated_at")
      .eq("profile_key", body.profileKey)
      .maybeSingle();

    if (profileError) {
      console.error("Could not read profile for login:", profileError.message);
      return Response.json(
        { error: "No se pudo iniciar sesión." },
        { status: 503, headers: NO_STORE_HEADERS },
      );
    }

    if (
      !profile ||
      !profile.activated_at ||
      typeof profile.password_hash !== "string" ||
      !(await verifyPassword(body.password, profile.password_hash))
    ) {
      return Response.json(
        { error: INVALID_CREDENTIALS_MESSAGE },
        { status: 401, headers: NO_STORE_HEADERS },
      );
    }

    const sessionToken = createSessionToken();
    const expiresAt = new Date(
      Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
    ).toISOString();
    const { error: sessionError } = await supabase
      .from("profile_sessions")
      .insert({
        profile_key: profile.profile_key,
        token_hash: hashSessionToken(sessionToken),
        expires_at: expiresAt,
      });

    if (sessionError) {
      console.error("Could not create profile session:", sessionError.message);
      return Response.json(
        { error: "No se pudo iniciar sesión." },
        { status: 503, headers: NO_STORE_HEADERS },
      );
    }

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return Response.json(
      {
        profile: {
          profileKey: profile.profile_key,
          displayName: profile.display_name,
          role: profile.role,
        },
      },
      { headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    console.error(
      "Profile login failed:",
      error instanceof Error ? error.message : "Unknown login error",
    );
    return Response.json(
      { error: "No se pudo iniciar sesión." },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }
}
