"use client";

import type { AuthenticatedProfile } from "@/lib/auth/session";
import type { DeviceMode } from "@/components/app-types";

type CareDashboardProps = {
  profile: AuthenticatedProfile;
  deviceMode: DeviceMode;
  error: string | null;
  onLogout: () => Promise<void>;
};

const careAreas = [
  {
    number: "01",
    title: "Alimentación",
    description: "Horarios claros y registro de cada toma.",
  },
  {
    number: "02",
    title: "Medicación",
    description: "Indicaciones y próximas tomas siempre a mano.",
  },
  {
    number: "03",
    title: "Tareas extra",
    description: "Arenero, agua y otras tareas de cuidado.",
  },
  {
    number: "04",
    title: "Calendario y notas",
    description: "Citas, revisiones y apuntes compartidos.",
  },
];

export function CareDashboard({
  profile,
  deviceMode,
  error,
  onLogout,
}: CareDashboardProps) {
  const isMobilePresentation = deviceMode === "mobile";

  return (
    <div
      className={`mx-auto flex min-h-[calc(100vh-2.5rem)] w-full flex-col ${
        isMobilePresentation ? "max-w-xl" : "max-w-6xl"
      }`}
      data-device-mode={deviceMode}
    >
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 font-semibold tracking-tight">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-foreground text-sm text-background">
            NF
          </span>
          <span className="text-xl">NanaFy</span>
        </div>
        <div className="flex items-center gap-3">
          <p className="hidden text-right text-sm text-foreground/60 sm:block">
            {profile.displayName}
          </p>
          <button
            className="rounded-full border border-foreground/15 px-4 py-2 text-sm font-medium transition hover:border-foreground/35"
            onClick={onLogout}
            type="button"
          >
            Salir
          </button>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        <section className="mt-8 grid gap-8 overflow-hidden rounded-[2rem] bg-foreground px-6 py-10 text-background sm:mt-12 sm:px-12 sm:py-14 lg:grid-cols-[1.4fr_0.6fr] lg:items-end">
          <div className="max-w-2xl">
            <p className="mb-5 text-sm font-medium uppercase tracking-[0.2em] text-lime-200">
              Una rutina compartida
            </p>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
              Todo lo que necesita,{" "}
              <span className="text-lime-200">en un solo lugar.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-background/75 sm:text-lg">
              Hola, {profile.displayName}. Aquí podrás coordinar su
              alimentación, medicación, tareas y citas.
            </p>
          </div>
          <div className="rounded-3xl border border-background/15 bg-background/5 p-5 sm:p-6">
            <p className="text-sm text-background/60">Presentación de sesión</p>
            <p className="mt-2 text-lg font-medium">
              {isMobilePresentation ? "Móvil" : "Ordenador"}
            </p>
            <p className="mt-2 text-sm leading-6 text-background/70">
              Puedes cambiar de dispositivo la próxima vez que inicies sesión.
            </p>
          </div>
        </section>

        {error ? (
          <p className="mt-4 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}

        <section aria-labelledby="care-areas-title" className="py-10 sm:py-14">
          <div className="mb-6 flex flex-col gap-2 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground/55">
                Todo organizado
              </p>
              <h2
                className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl"
                id="care-areas-title"
              >
                Sus cuidados, de un vistazo
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-foreground/60">
              Horarios e información compartidos para que nadie tenga que
              recordar todo por su cuenta.
            </p>
          </div>

          <div
            className={`grid gap-3 ${
              isMobilePresentation
                ? "grid-cols-1"
                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
            }`}
          >
            {careAreas.map((area) => (
              <article
                className="rounded-3xl border border-foreground/10 bg-white/70 p-5 sm:p-6"
                key={area.number}
              >
                <p className="text-xs font-semibold tracking-[0.16em] text-foreground/45">
                  {area.number}
                </p>
                <h3 className="mt-8 text-lg font-semibold">{area.title}</h3>
                <p className="mt-2 text-sm leading-6 text-foreground/60">
                  {area.description}
                </p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-foreground/10 py-5 text-sm text-foreground/50">
        NanaFy · Cuidado compartido, todos los días
      </footer>
    </div>
  );
}
