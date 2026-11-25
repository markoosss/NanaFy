"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  parseAdminSchedules,
  type AdminSchedule,
  type MedicationTime,
} from "@/components/care-data";
import { requestJson } from "@/lib/http/client";

type ScheduleKind = AdminSchedule["kind"];

const WEEKDAYS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

function isScheduleKind(value: string): value is ScheduleKind {
  return value === "feeding" || value === "medication" || value === "task";
}

function weekdayName(day: number): string {
  return WEEKDAYS[day - 1] ?? "Día no válido";
}

function newMedicationTime(): MedicationTime {
  return { dayOfWeek: 1, scheduledTime: "08:00" };
}

export function CareScheduleManager() {
  const [schedules, setSchedules] = useState<AdminSchedule[]>([]);
  const [kind, setKind] = useState<ScheduleKind>("feeding");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [portion, setPortion] = useState("");
  const [instructions, setInstructions] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [scheduledTime, setScheduledTime] = useState("08:00");
  const [startDate, setStartDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [endDate, setEndDate] = useState("");
  const [medicationTimes, setMedicationTimes] = useState<MedicationTime[]>([
    newMedicationTime(),
  ]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    async function loadSchedules() {
      setIsLoading(true);
      setError(null);
      try {
        const payload = await requestJson("/api/admin/care-schedules");
        const loaded = parseAdminSchedules(payload);
        if (active) {
          setSchedules(loaded);
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudieron cargar los horarios.",
          );
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadSchedules();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  function resetForm(nextKind: ScheduleKind = kind) {
    setKind(nextKind);
    setEditingId(null);
    setName("");
    setPortion("");
    setInstructions("");
    setDayOfWeek(1);
    setScheduledTime("08:00");
    setStartDate(new Date().toISOString().slice(0, 10));
    setEndDate("");
    setMedicationTimes([newMedicationTime()]);
  }

  function editSchedule(schedule: AdminSchedule) {
    setKind(schedule.kind);
    setEditingId(schedule.id);
    if (schedule.kind === "feeding") {
      setName(schedule.mealName);
      setPortion(schedule.portion ?? "");
      setDayOfWeek(schedule.dayOfWeek);
      setScheduledTime(schedule.scheduledTime.slice(0, 5));
      setInstructions("");
      setMedicationTimes([newMedicationTime()]);
    } else if (schedule.kind === "task") {
      setName(schedule.taskName);
      setInstructions(schedule.instructions ?? "");
      setDayOfWeek(schedule.dayOfWeek);
      setScheduledTime(schedule.scheduledTime?.slice(0, 5) ?? "");
      setPortion("");
      setMedicationTimes([newMedicationTime()]);
    } else {
      setName(schedule.medicationName);
      setInstructions(schedule.instructions);
      setStartDate(schedule.startDate);
      setEndDate(schedule.endDate ?? "");
      setMedicationTimes(
        schedule.times.length > 0 ? schedule.times : [newMedicationTime()],
      );
      setPortion("");
      setScheduledTime("08:00");
    }
  }

  async function saveSchedule(
    event: FormEvent<HTMLFormElement>,
    isActive = true,
  ) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    let body: Record<string, unknown>;
    if (kind === "feeding") {
      body = {
        kind,
        mealName: name,
        portion: portion || null,
        dayOfWeek,
        scheduledTime,
        isActive,
      };
    } else if (kind === "task") {
      body = {
        kind,
        taskName: name,
        instructions: instructions || null,
        dayOfWeek,
        scheduledTime: scheduledTime || null,
        isActive,
      };
    } else {
      body = {
        kind,
        medicationName: name,
        instructions,
        startDate,
        endDate: endDate || null,
        times: medicationTimes,
        isActive,
      };
    }

    if (editingId) {
      body.id = editingId;
    }

    try {
      await requestJson("/api/admin/care-schedules", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      resetForm();
      setReloadKey((key) => key + 1);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "No se pudo guardar el horario.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleActive(schedule: AdminSchedule) {
    setError(null);
    try {
      await requestJson("/api/admin/care-schedules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...schedule,
          isActive: !schedule.isActive,
        }),
      });
      setReloadKey((key) => key + 1);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "No se pudo actualizar el horario.",
      );
    }
  }

  function describeSchedule(schedule: AdminSchedule): string {
    if (schedule.kind === "feeding") {
      return `${schedule.mealName} · ${weekdayName(schedule.dayOfWeek)} · ${schedule.scheduledTime.slice(0, 5)}`;
    }
    if (schedule.kind === "task") {
      return `${schedule.taskName} · ${weekdayName(schedule.dayOfWeek)}${schedule.scheduledTime ? ` · ${schedule.scheduledTime.slice(0, 5)}` : ""}`;
    }
    return `${schedule.medicationName} · ${schedule.times.length} hora(s) programada(s)`;
  }

  return (
    <section className="rounded-2xl border border-foreground/10 bg-white/80 p-5">
      <h3 className="text-lg font-semibold">Horarios y tareas</h3>
      <p className="mt-1 text-sm leading-6 text-foreground/60">
        Los cambios afectan el plan futuro; el historial de cuidados se conserva.
      </p>

      <form
        className="mt-4 grid gap-3 rounded-xl bg-background p-4 sm:grid-cols-2"
        onSubmit={(event) => void saveSchedule(event)}
      >
        <label className="text-sm font-medium" htmlFor="schedule-kind">
          Tipo de horario
          <select
            className="mt-1 min-h-11 w-full rounded-xl border border-foreground/15 bg-white px-3"
            id="schedule-kind"
            onChange={(event) => {
              if (isScheduleKind(event.target.value)) {
                resetForm(event.target.value);
              }
            }}
            value={kind}
          >
            <option value="feeding">Alimentación</option>
            <option value="medication">Medicación</option>
            <option value="task">Tarea extra</option>
          </select>
        </label>
        <label className="text-sm font-medium" htmlFor="schedule-name">
          {kind === "feeding"
            ? "Comida"
            : kind === "medication"
              ? "Medicamento"
              : "Tarea"}
          <input
            className="mt-1 min-h-11 w-full rounded-xl border border-foreground/15 bg-white px-3"
            id="schedule-name"
            maxLength={120}
            onChange={(event) => setName(event.target.value)}
            required
            value={name}
          />
        </label>

        {kind === "feeding" ? (
          <>
            <label className="text-sm font-medium" htmlFor="schedule-portion">
              Cantidad
              <input
                className="mt-1 min-h-11 w-full rounded-xl border border-foreground/15 bg-white px-3"
                id="schedule-portion"
                maxLength={120}
                onChange={(event) => setPortion(event.target.value)}
                value={portion}
              />
            </label>
            <WeekdaySelect
              id="schedule-day"
              onChange={setDayOfWeek}
              value={dayOfWeek}
            />
            <label className="text-sm font-medium" htmlFor="schedule-time">
              Hora
              <input
                className="mt-1 min-h-11 w-full rounded-xl border border-foreground/15 bg-white px-3"
                id="schedule-time"
                onChange={(event) => setScheduledTime(event.target.value)}
                required
                type="time"
                value={scheduledTime}
              />
            </label>
          </>
        ) : null}

        {kind === "task" ? (
          <>
            <WeekdaySelect
              id="schedule-day"
              onChange={setDayOfWeek}
              value={dayOfWeek}
            />
            <label className="text-sm font-medium" htmlFor="schedule-time">
              Hora (opcional)
              <input
                className="mt-1 min-h-11 w-full rounded-xl border border-foreground/15 bg-white px-3"
                id="schedule-time"
                onChange={(event) => setScheduledTime(event.target.value)}
                type="time"
                value={scheduledTime}
              />
            </label>
            <label className="text-sm font-medium sm:col-span-2" htmlFor="schedule-instructions">
              Indicaciones (opcional)
              <textarea
                className="mt-1 min-h-20 w-full rounded-xl border border-foreground/15 bg-white p-3"
                id="schedule-instructions"
                maxLength={500}
                onChange={(event) => setInstructions(event.target.value)}
                value={instructions}
              />
            </label>
          </>
        ) : null}

        {kind === "medication" ? (
          <>
            <label className="text-sm font-medium" htmlFor="medication-instructions">
              Indicaciones
              <textarea
                className="mt-1 min-h-20 w-full rounded-xl border border-foreground/15 bg-white p-3"
                id="medication-instructions"
                maxLength={1000}
                onChange={(event) => setInstructions(event.target.value)}
                required
                value={instructions}
              />
            </label>
            <label className="text-sm font-medium" htmlFor="medication-start">
              Desde
              <input
                className="mt-1 min-h-11 w-full rounded-xl border border-foreground/15 bg-white px-3"
                id="medication-start"
                onChange={(event) => setStartDate(event.target.value)}
                required
                type="date"
                value={startDate}
              />
            </label>
            <label className="text-sm font-medium" htmlFor="medication-end">
              Hasta (opcional)
              <input
                className="mt-1 min-h-11 w-full rounded-xl border border-foreground/15 bg-white px-3"
                id="medication-end"
                onChange={(event) => setEndDate(event.target.value)}
                type="date"
                value={endDate}
              />
            </label>
            <div className="space-y-2 sm:col-span-2">
              <p className="text-sm font-medium">Días y horas</p>
              {medicationTimes.map((time, index) => (
                <div
                  className="flex flex-wrap items-end gap-2"
                  key={`${index}-${time.dayOfWeek}`}
                >
                  <WeekdaySelect
                    id={`medication-day-${index}`}
                    onChange={(value) =>
                      setMedicationTimes((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, dayOfWeek: value }
                            : item,
                        ),
                      )
                    }
                    value={time.dayOfWeek}
                  />
                  <label
                    className="text-sm font-medium"
                    htmlFor={`medication-time-${index}`}
                  >
                    Hora
                    <input
                      className="mt-1 min-h-11 rounded-xl border border-foreground/15 bg-white px-3"
                      id={`medication-time-${index}`}
                      onChange={(event) =>
                        setMedicationTimes((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, scheduledTime: event.target.value }
                              : item,
                          ),
                        )
                      }
                      required
                      type="time"
                      value={time.scheduledTime}
                    />
                  </label>
                  {medicationTimes.length > 1 ? (
                    <button
                      className="min-h-11 rounded-xl border border-foreground/15 px-3 text-sm"
                      onClick={() =>
                        setMedicationTimes((current) =>
                          current.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                      type="button"
                    >
                      Quitar
                    </button>
                  ) : null}
                </div>
              ))}
              <button
                className="min-h-10 rounded-xl border border-foreground/15 px-3 text-sm font-medium"
                onClick={() =>
                  setMedicationTimes((current) => [
                    ...current,
                    newMedicationTime(),
                  ])
                }
                type="button"
              >
                Añadir día u hora
              </button>
            </div>
          </>
        ) : null}

        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <button
            className="min-h-11 rounded-xl bg-foreground px-4 text-sm font-semibold text-background disabled:opacity-60"
            disabled={isSaving}
            type="submit"
          >
            {isSaving
              ? "Guardando..."
              : editingId
                ? "Guardar cambios"
                : "Añadir horario"}
          </button>
          {editingId ? (
            <button
              className="min-h-11 rounded-xl border border-foreground/15 px-4 text-sm font-medium"
              onClick={() => resetForm()}
              type="button"
            >
              Cancelar edición
            </button>
          ) : null}
        </div>
      </form>

      {error ? (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {isLoading ? (
        <p aria-live="polite" className="mt-4 text-sm text-foreground/60">
          Cargando horarios...
        </p>
      ) : schedules.length === 0 ? (
        <p className="mt-4 text-sm text-foreground/60">
          Todavía no hay horarios guardados.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-foreground/10">
          {schedules.map((schedule) => (
            <li
              className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
              key={`${schedule.kind}:${schedule.id}`}
            >
              <div>
                <p className="font-medium">{describeSchedule(schedule)}</p>
                <p className="mt-1 text-xs text-foreground/55">
                  {schedule.isActive ? "Activo" : "Pausado"}
                  {schedule.kind === "medication"
                    ? ` · ${schedule.instructions}`
                    : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  className="min-h-10 rounded-xl border border-foreground/15 px-3 text-sm font-medium"
                  onClick={() => editSchedule(schedule)}
                  type="button"
                >
                  Editar
                </button>
                <button
                  className="min-h-10 rounded-xl border border-foreground/15 px-3 text-sm font-medium"
                  onClick={() => void toggleActive(schedule)}
                  type="button"
                >
                  {schedule.isActive ? "Pausar" : "Activar"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function WeekdaySelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: number;
  onChange: (day: number) => void;
}) {
  return (
    <label className="text-sm font-medium" htmlFor={id}>
      Día
      <select
        className="mt-1 block min-h-11 rounded-xl border border-foreground/15 bg-white px-3"
        id={id}
        onChange={(event) => onChange(Number(event.target.value))}
        value={value}
      >
        {WEEKDAYS.map((day, index) => (
          <option key={day} value={index + 1}>
            {day}
          </option>
        ))}
      </select>
    </label>
  );
}
