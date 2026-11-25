import { isRecord } from "@/lib/http/json";

export type CareActivityType = "feeding" | "medication" | "task";

export type CareActivity = {
  id: string;
  activityType: CareActivityType;
  title: string;
  detail: string | null;
  scheduledTime: string | null;
  times: string[];
  isCompleted: boolean;
  completedBy: string | null;
  completedObservation: string | null;
};

export type DailyCareData = {
  date: string;
  activities: CareActivity[];
};

export type CalendarEvent = {
  id: string;
  title: string;
  eventType: "veterinary" | "checkup" | "other";
  eventDate: string;
  eventTime: string | null;
  details: string | null;
  createdBy: string;
};

export type CareNote = {
  id: string;
  content: string;
  createdBy: string;
  createdAt: string;
};

export type CareHistoryEntry = {
  id: string;
  activityDate: string;
  activityType: CareActivityType;
  label: string;
  scheduledTime: string | null;
  completedByName: string;
  completedAt: string;
  observation: string | null;
};

export type MedicationTime = {
  dayOfWeek: number;
  scheduledTime: string;
};

export type AdminSchedule =
  | {
      kind: "feeding";
      id: string;
      mealName: string;
      portion: string | null;
      dayOfWeek: number;
      scheduledTime: string;
      isActive: boolean;
    }
  | {
      kind: "medication";
      id: string;
      medicationName: string;
      instructions: string;
      startDate: string;
      endDate: string | null;
      isActive: boolean;
      times: MedicationTime[];
    }
  | {
      kind: "task";
      id: string;
      taskName: string;
      instructions: string | null;
      dayOfWeek: number;
      scheduledTime: string | null;
      isActive: boolean;
    };

function requireRecordArray(value: unknown, key: string): Record<string, unknown>[] {
  if (!isRecord(value) || !Array.isArray(value[key])) {
    throw new Error("La respuesta de NanaFy no tiene un formato válido.");
  }

  const records = value[key];
  if (!records.every(isRecord)) {
    throw new Error("La respuesta de NanaFy contiene datos no válidos.");
  }

  return records;
}

function requireString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string") {
    throw new Error("La respuesta de NanaFy contiene datos no válidos.");
  }

  return value;
}

function optionalString(
  record: Record<string, unknown>,
  key: string,
): string | null {
  const value = record[key];
  if (value !== null && typeof value !== "string") {
    throw new Error("La respuesta de NanaFy contiene datos no válidos.");
  }

  return value;
}

function requireBoolean(record: Record<string, unknown>, key: string): boolean {
  const value = record[key];
  if (typeof value !== "boolean") {
    throw new Error("La respuesta de NanaFy contiene datos no válidos.");
  }

  return value;
}

function requireNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (typeof value !== "number") {
    throw new Error("La respuesta de NanaFy contiene datos no válidos.");
  }

  return value;
}

function isActivityType(value: unknown): value is CareActivityType {
  return value === "feeding" || value === "medication" || value === "task";
}

function parseCareActivity(
  record: Record<string, unknown>,
  activityType: CareActivityType,
): CareActivity {
  const titleKey =
    activityType === "feeding"
      ? "mealName"
      : activityType === "medication"
        ? "medicationName"
        : "taskName";
  const detailKey =
    activityType === "feeding"
      ? "portion"
      : activityType === "medication"
        ? "instructions"
        : "instructions";
  const times = activityType === "medication" ? record.times : [];

  if (
    !Array.isArray(times) ||
    !times.every((time) => typeof time === "string")
  ) {
    throw new Error("La respuesta de NanaFy contiene horas no válidas.");
  }

  return {
    id: requireString(record, "id"),
    activityType,
    title: requireString(record, titleKey),
    detail: optionalString(record, detailKey),
    scheduledTime:
      activityType === "medication"
        ? null
        : optionalString(record, "scheduledTime"),
    times,
    isCompleted: requireBoolean(record, "isCompleted"),
    completedBy: optionalString(record, "completedBy"),
    completedObservation: optionalString(record, "completedObservation"),
  };
}

export function parseDailyCare(value: unknown): DailyCareData {
  if (!isRecord(value) || typeof value.date !== "string") {
    throw new Error("La respuesta del plan diario no es válida.");
  }

  const activities = (
    [
      ["feedings", "feeding"],
      ["medications", "medication"],
      ["tasks", "task"],
    ] as const
  ).flatMap(([key, activityType]) =>
    requireRecordArray(value, key).map((record) =>
      parseCareActivity(record, activityType),
    ),
  );

  return { date: value.date, activities };
}

export function parseCalendarEvents(value: unknown): CalendarEvent[] {
  return requireRecordArray(value, "events").map((event) => {
    const eventType = event.eventType;
    if (
      eventType !== "veterinary" &&
      eventType !== "checkup" &&
      eventType !== "other"
    ) {
      throw new Error("La respuesta del calendario contiene una cita no válida.");
    }

    return {
      id: requireString(event, "id"),
      title: requireString(event, "title"),
      eventType,
      eventDate: requireString(event, "eventDate"),
      eventTime: optionalString(event, "eventTime"),
      details: optionalString(event, "details"),
      createdBy: requireString(event, "createdBy"),
    };
  });
}

export function parseCareNotes(value: unknown): CareNote[] {
  return requireRecordArray(value, "notes").map((note) => ({
    id: requireString(note, "id"),
    content: requireString(note, "content"),
    createdBy: requireString(note, "createdBy"),
    createdAt: requireString(note, "createdAt"),
  }));
}

export function parseCareHistory(value: unknown): CareHistoryEntry[] {
  return requireRecordArray(value, "entries").map((entry) => {
    const activityType = entry.activityType;
    if (!isActivityType(activityType)) {
      throw new Error("La respuesta del historial contiene una actividad no válida.");
    }

    return {
      id: requireString(entry, "id"),
      activityDate: requireString(entry, "activityDate"),
      activityType,
      label: requireString(entry, "label"),
      scheduledTime: optionalString(entry, "scheduledTime"),
      completedByName: requireString(entry, "completedByName"),
      completedAt: requireString(entry, "completedAt"),
      observation: optionalString(entry, "observation"),
    };
  });
}

function parseMedicationTimes(value: unknown): MedicationTime[] {
  if (!Array.isArray(value)) {
    throw new Error("La respuesta de medicación no tiene horas válidas.");
  }

  return value.map((time) => {
    if (!isRecord(time)) {
      throw new Error("La respuesta de medicación no tiene horas válidas.");
    }

    return {
      dayOfWeek: requireNumber(time, "dayOfWeek"),
      scheduledTime: requireString(time, "scheduledTime"),
    };
  });
}

export function parseAdminSchedules(value: unknown): AdminSchedule[] {
  return requireRecordArray(value, "schedules").map((schedule) => {
    const kind = schedule.kind;
    const base = {
      id: requireString(schedule, "id"),
      isActive: requireBoolean(schedule, "isActive"),
    };

    if (kind === "feeding") {
      return {
        ...base,
        kind,
        mealName: requireString(schedule, "mealName"),
        portion: optionalString(schedule, "portion"),
        dayOfWeek: requireNumber(schedule, "dayOfWeek"),
        scheduledTime: requireString(schedule, "scheduledTime"),
      };
    }

    if (kind === "medication") {
      return {
        ...base,
        kind,
        medicationName: requireString(schedule, "medicationName"),
        instructions: requireString(schedule, "instructions"),
        startDate: requireString(schedule, "startDate"),
        endDate: optionalString(schedule, "endDate"),
        times: parseMedicationTimes(schedule.times),
      };
    }

    if (kind === "task") {
      return {
        ...base,
        kind,
        taskName: requireString(schedule, "taskName"),
        instructions: optionalString(schedule, "instructions"),
        dayOfWeek: requireNumber(schedule, "dayOfWeek"),
        scheduledTime: optionalString(schedule, "scheduledTime"),
      };
    }

    throw new Error("La respuesta contiene un horario no válido.");
  });
}
