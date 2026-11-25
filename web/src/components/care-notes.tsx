"use client";

import { useEffect, useState, type FormEvent } from "react";
import { parseCareNotes, type CareNote } from "@/components/care-data";
import type { HouseholdProfile } from "@/components/profile-selection";
import { requestJson } from "@/lib/http/client";

type CareNotesProps = {
  profiles: HouseholdProfile[];
};

function formatCreatedAt(value: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function CareNotes({ profiles }: CareNotesProps) {
  const [notes, setNotes] = useState<CareNote[]>([]);
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    async function loadNotes() {
      setIsLoading(true);
      setError(null);
      try {
        const payload = await requestJson("/api/care/notes");
        if (active) {
          setNotes(parseCareNotes(payload));
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudieron cargar las notas.",
          );
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadNotes();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      await requestJson("/api/care/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      setContent("");
      setReloadKey((key) => key + 1);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "No se pudo guardar la nota.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <p className="text-sm font-medium text-foreground/55">
        Apuntes compartidos
      </p>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
        Notas de Kiro
      </h2>

      <form
        className="mt-5 rounded-2xl border border-foreground/10 bg-white/80 p-4 sm:p-5"
        onSubmit={(event) => void handleSubmit(event)}
      >
        <label className="block text-sm font-medium" htmlFor="care-note">
          Añadir un apunte
          <textarea
            className="mt-2 min-h-28 w-full rounded-xl border border-foreground/15 bg-background p-3 text-base"
            id="care-note"
            maxLength={2000}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Por ejemplo: hoy ha comido menos de lo habitual..."
            required
            value={content}
          />
        </label>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-foreground/50">
            {content.length}/2000 caracteres
          </span>
          <button
            className="min-h-11 rounded-xl bg-foreground px-4 text-sm font-semibold text-background disabled:opacity-60"
            disabled={isSaving}
            type="submit"
          >
            {isSaving ? "Guardando..." : "Guardar nota"}
          </button>
        </div>
      </form>

      {error ? (
        <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}
      {isLoading ? (
        <p aria-live="polite" className="mt-5 text-sm text-foreground/60">
          Cargando notas...
        </p>
      ) : notes.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-foreground/10 bg-white/70 p-5 text-sm text-foreground/60">
          Todavía no hay notas compartidas.
        </p>
      ) : (
        <ul className="mt-5 grid gap-3 lg:grid-cols-2">
          {notes.map((note) => (
            <li
              className="rounded-2xl border border-foreground/10 bg-white/80 p-5"
              key={note.id}
            >
              <p className="whitespace-pre-wrap text-sm leading-6">{note.content}</p>
              <p className="mt-4 text-xs text-foreground/50">
                {profiles.find((profile) => profile.profileKey === note.createdBy)
                  ?.displayName ?? note.createdBy}{" "}
                · {formatCreatedAt(note.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
