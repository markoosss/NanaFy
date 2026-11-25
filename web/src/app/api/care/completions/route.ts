import { cookies } from "next/headers";
import { getCurrentProfile, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { authorizeProfile } from "@/lib/auth/permissions";
import {
  getIsoDayOfWeek,
  isUuid,
  isValidIsoDate,
} from "@/lib/care/date";
import { isRecord, readJsonBody } from "@/lib/http/json";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };
type ActivityType = "feeding" | "medication" | "task";

function isActivityType(value: unknown): value is ActivityType {
  return value === "feeding" || value === "medication" || value === "task";
}

export async function POST(request: Request) {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;

  try {
    const profile = await getCurrentProfile(token);
    const authorization = authorizeProfile(profile, "care:complete");

    if (authorization instanceof Response) {
      return authorization;
    }

    const body = await readJsonBody(request);
    if (
      !isRecord(body) ||
      !isActivityType(body.activityType) ||
      typeof body.scheduleId !== "string" ||
      !isUuid(body.scheduleId) ||
      typeof body.activityDate !== "string" ||
      !isValidIsoDate(body.activityDate)
    ) {
      return Response.json(
        { error: "Los datos de la tarea completada no son válidos." },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    const today = new Date().toISOString().slice(0, 10);
    if (body.activityDate > today) {
      return Response.json(
        { error: "No se puede registrar una tarea para una fecha futura." },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    const supabase = getSupabaseAdminClient();
    const dayOfWeek = getIsoDayOfWeek(body.activityDate);
    let isAvailable = false;

    if (body.activityType === "feeding") {
      const { data, error } = await supabase
        .from("feeding_schedules")
        .select("day_of_week")
        .eq("id", body.scheduleId)
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
        console.error("Could not verify feeding schedule:", error.message);
        return Response.json(
          { error: "No se pudo comprobar el horario." },
          { status: 503, headers: NO_STORE_HEADERS },
        );
      }

      isAvailable = data?.day_of_week === dayOfWeek;
    } else if (body.activityType === "task") {
      const { data, error } = await supabase
        .from("care_tasks")
        .select("day_of_week")
        .eq("id", body.scheduleId)
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
        console.error("Could not verify care task:", error.message);
        return Response.json(
          { error: "No se pudo comprobar la tarea." },
          { status: 503, headers: NO_STORE_HEADERS },
        );
      }

      isAvailable = data?.day_of_week === dayOfWeek;
    } else {
      const { data: medication, error: medicationError } = await supabase
        .from("medication_schedules")
        .select("id, start_date, end_date")
        .eq("id", body.scheduleId)
        .eq("is_active", true)
        .maybeSingle();

      if (medicationError) {
        console.error("Could not verify medication schedule:", medicationError.message);
        return Response.json(
          { error: "No se pudo comprobar la medicación." },
          { status: 503, headers: NO_STORE_HEADERS },
        );
      }

      if (
        medication &&
        medication.start_date <= body.activityDate &&
        (medication.end_date === null ||
          medication.end_date >= body.activityDate)
      ) {
        const { data: scheduledTime, error: timeError } = await supabase
          .from("medication_schedule_times")
          .select("medication_schedule_id")
          .eq("medication_schedule_id", medication.id)
          .eq("day_of_week", dayOfWeek)
          .limit(1)
          .maybeSingle();

        if (timeError) {
          console.error("Could not verify medication time:", timeError.message);
          return Response.json(
            { error: "No se pudo comprobar la hora de medicación." },
            { status: 503, headers: NO_STORE_HEADERS },
          );
        }

        isAvailable = scheduledTime !== null;
      }
    }

    if (!isAvailable) {
      return Response.json(
        { error: "La actividad no está programada para esa fecha." },
        { status: 409, headers: NO_STORE_HEADERS },
      );
    }

    const completion = {
      activity_date: body.activityDate,
      completed_by: authorization.profileKey,
      feeding_schedule_id:
        body.activityType === "feeding" ? body.scheduleId : null,
      medication_schedule_id:
        body.activityType === "medication" ? body.scheduleId : null,
      care_task_id: body.activityType === "task" ? body.scheduleId : null,
    };
    const { data, error } = await supabase
      .from("care_completions")
      .insert(completion)
      .select("id, activity_date, completed_by, completed_at")
      .single();

    if (error?.code === "23505") {
      return Response.json(
        { error: "Esta actividad ya se había marcado como completada." },
        { status: 409, headers: NO_STORE_HEADERS },
      );
    }

    if (error) {
      console.error("Could not record care completion:", error.message);
      return Response.json(
        { error: "No se pudo guardar la tarea completada." },
        { status: 503, headers: NO_STORE_HEADERS },
      );
    }

    return Response.json(
      {
        completion: {
          id: data.id,
          activityDate: data.activity_date,
          completedBy: data.completed_by,
          completedAt: data.completed_at,
        },
      },
      { status: 201, headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    console.error(
      "Care completion failed:",
      error instanceof Error ? error.message : "Unknown completion error",
    );
    return Response.json(
      { error: "No se pudo guardar la tarea completada." },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }
}
