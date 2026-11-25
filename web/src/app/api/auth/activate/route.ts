import { hashPassword, isValidPassword } from "@/lib/auth/password";
import { hashActivationCode, isActivationCode } from "@/lib/auth/tokens";
import { isRecord, readJsonBody } from "@/lib/http/json";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };
const INVALID_ACTIVATION_MESSAGE =
  "El código no es válido o el perfil ya está activado.";
const PROFILE_KEY_PATTERN = /^[a-z0-9][a-z0-9_-]{0,49}$/;

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await readJsonBody(request);
  } catch (error) {
    console.error(
      "Could not read activation request:",
      error instanceof Error ? error.message : "Unknown request error",
    );
    return Response.json(
      { error: "No se pudo leer la solicitud." },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  if (!isRecord(body)) {
    return Response.json(
      { error: "La solicitud no tiene un formato válido." },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const { profileKey, activationCode, password } = body;

  if (
    typeof profileKey !== "string" ||
    !PROFILE_KEY_PATTERN.test(profileKey) ||
    !isActivationCode(activationCode) ||
    !isValidPassword(password)
  ) {
    return Response.json(
      {
        error:
          "Introduce un perfil, un código válido y una contraseña de al menos 10 caracteres.",
      },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("profile_key, activated_at")
      .eq("profile_key", profileKey)
      .maybeSingle();

    if (profileError) {
      console.error("Could not read profile for activation:", profileError.message);
      return Response.json(
        { error: "No se pudo comprobar el perfil." },
        { status: 503, headers: NO_STORE_HEADERS },
      );
    }

    if (!profile || profile.activated_at) {
      return Response.json(
        { error: INVALID_ACTIVATION_MESSAGE },
        { status: 409, headers: NO_STORE_HEADERS },
      );
    }

    const codeHash = hashActivationCode(activationCode);
    const { data: activation, error: activationError } = await supabase
      .from("activation_codes")
      .select("id")
      .eq("profile_key", profileKey)
      .eq("code_hash", codeHash)
      .is("used_at", null)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (activationError) {
      console.error("Could not verify activation code:", activationError.message);
      return Response.json(
        { error: "No se pudo comprobar el código." },
        { status: 503, headers: NO_STORE_HEADERS },
      );
    }

    if (!activation) {
      return Response.json(
        { error: INVALID_ACTIVATION_MESSAGE },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    const passwordHash = await hashPassword(password);
    const { data: activated, error: activationResultError } =
      await supabase.rpc("activate_profile", {
        p_profile_key: profileKey,
        p_code_hash: codeHash,
        p_password_hash: passwordHash,
      });

    if (activationResultError) {
      if (activationResultError.message.includes("Profile is already activated")) {
        return Response.json(
          { error: INVALID_ACTIVATION_MESSAGE },
          { status: 409, headers: NO_STORE_HEADERS },
        );
      }

      console.error(
        "Could not activate profile:",
        activationResultError.message,
      );
      return Response.json(
        { error: "No se pudo activar el perfil." },
        { status: 503, headers: NO_STORE_HEADERS },
      );
    }

    if (activated !== true) {
      return Response.json(
        { error: INVALID_ACTIVATION_MESSAGE },
        { status: 409, headers: NO_STORE_HEADERS },
      );
    }

    return Response.json(
      { message: "Perfil activado. Ya puedes iniciar sesión." },
      { status: 201, headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    console.error(
      "Profile activation failed:",
      error instanceof Error ? error.message : "Unknown activation error",
    );
    return Response.json(
      { error: "No se pudo completar la activación." },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }
}
