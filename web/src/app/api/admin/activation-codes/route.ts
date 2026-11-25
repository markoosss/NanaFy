import { cookies } from "next/headers";
import { getCurrentProfile, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { createActivationCode, hashActivationCode } from "@/lib/auth/tokens";
import { authorizeProfile } from "@/lib/auth/permissions";
import { isRecord, readJsonBody } from "@/lib/http/json";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };
const ELIGIBLE_PROFILE_KEYS = new Set(["mama", "papa", "kiro", "invitado"]);
const ACTIVATION_CODE_TTL_MS = 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;

  try {
    const profile = await getCurrentProfile(token);
    const authorization = authorizeProfile(
      profile,
      "activation-codes:manage",
    );

    if (authorization instanceof Response) {
      return authorization;
    }

    let body: unknown;
    try {
      body = await readJsonBody(request);
    } catch (error) {
      console.error(
        "Could not read activation-code request:",
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
      !ELIGIBLE_PROFILE_KEYS.has(body.profileKey)
    ) {
      return Response.json(
        { error: "Selecciona un perfil familiar válido." },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    const supabase = getSupabaseAdminClient();
    const { data: targetProfile, error: profileError } = await supabase
      .from("profiles")
      .select("profile_key, activated_at")
      .eq("profile_key", body.profileKey)
      .maybeSingle();

    if (profileError) {
      console.error(
        "Could not read target profile for activation:",
        profileError.message,
      );
      return Response.json(
        { error: "No se pudo comprobar el perfil." },
        { status: 503, headers: NO_STORE_HEADERS },
      );
    }

    if (!targetProfile) {
      return Response.json(
        { error: "El perfil seleccionado no existe." },
        { status: 404, headers: NO_STORE_HEADERS },
      );
    }

    if (targetProfile.activated_at) {
      return Response.json(
        { error: "El perfil ya está activado." },
        { status: 409, headers: NO_STORE_HEADERS },
      );
    }

    const activationCode = createActivationCode();
    const expiresAt = new Date(Date.now() + ACTIVATION_CODE_TTL_MS).toISOString();
    const { data: issued, error: issueError } = await supabase.rpc(
      "issue_activation_code",
      {
        p_profile_key: targetProfile.profile_key,
        p_code_hash: hashActivationCode(activationCode),
        p_created_by: authorization.profileKey,
        p_expires_at: expiresAt,
      },
    );

    if (issueError) {
      console.error("Could not issue activation code:", issueError.message);
      return Response.json(
        { error: "No se pudo crear el código de activación." },
        { status: 503, headers: NO_STORE_HEADERS },
      );
    }

    if (issued !== true) {
      return Response.json(
        { error: "El perfil ya no puede recibir un código de activación." },
        { status: 409, headers: NO_STORE_HEADERS },
      );
    }

    return Response.json(
      {
        profileKey: targetProfile.profile_key,
        activationCode,
        expiresAt,
      },
      { status: 201, headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    console.error(
      "Activation-code issuance failed:",
      error instanceof Error ? error.message : "Unknown issuance error",
    );
    return Response.json(
      { error: "No se pudo crear el código de activación." },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }
}
