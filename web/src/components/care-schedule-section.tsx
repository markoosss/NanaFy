"use client";

import { useEffect, useState } from "react";
import type { AuthenticatedProfile } from "@/lib/auth/session";
import type { HouseholdProfile } from "@/components/profile-selection";
import {
  parseDailyCare,
  type CareActivity,
  type DailyCareData,
} from "@/components/care-data";
import { requestJson } from "@/lib/http/client";

type CareScheduleSectionProps = {
  mode: "today" | "medications";
  profile: AuthenticatedProfile;
  profiles: HouseholdProfile[];
};

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatTime(value: string): string {
  return value.slice(0, 5);
}

function labelForActivity(activity: CareActivity): string {
  switch (activity.activityType) {
    case "feeding":
      return "Alimentación";
    case "medication":
      return "Medicación";
    case "task":
      return "Tarea";
  }
}

export function CareScheduleSection({
  mode,
  profile,
  profiles,
}: CareScheduleSectionProps) {
  const [date, setDate] = useState(getToday);
  const [data, setData] = useState<DailyCareData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingId, setIsSavingId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadSchedule() {
      setIsLoading(true);
      setError(null);
      try {
        const payload = await requestJson(
          `/api/care/schedules?date=${encodeURIComponent(date)}`,
        );
        if (active) {
          setData(parseDailyCare(payload));
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudo cargar el plan de cuidados.",
          );
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadSchedule();
    return () => {
      active = false;
    };
  }, [date, reloadKey]);

  async function completeActivity(activity: CareActivity) {
    setIsSavingId(activity.id);
    setError(null);
    try {
      await requestJson("/api/care/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityType: activity.activityType,
          scheduleId: activity.id,
          activityDate: date,
        }),
      });
      setReloadKey((key) => key + 1);
    } catch (completionError) {
      setError(
        completionError instanceof Error
          ? completionError.message
          : "No se pudo registrar la tarea.",
      );
    } finally {
      setIsSavingId(null);
    }
  }

  const activities = (data?.activities ?? []).filter((activity) =>
    mode === "medications" ? activity.activityType === "medication" : true,
  );
  const completedByName = (profileKey: string | null) =>
    profiles.find((householdProfile) => householdProfile.profileKey === profileKey)
      ?.displayName ?? profileKey ?? "un perfil";

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground/55">
            {mode === "medications" ? "Tratamientos activos" : "Plan compartido"}
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            {mode === "medications" ? "Medicación" : "Cuidados del día"}
          </h2>
        </div>
        <label className="text-sm font-medium" htmlFor={`care-date-${mode}`}>
          Fecha
          <input
            className="mt-1 block min-h-11 rounded-xl border border-foreground/15 bg-white px-3"
            id={`care-date-${mode}`}
            onChange={(event) => setDate(event.target.value)}
            type="date"
            value={date}
          />
        </label>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}
      {isLoading ? (
        <p aria-live="polite" className="mt-6 text-sm text-foreground/60">
          Cargando cuidados...
        </p>
      ) : activities.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-foreground/10 bg-white/70 p-5 text-sm text-foreground/60">
          {mode === "medications"
            ? "No hay medicación programada para esta fecha."
            : "No hay cuidados programados para esta fecha."}
        </p>
      ) : (
        <div className="mt-6 grid gap-3 lg:grid-cols-2">
          {activities.map((activity) => (
            <article
              className="rounded-2xl border border-foreground/10 bg-white/80 p-5"
              key={`${activity.activityType}:${activity.id}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground/50">
                    {labelForActivity(activity)}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold">{activity.title}</h3>
                  {activity.detail ? (
                    <p className="mt-1 text-sm leading-6 text-foreground/65">
                      {activity.detail}
                    </p>
                  ) : null}
                  {activity.activityType === "medication" &&
                  activity.times.length > 0 ? (
                    <p className="mt-3 text-sm text-foreground/70">
                      Horas: {activity.times.map(formatTime).join(", ")}
                    </p>
                  ) : activity.scheduledTime ? (
                    <p className="mt-3 text-sm text-foreground/70">
                      Hora: {formatTime(activity.scheduledTime)}
                    </p>
                  ) : null}
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                    activity.isCompleted
                      ? "bg-lime-100 text-emerald-900"
                      : "bg-amber-100 text-amber-900"
                  }`}
                >
                  {activity.isCompleted ? "Hecho" : "Pendiente"}
                </span>
              </div>
              {activity.isCompleted ? (
                <p className="mt-4 text-xs text-foreground/55">
                  Completado por{" "}
                  {activity.completedBy === profile.profileKey
                    ? "ti"
                    : completedByName(activity.completedBy)}
                </p>
              ) : (
                <button
                  className="mt-5 min-h-11 rounded-xl bg-foreground px-4 text-sm font-semibold text-background transition hover:bg-foreground/90 disabled:opacity-60"
                  disabled={isSavingId === activity.id}
                  onClick={() => void completeActivity(activity)}
                  type="button"
                >
                  {isSavingId === activity.id ? "Guardando..." : "Marcar como hecho"}
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
