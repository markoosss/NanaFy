import { cookies } from "next/headers";
import {
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";
import { hashSessionToken, isSessionToken } from "@/lib/auth/tokens";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!isSessionToken(token)) {
    cookieStore.delete(SESSION_COOKIE_NAME);
    return Response.json({ success: true }, { headers: NO_STORE_HEADERS });
  }

  try {
    const { error } = await getSupabaseAdminClient()
      .from("profile_sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("token_hash", hashSessionToken(token))
      .is("revoked_at", null);

    if (error) {
      console.error("Could not revoke profile session:", error.message);
      return Response.json(
        { error: "No se pudo cerrar la sesión." },
        { status: 503, headers: NO_STORE_HEADERS },
      );
    }

    cookieStore.delete(SESSION_COOKIE_NAME);
    return Response.json({ success: true }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error(
      "Profile logout failed:",
      error instanceof Error ? error.message : "Unknown logout error",
    );
    return Response.json(
      { error: "No se pudo cerrar la sesión." },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }
}
