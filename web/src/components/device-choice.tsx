"use client";

import type { DeviceMode } from "@/components/app-types";

type DeviceChoiceProps = {
  displayName: string;
  error: string | null;
  onLogout: () => Promise<void>;
  onChoose: (mode: DeviceMode) => void;
};

const deviceModes: { mode: DeviceMode; title: string; description: string }[] = [
  {
    mode: "mobile",
    title: "Móvil",
    description: "Una vista cómoda para llevar los cuidados contigo.",
  },
  {
    mode: "pc",
    title: "Ordenador",
    description: "Más espacio para consultar la información de un vistazo.",
  },
];

export function DeviceChoice({
  displayName,
  error,
  onChoose,
  onLogout,
}: DeviceChoiceProps) {
  return (
    <section
      aria-labelledby="device-choice-title"
      className="mx-auto w-full max-w-2xl rounded-[2rem] border border-foreground/10 bg-white/80 p-6 shadow-sm sm:p-9"
    >
      <p className="text-sm font-medium text-foreground/55">
        Sesión de {displayName}
      </p>
      <h1
        className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl"
        id="device-choice-title"
      >
        ¿Desde dónde usarás NanaFy?
      </h1>
      <p className="mt-3 text-sm leading-6 text-foreground/60 sm:text-base">
        Elige la presentación para esta sesión.
      </p>

      {error ? (
        <p className="mt-5 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        {deviceModes.map((device) => (
          <button
            className="min-h-36 rounded-2xl border border-foreground/10 bg-background p-5 text-left transition hover:border-foreground/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
            key={device.mode}
            onClick={() => onChoose(device.mode)}
            type="button"
          >
            <span className="block text-lg font-semibold">{device.title}</span>
            <span className="mt-2 block text-sm leading-6 text-foreground/60">
              {device.description}
            </span>
          </button>
        ))}
      </div>
      <button
        className="mt-6 text-sm font-medium text-foreground/60 underline-offset-4 hover:text-foreground hover:underline"
        onClick={onLogout}
        type="button"
      >
        Cerrar sesión
      </button>
    </section>
  );
}
