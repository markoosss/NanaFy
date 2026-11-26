import { isRecord } from "@/lib/http/json";
import { isUuid, isValidIsoDate } from "@/lib/care/date";

type ScheduleTime = {
  dayOfWeek: number;
  scheduledTime: string;
};

type ScheduleBase = {
  id?: string;
  isActive: boolean;
};

export type CareScheduleInput =
  | (ScheduleBase & {
      kind: "feeding";
      mealName: string;
      portion: string | null;
      dayOfWeek: number;
      scheduledTime: string;
    })
  | (ScheduleBase & {
      kind: "task";
      taskName: string;
      instructions: string | null;
      dayOfWeek: number;
      scheduledTime: string | null;
    })
  | (ScheduleBase & {
      kind: "medication";
      medicationName: string;
      instructions: string;
      startDate: string;
      endDate: string | null;
      times: ScheduleTime[];
    });

const TIME_PATTERN =
  /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,6})?)?$/;

function isNonEmptyText(value: unknown, maxLength: number): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim().length <= maxLength
  );
}

function normalizeOptionalText(value: unknown, maxLength: number): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string" || value.trim().length > maxLength) {
    return null;
  }

  return value.trim() || null;
}

function isDayOfWeek(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 7
  );
}

function isValidTime(value: unknown): value is string {
  return typeof value === "string" && TIME_PATTERN.test(value);
}

function normalizeTime(value: string): string {
  return value.slice(0, 5);
}

function parseTimes(value: unknown): ScheduleTime[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const times: ScheduleTime[] = [];
  const uniqueTimes = new Set<string>();

  for (const entry of value) {
    if (
      !isRecord(entry) ||
      !isDayOfWeek(entry.dayOfWeek) ||
      !isValidTime(entry.scheduledTime)
    ) {
      return null;
    }

    const scheduledTime = normalizeTime(entry.scheduledTime);
    const key = `${entry.dayOfWeek}:${scheduledTime}`;
    if (uniqueTimes.has(key)) {
      return null;
    }

    uniqueTimes.add(key);
    times.push({
      dayOfWeek: entry.dayOfWeek,
      scheduledTime,
    });
  }

  return times;
}

export function parseCareScheduleInput(value: unknown): CareScheduleInput | null {
  if (!isRecord(value) || typeof value.kind !== "string") {
    return null;
  }

  const id =
    value.id === undefined
      ? undefined
      : typeof value.id === "string" && isUuid(value.id)
        ? value.id
        : null;

  if (id === null || typeof value.isActive !== "boolean") {
    return null;
  }

  const base = { ...(id ? { id } : {}), isActive: value.isActive };

  if (value.kind === "feeding") {
    const portion = normalizeOptionalText(value.portion, 120);
    if (
      !isNonEmptyText(value.mealName, 100) ||
      !isDayOfWeek(value.dayOfWeek) ||
      !isValidTime(value.scheduledTime) ||
      (value.portion !== undefined &&
        value.portion !== null &&
        (typeof value.portion !== "string" ||
          value.portion.trim().length > 120))
    ) {
      return null;
    }

    return {
      ...base,
      kind: "feeding",
      mealName: value.mealName.trim(),
      portion,
      dayOfWeek: value.dayOfWeek,
      scheduledTime: value.scheduledTime,
    };
  }

  if (value.kind === "task") {
    const instructions = normalizeOptionalText(value.instructions, 500);
    if (
      !isNonEmptyText(value.taskName, 120) ||
      !isDayOfWeek(value.dayOfWeek) ||
      (value.scheduledTime !== null &&
        value.scheduledTime !== undefined &&
        !isValidTime(value.scheduledTime)) ||
      (value.instructions !== undefined &&
        value.instructions !== null &&
        (typeof value.instructions !== "string" ||
          value.instructions.trim().length > 500))
    ) {
      return null;
    }

    return {
      ...base,
      kind: "task",
      taskName: value.taskName.trim(),
      instructions,
      dayOfWeek: value.dayOfWeek,
      scheduledTime:
        typeof value.scheduledTime === "string" ? value.scheduledTime : null,
    };
  }

  if (value.kind === "medication") {
    const times = parseTimes(value.times);
    const endDate =
      value.endDate === undefined || value.endDate === null
        ? null
        : value.endDate;
    if (
      !isNonEmptyText(value.medicationName, 120) ||
      !isNonEmptyText(value.instructions, 1000) ||
      typeof value.startDate !== "string" ||
      !isValidIsoDate(value.startDate) ||
      (endDate !== null &&
        (typeof endDate !== "string" || !isValidIsoDate(endDate))) ||
      (endDate !== null && endDate < value.startDate) ||
      !times
    ) {
      return null;
    }

    return {
      ...base,
      kind: "medication",
      medicationName: value.medicationName.trim(),
      instructions: value.instructions.trim(),
      startDate: value.startDate,
      endDate,
      times,
    };
  }

  return null;
}
