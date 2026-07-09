"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import { PublicFeatureNavLinks } from "@/components/PublicFeatureLinks";
import { formatPlayerDisplayName } from "@/lib/player-display";
import { formatEarningsDeduction, formatScore, formatScorePlain } from "@/lib/score-format";
import { useLocale } from "@/context/LocaleContext";
import { useGame } from "@/context/GameContext";
import { MIN_PAGE1_PICKS, MIN_PAGE2_PICKS, MIN_PAGE3_PICKS, MIN_TOTAL_PICKS } from "@/data/markets";
import { displayM1MarketColumnLabel } from "@/lib/fifa-codes";
import { promotionCutoffCount, showPromotionCutoffLine } from "@/lib/promotion";
import { isPlayerInRankLockBottomTier } from "@/lib/rank-lock";
import { computePlayerSharpeRatio } from "@/lib/player-sharpe-ratio";

function scoreClass(score: number) {
  if (score > 0) return "score-positive";
  if (score < 0) return "score-negative";
  return "score-zero";
}

export default function LeaderboardPage() {
  const { ready, markets, leaderboard, config, topTierBestRank, picks } = useGame();
  const { t, locale } = useLocale();
  const [expanded, setExpanded] = useState<string | null>(null);
  const sharpeByPlayerId = useMemo(() => {
    const map = new Map<string, number | null>();
    for (const entry of leaderboard) {
      map.set(
        entry.playerId,
        computePlayerSharpeRatio(entry.playerId, markets, picks, entry.marketScores)
      );
    }
    return map;
  }, [leaderboard, markets, picks]);

  if (!ready) {
    return (
      <main className="container container-wide">
        <p>{t("common.loading")}</p>
      </main>
    );
  }

  const promotionCount = promotionCutoffCount(leaderboard.length);
  const showPromotionCutoff = showPromotionCutoffLine(leaderboard.length);
  const showBestPossibleRank = Boolean(topTierBestRank);
  const tableColSpan = 9 + (showBestPossibleRank ? 1 : 0) + 1;

  return (
    <main className="container container-wide">
      <nav className="nav-bar">
        <Link href="/">{t("common.backHome")}</Link>
        <PublicFeatureNavLinks />
        <Link href="/play">{t("common.play")}</Link>
      </nav>

      <h1 style={{ marginTop: 0 }}>{t("leaderboard.title")}</h1>

      {showBestPossibleRank && topTierBestRank && (
        <p style={{ color: "var(--muted)", marginTop: 0 }}>
          {t("leaderboard.bestPossibleRankNote", {
            count: topTierBestRank.remainingScenarioCount
          })}
        </p>
      )}

      {leaderboard.length === 0 ? (
        <div className="card">
          <p style={{ margin: 0, color: "var(--muted)" }}>{t("leaderboard.empty")}</p>
        </div>
      ) : (
        <div className="card table-wrap">
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>{t("common.rank")}</th>
                <th>{t("common.player")}</th>
                <th>{t("common.page1Short")}</th>
                <th>{t("common.page2Short")}</th>
                <th>{t("leaderboard.phase12Picks")}</th>
                <th>{t("common.page3Short")}</th>
                <th>{t("leaderboard.settled")}</th>
                <th>{t("leaderboard.details")}</th>
                {showBestPossibleRank ? <th>{t("leaderboard.bestPossibleRank")}</th> : null}
                <th>{t("leaderboard.sharpeRatio")}</th>
                <th>{t("leaderboard.earning")}</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry, index) => (
                <Fragment key={entry.playerId}>
                  <tr>
                    <td>#{entry.rank}</td>
                    <td>{formatPlayerDisplayName(entry.name, entry)}</td>
                    <td>
                      {entry.pickStats.page1Count} / {MIN_PAGE1_PICKS}
                    </td>
                    <td>
                      {entry.pickStats.page2Count} / {MIN_PAGE2_PICKS}
                    </td>
                    <td>
                      {entry.pickStats.page1Count + entry.pickStats.page2Count} / {MIN_TOTAL_PICKS}
                    </td>
                    <td>
                      {entry.pickStats.page3Count} / {MIN_PAGE3_PICKS}
                    </td>
                    <td>
                      {entry.settledCount} / {entry.guessedCount}
                    </td>
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
                    {showBestPossibleRank ? (
                      <td>
                        {isPlayerInRankLockBottomTier(config, entry.playerId)
                          ? t("common.none")
                          : `#${topTierBestRank?.bestRankByPlayerId.get(entry.playerId) ?? entry.rank}`}
                      </td>
                    ) : null}
                    <td>
                      {(() => {
                        const sharpe = sharpeByPlayerId.get(entry.playerId);
                        return sharpe == null ? t("common.none") : formatScorePlain(sharpe);
                      })()}
                    </td>
                    <td className={scoreClass(entry.netEarnings)}>{formatScore(entry.netEarnings)}</td>
                  </tr>
                  {expanded === entry.playerId && (
                    <tr className="submission-row">
                      <td colSpan={tableColSpan}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem 1rem" }}>
                          {markets.map((market) => {
                            const score = entry.marketScores[market.id];
                            const label = displayM1MarketColumnLabel(
                              market.id,
                              market.candidates,
                              locale,
                              market.id
                            );
                            return (
                              <span key={market.id} className={scoreClass(score ?? 0)}>
                                {label}: {formatScore(score)}
                              </span>
                            );
                          })}
                          <span
                            className={
                              entry.pickPenalty > 0 ? "score-negative" : "score-zero"
                            }
                          >
                            {t("leaderboard.penaltyPhase12")}:{" "}
                            {formatEarningsDeduction(entry.pickPenalty)}
                          </span>
                          <span
                            className={
                              entry.pickPenaltyPage3 > 0 ? "score-negative" : "score-zero"
                            }
                          >
                            {t("leaderboard.penaltyPage3")}:{" "}
                            {formatEarningsDeduction(entry.pickPenaltyPage3)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                  {showPromotionCutoff && index === promotionCount - 1 && (
                    <tr className="leaderboard-cutoff-row">
                      <td colSpan={tableColSpan}>
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
