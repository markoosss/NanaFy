import { cookies } from "next/headers";
import {
  getCurrentProfile,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;

  try {
    const profile = await getCurrentProfile(token);

    if (!profile) {
      return Response.json(
        { error: "No hay una sesión activa." },
        { status: 401, headers: NO_STORE_HEADERS },
      );
    }

    return Response.json({ profile }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error(
      "Could not read current profile:",
      error instanceof Error ? error.message : "Unknown session error",
    );
    return Response.json(
      { error: "No se pudo comprobar la sesión." },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }
}
