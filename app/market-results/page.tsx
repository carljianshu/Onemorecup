"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PublicFeatureNavLinks } from "@/components/PublicFeatureLinks";
import { useLocale } from "@/context/LocaleContext";
import { useGame } from "@/context/GameContext";
import { buildMarketResultSections, formatScore } from "@/lib/market-results";
import { isAnswersAnyPublic, isAnswersPagePublic } from "@/lib/public-features";
import type { MarketResultPick } from "@/lib/market-results";
import type { TranslationValues } from "@/i18n";
import type { PlayPage } from "@/types";

type ViewFilter = "all" | PlayPage;

function formatSignedScore(value: number) {
  const formatted = formatScore(Math.abs(value));
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
}

function scoreClassName(value: number) {
  if (value > 0) return "market-result-score market-result-score-positive";
  if (value < 0) return "market-result-score market-result-score-negative";
  return "market-result-score";
}

function PlayerPayout({
  pick,
  settled,
  t
}: {
  pick: MarketResultPick;
  settled: boolean;
  t: (key: string, vars?: TranslationValues) => string;
}) {
  const showActual = settled && pick.actualPayout !== null;
  const amount = showActual ? pick.actualPayout! : pick.ifCorrectPayout;
  const labelKey = showActual ? "marketResults.actualScore" : "marketResults.ifCorrect";

  return (
    <span className={scoreClassName(amount)}>
      {t(labelKey, { amount: formatSignedScore(amount) })}
      {pick.isDouble && <span className="pick-double-badge">{t("common.double")}</span>}
    </span>
  );
}

export default function MarketResultsPage() {
  const { ready, config, players, markets, picks } = useGame();
  const { t } = useLocale();
  const [filter, setFilter] = useState<ViewFilter>("all");

  const page1Public = ready && isAnswersPagePublic(config, 1);
  const page2Public = ready && isAnswersPagePublic(config, 2);
  const showAllFilter = page1Public && page2Public;

  const visiblePages = useMemo(() => {
    const pages: PlayPage[] = [];
    if (page1Public) pages.push(1);
    if (page2Public) pages.push(2);
    return pages;
  }, [page1Public, page2Public]);

  useEffect(() => {
    if (!ready) return;
    if (filter === 1 && !page1Public) {
      setFilter(page2Public ? 2 : "all");
    } else if (filter === 2 && !page2Public) {
      setFilter(page1Public ? 1 : "all");
    } else if (filter === "all" && page1Public && !page2Public) {
      setFilter(1);
    } else if (filter === "all" && page2Public && !page1Public) {
      setFilter(2);
    }
  }, [ready, filter, page1Public, page2Public]);

  const sections = useMemo(() => {
    const all = buildMarketResultSections(markets, picks, players, visiblePages);
    if (filter === "all") return all;
    return all.filter((section) => section.page === filter);
  }, [markets, picks, players, visiblePages, filter]);

  const filterOptions = useMemo(() => {
    const options: { value: ViewFilter; label: string }[] = [];
    if (showAllFilter) options.push({ value: "all", label: t("common.filterAll") });
    if (page1Public) options.push({ value: 1, label: t("common.filterPage1") });
    if (page2Public) options.push({ value: 2, label: t("common.filterPage2") });
    return options;
  }, [showAllFilter, page1Public, page2Public, t]);

  if (!ready) {
    return (
      <main className="container">
        <p>{t("common.loading")}</p>
      </main>
    );
  }

  if (!isAnswersAnyPublic(config)) {
    return (
      <main className="container">
        <nav className="nav-bar">
          <Link href="/">{t("common.backHome")}</Link>
          <Link href="/leaderboard">{t("common.leaderboard")}</Link>
          <Link href="/play">{t("common.play")}</Link>
        </nav>
        <div className="card" style={{ maxWidth: 480, margin: "2rem auto" }}>
          <h1 style={{ marginTop: 0 }}>{t("marketResults.closedTitle")}</h1>
          <p style={{ color: "var(--muted)", marginBottom: 0 }}>
            {t("marketResults.closedDesc")}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="container">
      <nav className="nav-bar">
        <Link href="/">{t("common.backHome")}</Link>
        <PublicFeatureNavLinks />
        <Link href="/play">{t("common.play")}</Link>
      </nav>

      <h1 style={{ marginTop: 0 }}>{t("marketResults.title")}</h1>
      <p className="page-lead">
        {t("marketResults.lead")}
        {!page1Public && page2Public && t("common.onlyPage2")}
        {page1Public && !page2Public && t("common.onlyPage1")}
      </p>

      {filterOptions.length > 1 && (
        <div className="answers-toolbar">
          {filterOptions.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              className={`btn btn-sm ${filter === value ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {players.length === 0 ? (
        <div className="card">
          <p style={{ margin: 0, color: "var(--muted)" }}>{t("marketResults.emptyPlayers")}</p>
        </div>
      ) : sections.length === 0 ? (
        <div className="card">
          <p style={{ margin: 0, color: "var(--muted)" }}>{t("marketResults.emptySections")}</p>
        </div>
      ) : (
        <div className="market-results-list">
          {sections.map((section) => (
            <section key={section.id} className="card market-result-card">
              <div className="market-result-header">
                <h2 className="market-result-title">{section.title}</h2>
                <span className="market-result-meta">
                  {t("marketResults.meta", {
                    picks: section.totalPicks,
                    slots: section.slotCount
                  })}
                </span>
              </div>

              {section.settled && (
                <div className="market-result-settled-banner">
                  {section.isVoid ? (
                    <p className="market-result-void">{t("marketResults.voidSettled")}</p>
                  ) : (
                    <p className="market-result-settled-meta">
                      {t("marketResults.settledMeta", {
                        std: formatScore(section.stdDev ?? 0),
                        stake: formatScore(section.stakePerSlot ?? 0),
                        doubleStake: formatScore((section.stakePerSlot ?? 0) * 2)
                      })}
                    </p>
                  )}
                </div>
              )}

              <div className="market-result-options">
                {section.options.map((optionResult) => {
                  const {
                    option,
                    picks: optionPicks,
                    isWinner,
                    isVoid,
                    stdDev,
                    stakePerSlot,
                    gainPerWinningSlot
                  } = optionResult;

                  return (
                    <div
                      key={option}
                      className={`market-result-option${isWinner ? " market-result-option-winner" : ""}`}
                    >
                      <div className="market-result-option-head">
                        <h3 className="market-result-option-label">
                          {option}
                          {isWinner && (
                            <span className="market-result-winner-badge">{t("marketResults.winner")}</span>
                          )}
                        </h3>
                        {!section.settled && (
                          <span className="market-result-hypothetical-label">
                            {t("marketResults.hypothetical")}
                          </span>
                        )}
                      </div>

                      {!section.settled && (
                        <p className="market-result-stake-line">
                          {isVoid
                            ? t("marketResults.voidHypothetical")
                            : t("marketResults.stakeLine", {
                                std: formatScore(stdDev),
                                stake: formatScore(stakePerSlot),
                                gain: formatScore(gainPerWinningSlot)
                              })}
                        </p>
                      )}

                      {optionPicks.length === 0 ? (
                        <p className="market-result-empty">{t("common.empty")}</p>
                      ) : (
                        <ul className="market-result-players">
                          {optionPicks.map((pick) => (
                            <li
                              key={pick.playerId}
                              className={
                                pick.isDouble ? "market-result-player pick-double" : "market-result-player"
                              }
                            >
                              <span className="market-result-player-name">{pick.playerName}</span>
                              <PlayerPayout pick={pick} settled={section.settled && isWinner} t={t} />
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>

              {section.settled && section.actualScores.length > 0 && (
                <div className="market-result-settled-table-wrap">
                  <h3 className="market-result-settled-title">{t("marketResults.settledTitle")}</h3>
                  <ul className="market-result-settled-list">
                    {section.actualScores.map((row) => (
                      <li key={row.playerId} className="market-result-settled-row">
                        <span className="market-result-player-name">
                          {row.playerName}
                          <span className="market-result-settled-team">{row.team}</span>
                          {row.isDouble && (
                            <span className="pick-double-badge">{t("common.double")}</span>
                          )}
                        </span>
                        <span className={scoreClassName(row.score)}>
                          {formatSignedScore(row.score)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
