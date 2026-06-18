"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PublicFeatureNavLinks } from "@/components/PublicFeatureLinks";
import { OptionPayoutHints } from "@/components/OptionPayoutHints";
import { useLocale } from "@/context/LocaleContext";
import { useGame } from "@/context/GameContext";
import { marketShowsPayoutHints } from "@/data/markets";
import { buildMarketResultSections } from "@/lib/market-results";
import { formatScorePlain } from "@/lib/score-format";
import { isAnswersAnyPublic, isAnswersPagePublic } from "@/lib/public-features";
import type { PlayPage } from "@/types";

type ViewFilter = "all" | PlayPage;

export default function MarketResultsPage() {
  const { ready, config, players, markets, picks } = useGame();
  const { t } = useLocale();
  const [filter, setFilter] = useState<ViewFilter>("all");

  const page1Public = ready && isAnswersPagePublic(config, 1);
  const page2Public = ready && isAnswersPagePublic(config, 2);
  const page3Public = ready && isAnswersPagePublic(config, 3);
  const showAllFilter = [page1Public, page2Public, page3Public].filter(Boolean).length > 1;

  const visiblePages = useMemo(() => {
    const pages: PlayPage[] = [];
    if (page1Public) pages.push(1);
    if (page2Public) pages.push(2);
    if (page3Public) pages.push(3);
    return pages;
  }, [page1Public, page2Public, page3Public]);

  useEffect(() => {
    if (!ready) return;
    if (filter !== "all" && !isAnswersPagePublic(config, filter)) {
      setFilter(visiblePages[0] ?? "all");
    }
  }, [ready, filter, config, visiblePages]);

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
    if (page3Public) options.push({ value: 3, label: t("common.filterPage3") });
    return options;
  }, [showAllFilter, page1Public, page2Public, page3Public, t]);

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
                        std: formatScorePlain(section.stdDev ?? 0),
                        adjustment: formatScorePlain(section.adjustment ?? 0),
                        stake: formatScorePlain(section.stakePerSlot ?? 0),
                        doubleStake: formatScorePlain((section.stakePerSlot ?? 0) * 2)
                      })}
                    </p>
                  )}
                </div>
              )}

              <div className="market-result-options">
                {section.options.map((optionResult) => {
                  const { option, picks: optionPicks, isWinner } = optionResult;
                  const showPayoutHints = marketShowsPayoutHints(section.id);

                  return (
                    <div
                      key={option}
                      className={`market-result-option${isWinner ? " market-result-option-winner" : ""}`}
                    >
                      <div className="market-result-option-head">
                        <h3 className="market-result-option-label">
                          <span className="market-result-option-name">{option}</span>
                          {showPayoutHints && (
                            <OptionPayoutHints
                              option={option}
                              candidates={section.options.map((item) => item.option)}
                              questionPicks={picks.filter((pick) => pick.marketId === section.id)}
                              className="market-result-option-payout"
                            />
                          )}
                          {isWinner && (
                            <span className="market-result-winner-badge">{t("marketResults.winner")}</span>
                          )}
                        </h3>
                      </div>

                      {optionPicks.length === 0 ? (
                        <p className="market-result-empty">{t("common.empty")}</p>
                      ) : (
                        <ul className="market-result-players">
                          {optionPicks.map((pick) => {
                            const questionPicks = picks.filter(
                              (item) => item.marketId === section.id
                            );
                            const candidates = section.options.map((item) => item.option);

                            return (
                              <li
                                key={pick.playerId}
                                className={
                                  pick.isDouble
                                    ? "market-result-player pick-double"
                                    : "market-result-player"
                                }
                              >
                                <span className="market-result-player-name">{pick.playerName}</span>
                                {showPayoutHints && pick.isDouble ? (
                                  <OptionPayoutHints
                                    option={option}
                                    candidates={candidates}
                                    questionPicks={questionPicks}
                                    slotMultiplier={2}
                                    className="market-result-player-payout"
                                  />
                                ) : null}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
