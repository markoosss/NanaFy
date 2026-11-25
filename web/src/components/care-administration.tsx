"use client";

import type { HouseholdProfile } from "@/components/profile-selection";
import { ActivationCodeManager } from "@/components/activation-code-manager";
import { CareScheduleManager } from "@/components/care-schedule-manager";

type CareAdministrationProps = {
  profiles: HouseholdProfile[];
};

export function CareAdministration({ profiles }: CareAdministrationProps) {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium text-foreground/55">
          Solo para Marcos
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Administración
        </h2>
      </div>
      <ActivationCodeManager profiles={profiles} />
      <CareScheduleManager />
    </div>
  );
}
