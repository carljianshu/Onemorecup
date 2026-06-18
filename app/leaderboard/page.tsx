"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
import { PublicFeatureNavLinks } from "@/components/PublicFeatureLinks";
import { formatScore } from "@/lib/score-format";
import { useLocale } from "@/context/LocaleContext";
import { useGame } from "@/context/GameContext";
import { MIN_PAGE1_PICKS, MIN_PAGE2_PICKS, MIN_PAGE3_PICKS, MIN_TOTAL_PICKS } from "@/data/markets";
import { computeMissingItemCount } from "@/lib/pick-stats";
import { promotionCutoffCount, showPromotionCutoffLine } from "@/lib/promotion";

function scoreClass(score: number) {
  if (score > 0) return "score-positive";
  if (score < 0) return "score-negative";
  return "score-zero";
}

export default function LeaderboardPage() {
  const { ready, markets, leaderboard } = useGame();
  const { t } = useLocale();
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!ready) {
    return (
      <main className="container">
        <p>{t("common.loading")}</p>
      </main>
    );
  }

  const promotionCount = promotionCutoffCount(leaderboard.length);
  const showPromotionCutoff = showPromotionCutoffLine(leaderboard.length);

  return (
    <main className="container">
      <nav className="nav-bar">
        <Link href="/">{t("common.backHome")}</Link>
        <PublicFeatureNavLinks />
        <Link href="/play">{t("common.play")}</Link>
      </nav>

      <h1 style={{ marginTop: 0 }}>{t("leaderboard.title")}</h1>

      {leaderboard.length === 0 ? (
        <div className="card">
          <p style={{ margin: 0, color: "var(--muted)" }}>{t("leaderboard.empty")}</p>
        </div>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("common.rank")}</th>
                <th>{t("common.player")}</th>
                <th>{t("common.page1Short")}</th>
                <th>{t("common.page2Short")}</th>
                <th>{t("common.page3Short")}</th>
                <th>{t("leaderboard.totalPicks")}</th>
                <th>{t("leaderboard.earning")}</th>
                <th>{t("leaderboard.settled")}</th>
                <th>{t("leaderboard.missing")}</th>
                <th>{t("leaderboard.details")}</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry, index) => (
                <Fragment key={entry.playerId}>
                  <tr>
                    <td>#{entry.rank}</td>
                    <td>{entry.name}</td>
                    <td>
                      {entry.pickStats.page1Count} / {MIN_PAGE1_PICKS}
                    </td>
                    <td>
                      {entry.pickStats.page2Count} / {MIN_PAGE2_PICKS}
                    </td>
                    <td>
                      {entry.pickStats.page3Count} / {MIN_PAGE3_PICKS}
                    </td>
                    <td>
                      {entry.pickStats.totalCount} / {MIN_TOTAL_PICKS}
                    </td>
                    <td className={scoreClass(entry.totalScore)}>{formatScore(entry.totalScore)}</td>
                    <td>
                      {entry.settledCount} / {entry.guessedCount}
                    </td>
                    <td>{computeMissingItemCount(entry.pickStats)}</td>
                    <td>
                      <button
                        type="button"
                        className="detail-toggle"
                        onClick={() =>
                          setExpanded(expanded === entry.playerId ? null : entry.playerId)
                        }
                      >
                        {expanded === entry.playerId
                          ? t("leaderboard.collapse")
                          : t("leaderboard.perMarket")}
                      </button>
                    </td>
                  </tr>
                  {expanded === entry.playerId && (
                    <tr className="submission-row">
                      <td colSpan={10}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem 1rem" }}>
                          {markets.map((market) => {
                            const score = entry.marketScores[market.id];
                            return (
                              <span key={market.id} className={scoreClass(score ?? 0)}>
                                {market.id}: {formatScore(score)}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  )}
                  {showPromotionCutoff && index === promotionCount - 1 && (
                    <tr className="leaderboard-cutoff-row">
                      <td colSpan={10}>
                        <div className="leaderboard-cutoff-line" aria-label={t("leaderboard.promotionZone")}>
                          <span>{t("leaderboard.promotionZone")}</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
