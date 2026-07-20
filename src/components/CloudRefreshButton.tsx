"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { useGame } from "@/context/GameContext";
import { useLocale } from "@/context/LocaleContext";
import { pathNeedsLiveSync } from "@/lib/leaderboard-poll";

export function CloudRefreshButton() {
  const pathname = usePathname();
  const { apiSync, refreshFromCloud } = useGame();
  const { t } = useLocale();
  const [busy, setBusy] = useState(false);

  if (!apiSync || !pathNeedsLiveSync(pathname)) {
    return null;
  }

  async function handleClick() {
    setBusy(true);
    try {
      await refreshFromCloud();
    } catch {
      window.alert(t("common.refreshFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" className="btn btn-secondary btn-sm" onClick={handleClick} disabled={busy}>
      {busy ? t("common.refreshing") : t("common.refresh")}
    </button>
  );
}
