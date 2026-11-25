"use client";

import { useEffect, useState } from "react";
import {
  parseCareHistory,
  type CareHistoryEntry,
} from "@/components/care-data";
import { requestJson } from "@/lib/http/client";

const ACTIVITY_LABELS = {
  feeding: "Alimentación",
  medication: "Medicación",
  task: "Tarea",
} as const;

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00.000Z`));
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function CareHistory() {
  const [entries, setEntries] = useState<CareHistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadHistory() {
      setIsLoading(true);
      setError(null);
      try {
        const payload = await requestJson("/api/care/history");
        if (active) {
          setEntries(parseCareHistory(payload));
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudo cargar el historial.",
          );
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadHistory();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div>
      <p className="text-sm font-medium text-foreground/55">
        Últimos 30 días
      </p>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
        Historial de cuidados
      </h2>
      {error ? (
        <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}
      {isLoading ? (
        <p aria-live="polite" className="mt-5 text-sm text-foreground/60">
          Cargando historial...
        </p>
      ) : entries.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-foreground/10 bg-white/70 p-5 text-sm text-foreground/60">
          Todavía no hay cuidados completados en este periodo.
        </p>
      ) : (
        <ol className="mt-5 space-y-3">
          {entries.map((entry) => (
            <li
              className="flex flex-col gap-2 rounded-2xl border border-foreground/10 bg-white/80 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
              key={entry.id}
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground/50">
                  {ACTIVITY_LABELS[entry.activityType]} · {formatDate(entry.activityDate)}
                </p>
                <h3 className="mt-1 font-semibold">{entry.label}</h3>
                <p className="mt-1 text-sm text-foreground/60">
                  Completado por {entry.completedByName}
                </p>
              </div>
              <time
                className="text-xs text-foreground/50"
                dateTime={entry.completedAt}
              >
                {formatDateTime(entry.completedAt)}
              </time>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
