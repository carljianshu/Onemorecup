"use client";

import { GameProvider } from "@/context/GameContext";
import { LocaleProvider } from "@/context/LocaleContext";
import { DocumentTitle } from "@/components/DocumentTitle";
import { SiteHeader } from "@/components/SiteHeader";
import type { Locale } from "@/i18n";

export function Providers({
  children,
  initialLocale
}: {
  children: React.ReactNode;
  initialLocale: Locale;
}) {
  return (
    <LocaleProvider initialLocale={initialLocale}>
      <GameProvider>
        <DocumentTitle />
        <SiteHeader />
        {children}
      </GameProvider>
    </LocaleProvider>
  );
}
