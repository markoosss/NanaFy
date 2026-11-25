import { cookies } from "next/headers";
import { getCurrentProfile, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { authorizeProfile } from "@/lib/auth/permissions";
import {
  parseCareScheduleInput,
  type CareScheduleInput,
} from "@/lib/care/schedule-input";
import { readJsonBody } from "@/lib/http/json";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;

  try {
    const profile = await getCurrentProfile(token);
    const authorization = authorizeProfile(profile, "care-schedules:manage");

    if (authorization instanceof Response) {
      return authorization;
    }

    const supabase = getSupabaseAdminClient();
    const [
      { data: feedings, error: feedingError },
      { data: medications, error: medicationError },
      { data: tasks, error: taskError },
      { data: medicationTimes, error: timesError },
    ] = await Promise.all([
      supabase
        .from("feeding_schedules")
        .select("id, meal_name, portion, day_of_week, scheduled_time, is_active")
        .order("day_of_week")
        .order("scheduled_time"),
      supabase
        .from("medication_schedules")
        .select(
          "id, medication_name, instructions, start_date, end_date, is_active",
        )
        .order("start_date"),
      supabase
        .from("care_tasks")
        .select("id, task_name, instructions, day_of_week, scheduled_time, is_active")
        .order("day_of_week")
        .order("scheduled_time", { nullsFirst: false }),
      supabase
        .from("medication_schedule_times")
        .select("medication_schedule_id, day_of_week, scheduled_time")
        .order("day_of_week")
        .order("scheduled_time"),
    ]);

    const queryError =
      feedingError ?? medicationError ?? taskError ?? timesError;
    if (queryError) {
      console.error("Could not load schedules for administration:", queryError.message);
      return Response.json(
        { error: "No se pudieron cargar los horarios." },
        { status: 503, headers: NO_STORE_HEADERS },
      );
    }

    return Response.json(
      {
        schedules: [
          ...(feedings ?? []).map((feeding) => ({
            kind: "feeding" as const,
            id: feeding.id,
            mealName: feeding.meal_name,
            portion: feeding.portion,
            dayOfWeek: feeding.day_of_week,
            scheduledTime: feeding.scheduled_time,
            isActive: feeding.is_active,
          })),
          ...(medications ?? []).map((medication) => ({
            kind: "medication" as const,
            id: medication.id,
            medicationName: medication.medication_name,
            instructions: medication.instructions,
            startDate: medication.start_date,
            endDate: medication.end_date,
            isActive: medication.is_active,
            times: (medicationTimes ?? [])
              .filter(
                (time) => time.medication_schedule_id === medication.id,
              )
              .map((time) => ({
                dayOfWeek: time.day_of_week,
                scheduledTime: time.scheduled_time,
              })),
          })),
          ...(tasks ?? []).map((task) => ({
            kind: "task" as const,
            id: task.id,
            taskName: task.task_name,
            instructions: task.instructions,
            dayOfWeek: task.day_of_week,
            scheduledTime: task.scheduled_time,
            isActive: task.is_active,
          })),
        ],
      },
      { headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    console.error(
      "Care schedule administration lookup failed:",
      error instanceof Error ? error.message : "Unknown schedule lookup error",
    );
    return Response.json(
      { error: "No se pudieron cargar los horarios." },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }
}

async function saveSchedule(request: Request, isUpdate: boolean) {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;

  try {
    const profile = await getCurrentProfile(token);
    const authorization = authorizeProfile(profile, "care-schedules:manage");

    if (authorization instanceof Response) {
      return authorization;
    }

    const body = await readJsonBody(request);
    const schedule = parseCareScheduleInput(body);

    if (!schedule || (isUpdate ? !schedule.id : Boolean(schedule.id))) {
      return Response.json(
        { error: "Los datos del horario no son válidos." },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    const result = await persistSchedule(schedule, authorization.profileKey);

    if (result.error) {
      console.error("Could not save care schedule:", result.error);
      return Response.json(
        { error: "No se pudo guardar el horario." },
        { status: 503, headers: NO_STORE_HEADERS },
      );
    }

    if (!result.id) {
      return Response.json(
        {
          error: isUpdate
            ? "No se encontró el horario que intentas actualizar."
            : "El horario no pudo guardarse.",
        },
        { status: isUpdate ? 404 : 409, headers: NO_STORE_HEADERS },
      );
    }

    return Response.json(
      { id: result.id },
      { status: isUpdate ? 200 : 201, headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    console.error(
      "Care schedule update failed:",
      error instanceof Error ? error.message : "Unknown schedule update error",
    );
    return Response.json(
      { error: "No se pudo guardar el horario." },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }
}

async function persistSchedule(
  schedule: CareScheduleInput,
  profileKey: string,
): Promise<{ id: string | null; error: string | null }> {
  const supabase = getSupabaseAdminClient();

  switch (schedule.kind) {
    case "feeding": {
      const { data, error } = await supabase.rpc("save_feeding_schedule", {
        p_id: schedule.id ?? null,
        p_meal_name: schedule.mealName,
        p_portion: schedule.portion,
        p_day_of_week: schedule.dayOfWeek,
        p_scheduled_time: schedule.scheduledTime,
        p_is_active: schedule.isActive,
        p_created_by: profileKey,
      });

      return { id: data, error: error?.message ?? null };
    }
    case "task": {
      const { data, error } = await supabase.rpc("save_care_task", {
        p_id: schedule.id ?? null,
        p_task_name: schedule.taskName,
        p_instructions: schedule.instructions,
        p_day_of_week: schedule.dayOfWeek,
        p_scheduled_time: schedule.scheduledTime,
        p_is_active: schedule.isActive,
        p_created_by: profileKey,
      });

      return { id: data, error: error?.message ?? null };
    }
    case "medication": {
      const { data, error } = await supabase.rpc(
        "save_medication_schedule",
        {
          p_id: schedule.id ?? null,
          p_medication_name: schedule.medicationName,
          p_instructions: schedule.instructions,
          p_start_date: schedule.startDate,
          p_end_date: schedule.endDate,
          p_is_active: schedule.isActive,
          p_times: schedule.times,
          p_created_by: profileKey,
        },
      );

      return { id: data, error: error?.message ?? null };
    }
  }
}

export async function POST(request: Request) {
  return saveSchedule(request, false);
}

export async function PATCH(request: Request) {
  return saveSchedule(request, true);
}
