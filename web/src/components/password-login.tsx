"use client";

import { useState, type FormEvent } from "react";
import type { HouseholdProfile } from "@/components/profile-selection";

type PasswordLoginProps = {
  profile: HouseholdProfile;
  error: string | null;
  isSubmitting: boolean;
  onBack: () => void;
  onSubmit: (password: string) => Promise<void>;
};

export function PasswordLogin({
  profile,
  error,
  isSubmitting,
  onBack,
  onSubmit,
}: PasswordLoginProps) {
  const [password, setPassword] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(password);
  }

  return (
    <section
      aria-labelledby="password-login-title"
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
        Perfil seleccionado
      </p>
      <h1
        className="mt-1 text-3xl font-semibold tracking-tight"
        id="password-login-title"
      >
        Hola, {profile.displayName}
      </h1>
      <p className="mt-3 text-sm leading-6 text-foreground/60">
        Introduce tu contraseña para continuar.
      </p>

      <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
        <label className="block text-sm font-medium" htmlFor="profile-password">
          Contraseña
          <input
            autoComplete="current-password"
            autoFocus
            className="mt-2 min-h-12 w-full rounded-xl border border-foreground/15 bg-background px-4 text-base outline-none transition focus:border-foreground/50 focus:ring-2 focus:ring-foreground/10"
            id="profile-password"
            minLength={10}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
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
          {isSubmitting ? "Comprobando..." : "Continuar"}
        </button>
      </form>
    </section>
  );
}
