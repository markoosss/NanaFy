import { cookies } from "next/headers";
import { getCurrentProfile, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { authorizeProfile } from "@/lib/auth/permissions";
import { isRecord, readJsonBody } from "@/lib/http/json";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };
const MAX_NOTE_LENGTH = 2000;

export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;

  try {
    const profile = await getCurrentProfile(token);
    const authorization = authorizeProfile(profile, "notes:read");

    if (authorization instanceof Response) {
      return authorization;
    }

    const { data, error } = await getSupabaseAdminClient()
      .from("notes")
      .select("id, content, created_by, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Could not load shared notes:", error.message);
      return Response.json(
        { error: "No se pudieron cargar las notas." },
        { status: 503, headers: NO_STORE_HEADERS },
      );
    }

    return Response.json(
      {
        notes: data.map((note) => ({
          id: note.id,
          content: note.content,
          createdBy: note.created_by,
          createdAt: note.created_at,
        })),
      },
      { headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    console.error(
      "Shared notes lookup failed:",
      error instanceof Error ? error.message : "Unknown notes lookup error",
    );
    return Response.json(
      { error: "No se pudieron cargar las notas." },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }
}

export async function POST(request: Request) {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;

  try {
    const profile = await getCurrentProfile(token);
    const authorization = authorizeProfile(profile, "notes:manage");

    if (authorization instanceof Response) {
      return authorization;
    }

    const body = await readJsonBody(request);
    if (
      !isRecord(body) ||
      typeof body.content !== "string" ||
      !body.content.trim() ||
      body.content.trim().length > MAX_NOTE_LENGTH
    ) {
      return Response.json(
        { error: `La nota debe tener entre 1 y ${MAX_NOTE_LENGTH} caracteres.` },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    const { data, error } = await getSupabaseAdminClient()
      .from("notes")
      .insert({
        content: body.content.trim(),
        created_by: authorization.profileKey,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Could not create shared note:", error.message);
      return Response.json(
        { error: "No se pudo guardar la nota." },
        { status: 503, headers: NO_STORE_HEADERS },
      );
    }

    return Response.json(
      { id: data.id },
      { status: 201, headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    console.error(
      "Shared note update failed:",
      error instanceof Error ? error.message : "Unknown notes update error",
    );
    return Response.json(
      { error: "No se pudo guardar la nota." },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }
}
