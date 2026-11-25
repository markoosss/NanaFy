"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { AuthenticatedProfile } from "@/lib/auth/session";
import { parseCalendarEvents, type CalendarEvent } from "@/components/care-data";
import { requestJson } from "@/lib/http/client";

type CareCalendarProps = {
  profile: AuthenticatedProfile;
};

const EVENT_LABELS = {
  veterinary: "Veterinario",
  checkup: "Revisión",
  other: "Otro",
} as const;

function isCalendarEventType(value: string): value is CalendarEvent["eventType"] {
  return value === "veterinary" || value === "checkup" || value === "other";
}

function getMonthRange(month: string) {
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthNumber = Number(monthText);

  return {
    from: `${month}-01`,
    to: new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10),
  };
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00.000Z`));
}

export function CareCalendar({ profile }: CareCalendarProps) {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [title, setTitle] = useState("");
  const [eventType, setEventType] =
    useState<CalendarEvent["eventType"]>("veterinary");
  const [eventDate, setEventDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [eventTime, setEventTime] = useState("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const canManage = profile.role !== "guest";

  useEffect(() => {
    let active = true;
    async function loadEvents() {
      setIsLoading(true);
      setError(null);
      const range = getMonthRange(month);
      try {
        const payload = await requestJson(
          `/api/care/calendar?from=${range.from}&to=${range.to}`,
        );
        if (active) {
          setEvents(parseCalendarEvents(payload));
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudo cargar el calendario.",
          );
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadEvents();
    return () => {
      active = false;
    };
  }, [month, reloadKey]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      await requestJson("/api/care/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          eventType,
          eventDate,
          eventTime: eventTime || null,
          details: details || null,
        }),
      });
      setTitle("");
      setEventTime("");
      setDetails("");
      setReloadKey((key) => key + 1);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "No se pudo guardar la cita.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground/55">
            Citas y revisiones
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Calendario de Kiro
          </h2>
        </div>
        <label className="text-sm font-medium" htmlFor="calendar-month">
          Mes
          <input
            className="mt-1 block min-h-11 rounded-xl border border-foreground/15 bg-white px-3"
            id="calendar-month"
            onChange={(event) => {
              if (/^\d{4}-(0[1-9]|1[0-2])$/.test(event.target.value)) {
                setMonth(event.target.value);
              }
            }}
            type="month"
            value={month}
          />
        </label>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}

      {canManage ? (
        <form
          className="mt-5 grid gap-3 rounded-2xl border border-foreground/10 bg-white/80 p-4 sm:grid-cols-2 sm:p-5"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <h3 className="text-lg font-semibold sm:col-span-2">Añadir cita</h3>
          <label className="text-sm font-medium" htmlFor="event-title">
            Título
            <input
              className="mt-1 min-h-11 w-full rounded-xl border border-foreground/15 bg-background px-3"
              id="event-title"
              maxLength={120}
              onChange={(event) => setTitle(event.target.value)}
              required
              value={title}
            />
          </label>
          <label className="text-sm font-medium" htmlFor="event-type">
            Tipo
            <select
              className="mt-1 min-h-11 w-full rounded-xl border border-foreground/15 bg-background px-3"
              id="event-type"
              onChange={(event) => {
                if (isCalendarEventType(event.target.value)) {
                  setEventType(event.target.value);
                }
              }}
              value={eventType}
            >
              <option value="veterinary">Veterinario</option>
              <option value="checkup">Revisión</option>
              <option value="other">Otro</option>
            </select>
          </label>
          <label className="text-sm font-medium" htmlFor="event-date">
            Fecha
            <input
              className="mt-1 min-h-11 w-full rounded-xl border border-foreground/15 bg-background px-3"
              id="event-date"
              onChange={(event) => setEventDate(event.target.value)}
              required
              type="date"
              value={eventDate}
            />
          </label>
          <label className="text-sm font-medium" htmlFor="event-time">
            Hora (opcional)
            <input
              className="mt-1 min-h-11 w-full rounded-xl border border-foreground/15 bg-background px-3"
              id="event-time"
              onChange={(event) => setEventTime(event.target.value)}
              type="time"
              value={eventTime}
            />
          </label>
          <label className="text-sm font-medium sm:col-span-2" htmlFor="event-details">
            Detalles
            <textarea
              className="mt-1 min-h-20 w-full rounded-xl border border-foreground/15 bg-background p-3"
              id="event-details"
              maxLength={1000}
              onChange={(event) => setDetails(event.target.value)}
              value={details}
            />
          </label>
          <button
            className="min-h-11 rounded-xl bg-foreground px-4 text-sm font-semibold text-background disabled:opacity-60 sm:col-span-2 sm:justify-self-start"
            disabled={isSaving}
            type="submit"
          >
            {isSaving ? "Guardando..." : "Guardar cita"}
          </button>
        </form>
      ) : null}

      <div className="mt-6">
        <h3 className="text-lg font-semibold">
          {new Intl.DateTimeFormat("es-ES", {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          }).format(new Date(`${month}-01T12:00:00.000Z`))}
        </h3>
        {isLoading ? (
          <p aria-live="polite" className="mt-4 text-sm text-foreground/60">
            Cargando citas...
          </p>
        ) : events.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-foreground/10 bg-white/70 p-5 text-sm text-foreground/60">
            No hay citas para este mes.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 lg:grid-cols-2">
            {events.map((careEvent) => (
              <li
                className="rounded-2xl border border-foreground/10 bg-white/80 p-5"
                key={careEvent.id}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground/50">
                  {EVENT_LABELS[careEvent.eventType]}
                </p>
                <h4 className="mt-2 text-lg font-semibold">{careEvent.title}</h4>
                <p className="mt-1 text-sm text-foreground/65">
                  {formatDate(careEvent.eventDate)}
                  {careEvent.eventTime
                    ? ` · ${careEvent.eventTime.slice(0, 5)}`
                    : ""}
                </p>
                {careEvent.details ? (
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground/65">
                    {careEvent.details}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
