"use client";

import { useEffect, useState } from "react";
import type { AuthenticatedProfile, ProfileRole } from "@/lib/auth/session";
import { isRecord } from "@/lib/http/json";
import { CareDashboard } from "@/components/care-dashboard";
import { DeviceChoice } from "@/components/device-choice";
import type { DeviceMode } from "@/components/app-types";
import { PasswordLogin } from "@/components/password-login";
import {
  ProfileSelection,
  type HouseholdProfile,
} from "@/components/profile-selection";

type Screen = "profiles" | "password" | "device" | "app";

function isProfileRole(value: unknown): value is ProfileRole {
  return value === "admin" || value === "family" || value === "guest";
}

function isHouseholdProfile(value: unknown): value is HouseholdProfile {
  return (
    isRecord(value) &&
    typeof value.profileKey === "string" &&
    typeof value.displayName === "string" &&
    typeof value.isActivated === "boolean"
  );
}

function parseProfiles(value: unknown): HouseholdProfile[] {
  if (!isRecord(value) || !Array.isArray(value.profiles)) {
    throw new Error("La respuesta de perfiles no tiene un formato válido.");
  }

  if (!value.profiles.every(isHouseholdProfile)) {
    throw new Error("La lista de perfiles contiene datos no válidos.");
  }

  return value.profiles;
}

function parseAuthenticatedProfile(value: unknown): AuthenticatedProfile {
  if (
    !isRecord(value) ||
    typeof value.profileKey !== "string" ||
    typeof value.displayName !== "string" ||
    !isProfileRole(value.role)
  ) {
    throw new Error("La respuesta de sesión no tiene un formato válido.");
  }

  return {
    profileKey: value.profileKey,
    displayName: value.displayName,
    role: value.role,
  };
}

async function getResponseError(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const body: unknown = await response.json();
    return isRecord(body) && typeof body.error === "string"
      ? body.error
      : fallback;
  } catch {
    return fallback;
  }
}

export function NanaFyApp() {
  const [profiles, setProfiles] = useState<HouseholdProfile[]>([]);
  const [selectedProfile, setSelectedProfile] =
    useState<HouseholdProfile | null>(null);
  const [authenticatedProfile, setAuthenticatedProfile] =
    useState<AuthenticatedProfile | null>(null);
  const [deviceMode, setDeviceMode] = useState<DeviceMode | null>(null);
  const [screen, setScreen] = useState<Screen>("profiles");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadAppState() {
      setIsLoading(true);
      setPageError(null);

      try {
        const [profilesResponse, sessionResponse] = await Promise.all([
          fetch("/api/profiles", { cache: "no-store" }),
          fetch("/api/auth/session", { cache: "no-store" }),
        ]);

        if (!profilesResponse.ok) {
          throw new Error(
            await getResponseError(
              profilesResponse,
              "No se pudieron cargar los perfiles.",
            ),
          );
        }

        const profilesPayload: unknown = await profilesResponse.json();
        const loadedProfiles = parseProfiles(profilesPayload);
        let currentProfile: AuthenticatedProfile | null = null;

        if (sessionResponse.ok) {
          const sessionPayload: unknown = await sessionResponse.json();
          if (!isRecord(sessionPayload)) {
            throw new Error("La respuesta de sesión no tiene un formato válido.");
          }

          currentProfile = parseAuthenticatedProfile(sessionPayload.profile);
        } else if (sessionResponse.status !== 401) {
          throw new Error(
            await getResponseError(
              sessionResponse,
              "No se pudo comprobar la sesión.",
            ),
          );
        }

        if (!active) {
          return;
        }

        setProfiles(loadedProfiles);

        if (currentProfile) {
          setAuthenticatedProfile(currentProfile);
          setSelectedProfile(
            loadedProfiles.find(
              (profile) => profile.profileKey === currentProfile?.profileKey,
            ) ?? null,
          );
          setScreen("device");
        }
      } catch (error) {
        if (active) {
          setPageError(
            error instanceof Error
              ? error.message
              : "No se pudieron cargar los datos de inicio.",
          );
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadAppState();

    return () => {
      active = false;
    };
  }, [reloadKey]);

  async function handleLogin(password: string) {
    if (!selectedProfile) {
      return;
    }

    setIsSubmitting(true);
    setActionError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileKey: selectedProfile.profileKey,
          password,
        }),
      });

      if (!response.ok) {
        setActionError(
          await getResponseError(response, "No se pudo iniciar sesión."),
        );
        return;
      }

      const body: unknown = await response.json();
      if (!isRecord(body)) {
        throw new Error("La respuesta de inicio de sesión no es válida.");
      }

      const profile = parseAuthenticatedProfile(body.profile);
      setAuthenticatedProfile(profile);
      setScreen("device");
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "No se pudo iniciar sesión.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogout() {
    setActionError(null);

    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        setActionError(
          await getResponseError(response, "No se pudo cerrar la sesión."),
        );
        return;
      }

      setAuthenticatedProfile(null);
      setSelectedProfile(null);
      setDeviceMode(null);
      setScreen("profiles");
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "No se pudo cerrar la sesión.",
      );
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-5">
        <p aria-live="polite" className="text-sm text-foreground/60">
          Preparando NanaFy...
        </p>
      </main>
    );
  }

  if (pageError) {
    return (
      <main className="flex min-h-screen items-center justify-center px-5 py-10">
        <section
          aria-labelledby="startup-error-title"
          className="w-full max-w-lg rounded-[2rem] border border-foreground/10 bg-white/80 p-6 shadow-sm sm:p-9"
        >
          <p className="text-sm font-medium text-foreground/55">NanaFy</p>
          <h1
            className="mt-2 text-2xl font-semibold tracking-tight"
            id="startup-error-title"
          >
            No se pudo cargar la app
          </h1>
          <p className="mt-3 text-sm leading-6 text-foreground/65" role="alert">
            {pageError}
          </p>
          <button
            className="mt-6 min-h-12 rounded-xl bg-foreground px-5 font-semibold text-background"
            onClick={() => setReloadKey((key) => key + 1)}
            type="button"
          >
            Volver a intentar
          </button>
        </section>
      </main>
    );
  }

  if (screen === "app" && authenticatedProfile && deviceMode) {
    return (
      <main className="min-h-screen px-5 py-5 sm:px-8 sm:py-8">
        <CareDashboard
          deviceMode={deviceMode}
          error={actionError}
          onLogout={handleLogout}
          profile={authenticatedProfile}
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen px-5 py-5 sm:px-8 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-6xl flex-col sm:min-h-[calc(100vh-4rem)]">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 font-semibold tracking-tight">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-foreground text-sm text-background">
              NF
            </span>
            <span className="text-xl">NanaFy</span>
          </div>
          <p className="text-right text-sm text-foreground/60">
            El cuidado, en familia
          </p>
        </header>

        <div className="flex flex-1 items-center py-10">
          {screen === "profiles" ? (
            <ProfileSelection
              onSelect={(profile) => {
                setSelectedProfile(profile);
                setActionError(null);
                setScreen("password");
              }}
              profiles={profiles}
            />
          ) : null}

          {screen === "password" && selectedProfile ? (
            selectedProfile.isActivated ? (
              <PasswordLogin
                error={actionError}
                isSubmitting={isSubmitting}
                onBack={() => {
                  setActionError(null);
                  setSelectedProfile(null);
                  setScreen("profiles");
                }}
                onSubmit={handleLogin}
                profile={selectedProfile}
              />
            ) : (
              <section className="mx-auto w-full max-w-lg rounded-[2rem] border border-foreground/10 bg-white/80 p-6 shadow-sm sm:p-9">
                <h1 className="text-2xl font-semibold tracking-tight">
                  Perfil pendiente de activación
                </h1>
                <p className="mt-3 text-sm leading-6 text-foreground/60">
                  Pide a Marcos un código para activar el perfil de{" "}
                  {selectedProfile.displayName}.
                </p>
                <button
                  className="mt-6 min-h-12 rounded-xl border border-foreground/15 px-5 font-medium"
                  onClick={() => {
                    setSelectedProfile(null);
                    setScreen("profiles");
                  }}
                  type="button"
                >
                  Volver a perfiles
                </button>
              </section>
            )
          ) : null}

          {screen === "device" && authenticatedProfile ? (
            <DeviceChoice
              displayName={authenticatedProfile.displayName}
              error={actionError}
              onLogout={handleLogout}
              onChoose={(mode) => {
                setDeviceMode(mode);
                setActionError(null);
                setScreen("app");
              }}
            />
          ) : null}
        </div>

        <footer className="border-t border-foreground/10 py-5 text-sm text-foreground/50">
          NanaFy · Cuidado compartido, todos los días
        </footer>
      </div>
    </main>
  );
}
