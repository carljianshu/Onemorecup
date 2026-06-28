"use client";

import { GameProvider } from "@/context/GameContext";
import { LocaleProvider } from "@/context/LocaleContext";
import { DocumentTitle } from "@/components/DocumentTitle";
import { SiteHeader } from "@/components/SiteHeader";
import type { Locale } from "@/i18n";

export function Providers({
  children,
  initialLocale,
  initialInferredTimezone = null
}: {
  children: React.ReactNode;
  initialLocale: Locale;
  initialInferredTimezone?: string | null;
}) {
  return (
    <LocaleProvider initialLocale={initialLocale} initialInferredTimezone={initialInferredTimezone}>
      <GameProvider>
        <DocumentTitle />
        <SiteHeader />
        {children}
      </GameProvider>
    </LocaleProvider>
  );
}
