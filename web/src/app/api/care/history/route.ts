import { cookies } from "next/headers";
import { getCurrentProfile, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { authorizeProfile } from "@/lib/auth/permissions";
import { isValidIsoDate } from "@/lib/care/date";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

function getDefaultRange() {
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - 29);

  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export async function GET(request: Request) {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;

  try {
    const profile = await getCurrentProfile(token);
    const authorization = authorizeProfile(profile, "care:read");

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
        { error: "El intervalo del historial no es válido." },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    const supabase = getSupabaseAdminClient();
    const { data: completions, error: completionError } = await supabase
      .from("care_completions")
      .select(
        "id, activity_date, feeding_schedule_id, medication_schedule_id, care_task_id, completed_by, completed_at, observation",
      )
      .gte("activity_date", range.from)
      .lte("activity_date", range.to)
      .order("completed_at", { ascending: false })
      .limit(100);

    if (completionError) {
      console.error("Could not load care history:", completionError.message);
      return Response.json(
        { error: "No se pudo cargar el historial." },
        { status: 503, headers: NO_STORE_HEADERS },
      );
    }

    const [
      { data: feedings, error: feedingError },
      { data: medications, error: medicationError },
      { data: tasks, error: taskError },
      { data: profiles, error: profileError },
    ] = await Promise.all([
      supabase.from("feeding_schedules").select("id, meal_name, scheduled_time"),
      supabase
        .from("medication_schedules")
        .select("id, medication_name"),
      supabase.from("care_tasks").select("id, task_name, scheduled_time"),
      supabase.from("profiles").select("profile_key, display_name"),
    ]);

    const lookupError =
      feedingError ?? medicationError ?? taskError ?? profileError;
    if (lookupError) {
      console.error("Could not resolve care history labels:", lookupError.message);
      return Response.json(
        { error: "No se pudo cargar el detalle del historial." },
        { status: 503, headers: NO_STORE_HEADERS },
      );
    }

    const feedingItems = feedings ?? [];
    const medicationItems = medications ?? [];
    const taskItems = tasks ?? [];
    const profileItems = profiles ?? [];
    const feedingById = new Map(
      feedingItems.map((item) => [item.id, item]),
    );
    const medicationById = new Map(
      medicationItems.map((item) => [item.id, item]),
    );
    const taskById = new Map(taskItems.map((item) => [item.id, item]));
    const profileByKey = new Map(
      profileItems.map((item) => [item.profile_key, item.display_name]),
    );

    return Response.json(
      {
        entries: completions.map((completion) => {
          const feeding = completion.feeding_schedule_id
            ? feedingById.get(completion.feeding_schedule_id)
            : undefined;
          const medication = completion.medication_schedule_id
            ? medicationById.get(completion.medication_schedule_id)
            : undefined;
          const task = completion.care_task_id
            ? taskById.get(completion.care_task_id)
            : undefined;

          return {
            id: completion.id,
            activityDate: completion.activity_date,
            activityType: feeding
              ? "feeding"
              : medication
                ? "medication"
                : "task",
            label:
              feeding?.meal_name ??
              medication?.medication_name ??
              task?.task_name ??
              "Actividad archivada",
            scheduledTime: feeding?.scheduled_time ?? task?.scheduled_time ?? null,
            completedBy: completion.completed_by,
            completedByName:
              profileByKey.get(completion.completed_by) ?? completion.completed_by,
            completedAt: completion.completed_at,
            observation: completion.observation,
          };
        }),
      },
      { headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    console.error(
      "Care history lookup failed:",
      error instanceof Error ? error.message : "Unknown history lookup error",
    );
    return Response.json(
      { error: "No se pudo cargar el historial." },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }
}
