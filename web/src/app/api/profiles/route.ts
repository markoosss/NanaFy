import { connection } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };
const PROFILE_ORDER = ["marcos", "mama", "papa", "kiro", "invitado"];

export async function GET() {
  await connection();

  try {
    const { data, error } = await getSupabaseAdminClient()
      .from("profiles")
      .select("profile_key, display_name, activated_at");

    if (error) {
      console.error("Could not read household profiles:", error.message);
      return Response.json(
        { error: "No se pudieron cargar los perfiles." },
        { status: 503, headers: NO_STORE_HEADERS },
      );
    }

    const profiles = data
      .map((profile) => ({
        profileKey: profile.profile_key,
        displayName: profile.display_name,
        isActivated: Boolean(profile.activated_at),
      }))
      .sort((left, right) => {
        const leftIndex = PROFILE_ORDER.indexOf(left.profileKey);
        const rightIndex = PROFILE_ORDER.indexOf(right.profileKey);
        const normalizedLeft = leftIndex === -1 ? PROFILE_ORDER.length : leftIndex;
        const normalizedRight =
          rightIndex === -1 ? PROFILE_ORDER.length : rightIndex;

        return normalizedLeft - normalizedRight;
      });

    return Response.json({ profiles }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error(
      "Household profile lookup failed:",
      error instanceof Error ? error.message : "Unknown profile lookup error",
    );
    return Response.json(
      { error: "No se pudieron cargar los perfiles." },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }
}
