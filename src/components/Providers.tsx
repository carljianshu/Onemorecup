"use client";

import { GameProvider } from "@/context/GameContext";
import { LocaleProvider } from "@/context/LocaleContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { DocumentTitle } from "@/components/DocumentTitle";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <GameProvider>
        <DocumentTitle />
        <LanguageSwitcher />
        {children}
      </GameProvider>
    </LocaleProvider>
  );
}
