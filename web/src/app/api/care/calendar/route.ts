import { cookies } from "next/headers";
import { getCurrentProfile, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { authorizeProfile } from "@/lib/auth/permissions";
import { isValidIsoDate } from "@/lib/care/date";
import { isRecord, readJsonBody } from "@/lib/http/json";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };
const EVENT_TYPES = new Set(["veterinary", "checkup", "other"]);
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function getDefaultRange() {
  const from = new Date();
  const to = new Date(from);
  to.setUTCDate(to.getUTCDate() + 365);

  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export async function GET(request: Request) {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;

  try {
    const profile = await getCurrentProfile(token);
    const authorization = authorizeProfile(profile, "calendar:read");

    if (authorization instanceof Response) {
      return authorization;
    }

    const params = new URL(request.url).searchParams;
    const requestedFrom = params.get("from");
    const requestedTo = params.get("to");
    const range =
      requestedFrom === null && requestedTo === null
        ? getDefaultRange()
        : { from: requestedFrom ?? "", to: requestedTo ?? "" };

    if (
      !isValidIsoDate(range.from) ||
      !isValidIsoDate(range.to) ||
      range.from > range.to
    ) {
      return Response.json(
        { error: "El intervalo del calendario no es válido." },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    const { data, error } = await getSupabaseAdminClient()
      .from("calendar_events")
      .select("id, title, event_type, event_date, event_time, details, created_by")
      .gte("event_date", range.from)
      .lte("event_date", range.to)
      .order("event_date")
      .order("event_time", { nullsFirst: false });

    if (error) {
      console.error("Could not load care calendar:", error.message);
      return Response.json(
        { error: "No se pudo cargar el calendario." },
        { status: 503, headers: NO_STORE_HEADERS },
      );
    }

    return Response.json(
      {
        events: data.map((event) => ({
          id: event.id,
          title: event.title,
          eventType: event.event_type,
          eventDate: event.event_date,
          eventTime: event.event_time,
          details: event.details,
          createdBy: event.created_by,
        })),
      },
      { headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    console.error(
      "Care calendar lookup failed:",
      error instanceof Error ? error.message : "Unknown calendar lookup error",
    );
    return Response.json(
      { error: "No se pudo cargar el calendario." },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }
}

export async function POST(request: Request) {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;

  try {
    const profile = await getCurrentProfile(token);
    const authorization = authorizeProfile(profile, "calendar:manage");

    if (authorization instanceof Response) {
      return authorization;
    }

    const body = await readJsonBody(request);
    const eventTime = isRecord(body) ? body.eventTime ?? null : null;
    const details = isRecord(body) ? body.details ?? null : null;

    if (
      !isRecord(body) ||
      typeof body.title !== "string" ||
      !body.title.trim() ||
      body.title.trim().length > 120 ||
      typeof body.eventType !== "string" ||
      !EVENT_TYPES.has(body.eventType) ||
      typeof body.eventDate !== "string" ||
      !isValidIsoDate(body.eventDate) ||
      (eventTime !== null &&
        (typeof eventTime !== "string" || !TIME_PATTERN.test(eventTime))) ||
      (details !== null &&
        (typeof details !== "string" || details.trim().length > 1000))
    ) {
      return Response.json(
        { error: "Los datos de la cita no son válidos." },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    const { data, error } = await getSupabaseAdminClient()
      .from("calendar_events")
      .insert({
        title: body.title.trim(),
        event_type: body.eventType,
        event_date: body.eventDate,
        event_time: eventTime,
        details: typeof details === "string" ? details.trim() || null : null,
        created_by: authorization.profileKey,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Could not create calendar event:", error.message);
      return Response.json(
        { error: "No se pudo guardar la cita." },
        { status: 503, headers: NO_STORE_HEADERS },
      );
    }

    return Response.json(
      { id: data.id },
      { status: 201, headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    console.error(
      "Care calendar update failed:",
      error instanceof Error ? error.message : "Unknown calendar update error",
    );
    return Response.json(
      { error: "No se pudo guardar la cita." },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }
}
