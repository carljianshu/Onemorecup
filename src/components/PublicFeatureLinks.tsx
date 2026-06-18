"use client";

import Link from "next/link";
import { useGame } from "@/context/GameContext";
import { useLocale } from "@/context/LocaleContext";
import { isAnswersAnyPublic } from "@/lib/public-features";

export function PublicFeatureLinks({ className }: { className?: string }) {
  const { ready, config } = useGame();
  const { t } = useLocale();

  if (!ready) return null;

  return (
    <>
      <Link className={className ?? "btn btn-secondary"} href="/leaderboard">
        {t("common.viewLeaderboard")}
      </Link>
      {isAnswersAnyPublic(config) && (
        <Link className={className ?? "btn btn-secondary"} href="/answers">
          {t("common.answers")}
        </Link>
      )}
      {isAnswersAnyPublic(config) && (
        <Link className={className ?? "btn btn-secondary"} href="/market-results">
          {t("common.marketResults")}
        </Link>
      )}
    </>
  );
}

export function PublicFeatureNavLinks() {
  const { ready, config } = useGame();
  const { t } = useLocale();

  if (!ready) return null;

  return (
    <>
      <Link href="/leaderboard">{t("common.leaderboard")}</Link>
      {isAnswersAnyPublic(config) && <Link href="/answers">{t("common.answers")}</Link>}
      {isAnswersAnyPublic(config) && (
        <Link href="/market-results">{t("common.marketResults")}</Link>
      )}
    </>
  );
}
