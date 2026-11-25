"use client";

import { useState } from "react";
import type { AuthenticatedProfile } from "@/lib/auth/session";
import type { DeviceMode } from "@/components/app-types";
import type { HouseholdProfile } from "@/components/profile-selection";
import { CareCalendar } from "@/components/care-calendar";
import { CareHistory } from "@/components/care-history";
import { CareNotes } from "@/components/care-notes";
import { CareScheduleSection } from "@/components/care-schedule-section";
import { CareAdministration } from "@/components/care-administration";

type CareDashboardProps = {
  profile: AuthenticatedProfile;
  profiles: HouseholdProfile[];
  deviceMode: DeviceMode;
  error: string | null;
  onLogout: () => Promise<void>;
};

type SectionId =
  | "today"
  | "medications"
  | "calendar"
  | "notes"
  | "history"
  | "administration";

const sections: { id: SectionId; title: string; roles: string[] }[] = [
  { id: "today", title: "Hoy", roles: ["admin", "family", "guest"] },
  { id: "medications", title: "Medicación", roles: ["admin", "family", "guest"] },
  { id: "calendar", title: "Calendario", roles: ["admin", "family", "guest"] },
  { id: "notes", title: "Notas", roles: ["admin", "family"] },
  { id: "history", title: "Historial", roles: ["admin", "family", "guest"] },
  { id: "administration", title: "Administrar", roles: ["admin"] },
];

export function CareDashboard({
  profile,
  profiles,
  deviceMode,
  error,
  onLogout,
}: CareDashboardProps) {
  const [activeSection, setActiveSection] = useState<SectionId>("today");
  const visibleSections = sections.filter((section) =>
    section.roles.includes(profile.role),
  );
  const isMobilePresentation = deviceMode === "mobile";

  return (
    <div
      className={`mx-auto flex min-h-[calc(100vh-2.5rem)] w-full flex-col ${
        isMobilePresentation ? "max-w-3xl" : "max-w-6xl"
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
            className="min-h-10 rounded-full border border-foreground/15 px-4 py-2 text-sm font-medium transition hover:border-foreground/35"
            onClick={onLogout}
            type="button"
          >
            Salir
          </button>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        <section className="mt-7 flex flex-col gap-5 rounded-[2rem] bg-foreground px-6 py-7 text-background sm:mt-10 sm:flex-row sm:items-end sm:justify-between sm:px-10 sm:py-9">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-lime-200">
              Una rutina compartida
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-5xl">
              Hola, {profile.displayName}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-background/75 sm:text-base">
              Alimentación, medicación, tareas y citas de Kiro, en un solo lugar.
            </p>
          </div>
          <p className="shrink-0 rounded-2xl border border-background/15 bg-background/5 px-4 py-3 text-sm text-background/75">
            Sesión en {isMobilePresentation ? "móvil" : "ordenador"}
          </p>
        </section>

        {error ? (
          <p className="mt-4 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}

        <nav
          aria-label="Secciones de cuidados"
          className="-mx-5 mt-6 flex gap-2 overflow-x-auto px-5 pb-2 sm:mx-0 sm:mt-8 sm:flex-wrap sm:overflow-visible sm:px-0"
        >
          {visibleSections.map((section) => (
            <button
              aria-current={activeSection === section.id ? "page" : undefined}
              className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold transition ${
                activeSection === section.id
                  ? "bg-foreground text-background"
                  : "border border-foreground/10 bg-white/70 hover:border-foreground/30"
              }`}
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              type="button"
            >
              {section.title}
            </button>
          ))}
        </nav>

        <section className="flex-1 py-6 sm:py-8">
          {activeSection === "today" ? (
            <CareScheduleSection
              mode="today"
              profile={profile}
              profiles={profiles}
            />
          ) : null}
          {activeSection === "medications" ? (
            <CareScheduleSection
              mode="medications"
              profile={profile}
              profiles={profiles}
            />
          ) : null}
          {activeSection === "calendar" ? <CareCalendar profile={profile} /> : null}
          {activeSection === "notes" ? <CareNotes profiles={profiles} /> : null}
          {activeSection === "history" ? <CareHistory /> : null}
          {activeSection === "administration" && profile.role === "admin" ? (
            <CareAdministration profiles={profiles} />
          ) : null}
        </section>
      </main>

      <footer className="border-t border-foreground/10 py-5 text-sm text-foreground/50">
        NanaFy · Cuidado compartido, todos los días
      </footer>
    </div>
  );
}
