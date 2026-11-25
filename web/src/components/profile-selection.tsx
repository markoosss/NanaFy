"use client";

export type HouseholdProfile = {
  profileKey: string;
  displayName: string;
  isActivated: boolean;
};

type ProfileSelectionProps = {
  profiles: HouseholdProfile[];
  onSelect: (profile: HouseholdProfile) => void;
};

export function ProfileSelection({
  profiles,
  onSelect,
}: ProfileSelectionProps) {
  return (
    <section
      aria-labelledby="profile-selection-title"
      className="mx-auto w-full max-w-2xl rounded-[2rem] border border-foreground/10 bg-white/80 p-6 shadow-sm sm:p-9"
    >
      <p className="text-sm font-medium text-foreground/55">Bienvenidos</p>
      <h1
        className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl"
        id="profile-selection-title"
      >
        ¿Quién va a cuidar de Kiro?
      </h1>
      <p className="mt-3 text-sm leading-6 text-foreground/60 sm:text-base">
        Elige tu perfil para continuar.
      </p>

      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        {profiles.map((profile) => (
          <button
            className="flex min-h-20 items-center justify-between gap-4 rounded-2xl border border-foreground/10 bg-background px-5 py-4 text-left transition hover:border-foreground/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
            key={profile.profileKey}
            onClick={() => onSelect(profile)}
            type="button"
          >
            <span className="font-semibold">{profile.displayName}</span>
            <span className="text-right text-xs text-foreground/55">
              {profile.isActivated ? "Entrar" : "Pendiente de activación"}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
