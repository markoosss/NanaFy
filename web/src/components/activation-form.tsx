"use client";

import { useState, type FormEvent } from "react";
import type { HouseholdProfile } from "@/components/profile-selection";
import { requestJson } from "@/lib/http/client";

type ActivationFormProps = {
  profile: HouseholdProfile;
  onBack: () => void;
  onActivated: (password: string) => Promise<void>;
};

export function ActivationForm({
  profile,
  onBack,
  onActivated,
}: ActivationFormProps) {
  const [activationCode, setActivationCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setIsSubmitting(true);
    try {
      await requestJson("/api/auth/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileKey: profile.profileKey,
          activationCode,
          password,
        }),
      });
      await onActivated(password);
    } catch (activationError) {
      setError(
        activationError instanceof Error
          ? activationError.message
          : "No se pudo activar el perfil.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section
      aria-labelledby="activation-title"
      className="mx-auto w-full max-w-lg rounded-[2rem] border border-foreground/10 bg-white/80 p-6 shadow-sm sm:p-9"
    >
      <button
        className="text-sm font-medium text-foreground/60 underline-offset-4 hover:text-foreground hover:underline"
        onClick={onBack}
        type="button"
      >
        Cambiar perfil
      </button>
      <p className="mt-7 text-sm font-medium text-foreground/55">
        Primer acceso
      </p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight" id="activation-title">
        Activar {profile.displayName}
      </h1>
      <p className="mt-3 text-sm leading-6 text-foreground/60">
        Introduce el código de un solo uso de Marcos y crea una contraseña
        personal.
      </p>

      <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
        <label className="block text-sm font-medium" htmlFor="activation-code">
          Código de activación
          <input
            autoComplete="one-time-code"
            className="mt-2 min-h-12 w-full rounded-xl border border-foreground/15 bg-background px-4 text-base outline-none focus:border-foreground/50 focus:ring-2 focus:ring-foreground/10"
            id="activation-code"
            onChange={(event) => setActivationCode(event.target.value)}
            required
            value={activationCode}
          />
        </label>
        <label className="block text-sm font-medium" htmlFor="new-password">
          Nueva contraseña
          <input
            autoComplete="new-password"
            className="mt-2 min-h-12 w-full rounded-xl border border-foreground/15 bg-background px-4 text-base outline-none focus:border-foreground/50 focus:ring-2 focus:ring-foreground/10"
            id="new-password"
            minLength={10}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>
        <label className="block text-sm font-medium" htmlFor="confirm-password">
          Repite la contraseña
          <input
            autoComplete="new-password"
            className="mt-2 min-h-12 w-full rounded-xl border border-foreground/15 bg-background px-4 text-base outline-none focus:border-foreground/50 focus:ring-2 focus:ring-foreground/10"
            id="confirm-password"
            minLength={10}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            type="password"
            value={confirmPassword}
          />
        </label>

        {error ? (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}

        <button
          className="min-h-12 w-full rounded-xl bg-foreground px-5 font-semibold text-background transition hover:bg-foreground/90 disabled:cursor-wait disabled:opacity-70"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Activando..." : "Activar perfil"}
        </button>
      </form>
    </section>
  );
}
