"use client";

import { GameProvider } from "@/context/GameContext";
import { LocaleProvider } from "@/context/LocaleContext";
import { DocumentTitle } from "@/components/DocumentTitle";
import { SiteHeader } from "@/components/SiteHeader";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <GameProvider>
        <DocumentTitle />
        <SiteHeader />
        {children}
      </GameProvider>
    </LocaleProvider>
  );
}
