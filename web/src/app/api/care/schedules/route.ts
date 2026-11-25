import { cookies } from "next/headers";
import { getCurrentProfile, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { authorizeProfile } from "@/lib/auth/permissions";
import { getIsoDayOfWeek, isValidIsoDate } from "@/lib/care/date";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;

  try {
    const profile = await getCurrentProfile(token);
    const authorization = authorizeProfile(profile, "care:read");

    if (authorization instanceof Response) {
      return authorization;
    }

    const requestedDate = new URL(request.url).searchParams.get("date");
    const date = requestedDate ?? new Date().toISOString().slice(0, 10);

    if (!isValidIsoDate(date)) {
      return Response.json(
        { error: "La fecha indicada no es válida." },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    const dayOfWeek = getIsoDayOfWeek(date);
    const supabase = getSupabaseAdminClient();
    const [feedingsResult, medicationsResult, tasksResult, completionsResult] =
      await Promise.all([
        supabase
          .from("feeding_schedules")
          .select(
            "id, meal_name, portion, day_of_week, scheduled_time, is_active",
          )
          .eq("is_active", true)
          .eq("day_of_week", dayOfWeek)
          .order("scheduled_time"),
        supabase
          .from("medication_schedules")
          .select(
            "id, medication_name, instructions, start_date, end_date, is_active",
          )
          .eq("is_active", true)
          .lte("start_date", date),
        supabase
          .from("care_tasks")
          .select(
            "id, task_name, instructions, day_of_week, scheduled_time, is_active",
          )
          .eq("is_active", true)
          .eq("day_of_week", dayOfWeek)
          .order("scheduled_time", { nullsFirst: false }),
        supabase
          .from("care_completions")
          .select(
            "feeding_schedule_id, medication_schedule_id, care_task_id, completed_by, completed_at, observation",
          )
          .eq("activity_date", date),
      ]);

    const queryError =
      feedingsResult.error ??
      medicationsResult.error ??
      tasksResult.error ??
      completionsResult.error;

    if (queryError) {
      console.error("Could not load daily care schedules:", queryError.message);
      return Response.json(
        { error: "No se pudo cargar el plan de cuidados." },
        { status: 503, headers: NO_STORE_HEADERS },
      );
    }

    const medications = (medicationsResult.data ?? []).filter(
      (medication) => medication.end_date === null || medication.end_date >= date,
    );
    let medicationTimes: {
      medication_schedule_id: string;
      day_of_week: number;
      scheduled_time: string;
    }[] = [];

    if (medications.length > 0) {
      const { data, error } = await supabase
        .from("medication_schedule_times")
        .select("medication_schedule_id, day_of_week, scheduled_time")
        .in(
          "medication_schedule_id",
          medications.map((medication) => medication.id),
        )
        .eq("day_of_week", dayOfWeek)
        .order("scheduled_time");

      if (error) {
        console.error("Could not load medication times:", error.message);
        return Response.json(
          { error: "No se pudieron cargar las horas de medicación." },
          { status: 503, headers: NO_STORE_HEADERS },
        );
      }

      medicationTimes = data ?? [];
    }

    const completionBySchedule = new Map<
      string,
      { completedBy: string; completedAt: string; observation: string | null }
    >();

    for (const completion of completionsResult.data ?? []) {
      if (completion.feeding_schedule_id) {
        completionBySchedule.set(`feeding:${completion.feeding_schedule_id}`, {
          completedBy: completion.completed_by,
          completedAt: completion.completed_at,
          observation: completion.observation,
        });
      }

      if (completion.medication_schedule_id) {
        completionBySchedule.set(
          `medication:${completion.medication_schedule_id}`,
          {
            completedBy: completion.completed_by,
            completedAt: completion.completed_at,
            observation: completion.observation,
          },
        );
      }

      if (completion.care_task_id) {
        completionBySchedule.set(`task:${completion.care_task_id}`, {
          completedBy: completion.completed_by,
          completedAt: completion.completed_at,
          observation: completion.observation,
        });
      }
    }

    const getCompletion = (kind: string, scheduleId: string) =>
      completionBySchedule.get(`${kind}:${scheduleId}`) ?? null;

    return Response.json(
      {
        date,
        dayOfWeek,
        feedings: (feedingsResult.data ?? []).map((feeding) => {
          const completion = getCompletion("feeding", feeding.id);

          return {
            id: feeding.id,
            mealName: feeding.meal_name,
            portion: feeding.portion,
            dayOfWeek: feeding.day_of_week,
            scheduledTime: feeding.scheduled_time,
            isCompleted: completion !== null,
            completedBy: completion?.completedBy ?? null,
            completedAt: completion?.completedAt ?? null,
            completedObservation: completion?.observation ?? null,
          };
        }),
        medications: medications.map((medication) => {
          const completion = getCompletion("medication", medication.id);

          return {
            id: medication.id,
            medicationName: medication.medication_name,
            instructions: medication.instructions,
            startDate: medication.start_date,
            endDate: medication.end_date,
            times: medicationTimes
              .filter((time) => time.medication_schedule_id === medication.id)
              .map((time) => time.scheduled_time),
            isCompleted: completion !== null,
            completedBy: completion?.completedBy ?? null,
            completedAt: completion?.completedAt ?? null,
            completedObservation: completion?.observation ?? null,
          };
        }),
        tasks: (tasksResult.data ?? []).map((task) => {
          const completion = getCompletion("task", task.id);

          return {
            id: task.id,
            taskName: task.task_name,
            instructions: task.instructions,
            dayOfWeek: task.day_of_week,
            scheduledTime: task.scheduled_time,
            isCompleted: completion !== null,
            completedBy: completion?.completedBy ?? null,
            completedAt: completion?.completedAt ?? null,
            completedObservation: completion?.observation ?? null,
          };
        }),
      },
      { headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    console.error(
      "Daily care lookup failed:",
      error instanceof Error ? error.message : "Unknown schedule lookup error",
    );
    return Response.json(
      { error: "No se pudo cargar el plan de cuidados." },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }
}
