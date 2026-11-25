"use client";

import { useState, type FormEvent } from "react";
import type { HouseholdProfile } from "@/components/profile-selection";
import { requestJson } from "@/lib/http/client";
import { isRecord } from "@/lib/http/json";

type ActivationCodeManagerProps = {
  profiles: HouseholdProfile[];
};

type IssuedCode = {
  displayName: string;
  code: string;
  expiresAt: string;
};

export function ActivationCodeManager({
  profiles,
}: ActivationCodeManagerProps) {
  const eligibleProfiles = profiles.filter(
    (profile) => profile.profileKey !== "marcos" && !profile.isActivated,
  );
  const [profileKey, setProfileKey] = useState(
    eligibleProfiles[0]?.profileKey ?? "",
  );
  const [issuedCode, setIssuedCode] = useState<IssuedCode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIssuedCode(null);
    setIsSubmitting(true);
    try {
      const payload = await requestJson("/api/admin/activation-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileKey }),
      });
      if (
        !isRecord(payload) ||
        typeof payload.profileKey !== "string" ||
        typeof payload.activationCode !== "string" ||
        typeof payload.expiresAt !== "string"
      ) {
        throw new Error("La respuesta del código de activación no es válida.");
      }

      const target = profiles.find(
        (profile) => profile.profileKey === payload.profileKey,
      );
      if (!target) {
        throw new Error("No se encontró el perfil asociado al código.");
      }

      setIssuedCode({
        displayName: target.displayName,
        code: payload.activationCode,
        expiresAt: payload.expiresAt,
      });
    } catch (issueError) {
      setError(
        issueError instanceof Error
          ? issueError.message
          : "No se pudo crear el código.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-foreground/10 bg-white/80 p-5">
      <h3 className="text-lg font-semibold">Activar un perfil</h3>
      <p className="mt-1 text-sm leading-6 text-foreground/60">
        El código se muestra una sola vez. Compártelo en privado; caduca en 24
        horas.
      </p>
      {eligibleProfiles.length > 0 ? (
        <form
          className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <label className="text-sm font-medium" htmlFor="activation-profile">
            Perfil
            <select
              className="mt-1 block min-h-11 w-full rounded-xl border border-foreground/15 bg-background px-3 sm:min-w-52"
              id="activation-profile"
              onChange={(event) => setProfileKey(event.target.value)}
              required
              value={profileKey}
            >
              {eligibleProfiles.map((profile) => (
                <option key={profile.profileKey} value={profile.profileKey}>
                  {profile.displayName}
                </option>
              ))}
            </select>
          </label>
          <button
            className="min-h-11 rounded-xl bg-foreground px-4 text-sm font-semibold text-background disabled:opacity-60"
            disabled={isSubmitting || !profileKey}
            type="submit"
          >
            {isSubmitting ? "Creando..." : "Generar código"}
          </button>
        </form>
      ) : (
        <p className="mt-4 text-sm text-foreground/60">
          Todos los perfiles ya están activados.
        </p>
      )}
      {error ? (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {issuedCode ? (
        <div className="mt-4 rounded-xl border border-lime-800/20 bg-lime-50 p-4">
          <p className="text-sm font-semibold">
            Código para {issuedCode.displayName}
          </p>
          <output className="mt-2 block break-all rounded-lg bg-white px-3 py-3 font-mono text-lg">
            {issuedCode.code}
          </output>
          <p className="mt-2 text-xs text-foreground/60">
            Válido hasta{" "}
            {new Intl.DateTimeFormat("es-ES", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(new Date(issuedCode.expiresAt))}
          </p>
        </div>
      ) : null}
    </section>
  );
}
