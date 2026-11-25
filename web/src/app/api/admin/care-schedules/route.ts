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
