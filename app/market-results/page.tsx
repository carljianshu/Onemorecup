"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PublicFeatureNavLinks } from "@/components/PublicFeatureLinks";
import { OptionPayoutHints } from "@/components/OptionPayoutHints";
import { useLocale } from "@/context/LocaleContext";
import { useGame } from "@/context/GameContext";
import { formatMarketHeading, formatPlayMarketCandidate } from "@/i18n";
import { buildMarketResultSections } from "@/lib/market-results";
import { formatScorePlain, roundScore } from "@/lib/score-format";
import { isAnswersAnyPublic, isAnswersPagePublic, listPublicAnswerMarketIds } from "@/lib/public-features";
import type { PlayPage } from "@/types";
type ViewFilter = "all" | PlayPage;

function formatAdjustmentSequenceValue(value: number): string {
    const rounded = roundScore(value);
    if (Number.isInteger(rounded))
        return String(rounded);
    return rounded.toFixed(2);
}

export default function MarketResultsPage() {
    const { ready, config, players, markets, picks } = useGame();
    const { locale, t } = useLocale();
    const [filter, setFilter] = useState<ViewFilter>("all");
    const page1FullyPublic = ready && isAnswersPagePublic(config, 1);
    const page2Public = ready && isAnswersPagePublic(config, 2);
    const page3Public = ready && isAnswersPagePublic(config, 3);
    const showAllFilter = [page1FullyPublic, page2Public, page3Public].filter(Boolean).length > 1;
    const publicMarketIds = useMemo(() => new Set(listPublicAnswerMarketIds(markets, config)), [markets, config]);
    const visiblePages = useMemo(() => {
        const pages: PlayPage[] = [];
        if (page1FullyPublic)
            pages.push(1);
        if (page2Public)
            pages.push(2);
        if (page3Public)
            pages.push(3);
        return pages;
    }, [page1FullyPublic, page2Public, page3Public]);
    useEffect(() => {
        if (!ready)
            return;
        if (filter !== "all" && !isAnswersPagePublic(config, filter)) {
            setFilter(visiblePages[0] ?? "all");
        }
    }, [ready, filter, config, visiblePages]);
    const sections = useMemo(() => {
        const all = buildMarketResultSections(markets, picks, players, publicMarketIds, locale);
        if (filter === "all")
            return all;
        return all.filter((section) => section.page === filter);
    }, [markets, picks, players, publicMarketIds, filter, locale]);
    const filterOptions = useMemo(() => {
        const options: {
            value: ViewFilter;
            label: string;
        }[] = [];
        if (showAllFilter)
            options.push({ value: "all", label: t("common.filterAll") });
        if (page1FullyPublic)
            options.push({ value: 1, label: t("common.filterPage1") });
        if (page2Public)
            options.push({ value: 2, label: t("common.filterPage2") });
        if (page3Public)
            options.push({ value: 3, label: t("common.filterPage3") });
        return options;
    }, [showAllFilter, page1FullyPublic, page2Public, page3Public, t]);
    if (!ready) {
        return (<main className="container">
        <p>{t("common.loading")}</p>
      </main>);
    }
    if (!isAnswersAnyPublic(config)) {
        return (<main className="container">
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
      </main>);
    }
    return (<main className="container">
      <nav className="nav-bar">
        <Link href="/">{t("common.backHome")}</Link>
        <PublicFeatureNavLinks />
        <Link href="/play">{t("common.play")}</Link>
      </nav>

      <h1 style={{ marginTop: 0 }}>{t("marketResults.title")}</h1>

      {filterOptions.length > 1 && (<div className="answers-toolbar">
          {filterOptions.map(({ value, label }) => (<button key={value} type="button" className={`btn btn-sm ${filter === value ? "btn-primary" : "btn-secondary"}`} onClick={() => setFilter(value)}>
              {label}
            </button>))}
        </div>)}

      {players.length === 0 ? (<div className="card">
          <p style={{ margin: 0, color: "var(--muted)" }}>{t("marketResults.emptyPlayers")}</p>
        </div>) : sections.length === 0 ? (<div className="card">
          <p style={{ margin: 0, color: "var(--muted)" }}>{t("marketResults.emptySections")}</p>
        </div>) : (<div className="market-results-list">
          {sections.map((section) => {
                const market = markets.find((item) => item.id === section.id);
                const sectionTitle = market
                    ? formatMarketHeading(locale, market.id, market.name)
                    : section.title;
                return (<section key={section.id} className="card market-result-card">
              <div className="market-result-header">
                <h2 className="market-result-title">{sectionTitle}</h2>
                <span className="market-result-meta">
                  {t("marketResults.meta", {
                        picks: section.totalPicks,
                        slots: section.slotCount
                    })}
                </span>
              </div>

              {section.settled && (<div className="market-result-settled-banner">
                  {section.isVoid ? (<p className="market-result-void">{t("marketResults.voidSettled")}</p>) : (<p className="market-result-settled-meta">
                      {section.adjustmentSequence ? (<>
                          {t("marketResults.adjustmentSequenceLine", {
                                m: section.adjustmentSequence.largeCount,
                                n: section.adjustmentSequence.smallCount,
                                neg: formatAdjustmentSequenceValue(section.adjustmentSequence.negativePerSlot),
                                pos: formatAdjustmentSequenceValue(section.adjustmentSequence.positivePerSlot)
                            })}
                          {" · "}
                        </>) : null}
                      {t("marketResults.settledMeta", {
                                adjustment: formatScorePlain(section.adjustment ?? 0),
                                stake: formatScorePlain(section.stakePerSlot ?? 0)
                            })}
                    </p>)}
                </div>)}

              <div className="market-result-options">
                {section.options.map((optionResult) => {
                        const { option, picks: optionPicks, playerCount, doubleCount, isWinner } = optionResult;
                        return (<div key={option} className={`market-result-option${isWinner ? " market-result-option-winner" : ""}`}>
                      <div className="market-result-option-head">
                        <h3 className="market-result-option-label">
                          <span className="market-result-option-name">
                            {formatPlayMarketCandidate(locale, option)}
                          </span>
                          <span className="market-result-option-count">
                            {doubleCount > 0
                                ? t("marketResults.optionPickCountDouble", { count: playerCount, doubleCount })
                                : t("marketResults.optionPickCount", { count: playerCount })}
                          </span>
                          <OptionPayoutHints option={option} candidates={section.options.map((item) => item.option)} questionPicks={picks.filter((pick) => pick.marketId === section.id)} marketId={section.id} className="market-result-option-payout"/>
                          {isWinner && (<span className="market-result-winner-badge">{t("marketResults.winner")}</span>)}
                        </h3>
                      </div>

                      {optionPicks.length === 0 ? (<p className="market-result-empty">{t("common.empty")}</p>) : (<ul className="market-result-players">
                          {optionPicks.map((pick) => {
                                    const questionPicks = picks.filter((item) => item.marketId === section.id);
                                    const candidates = section.options.map((item) => item.option);
                                    return (<li key={pick.playerId} className={pick.isDouble
                                            ? "market-result-player pick-double"
                                            : "market-result-player"}>
                                <span className="market-result-player-name">{pick.playerName}</span>
                                {pick.isDouble ? (<OptionPayoutHints option={option} candidates={candidates} questionPicks={questionPicks} marketId={section.id} slotMultiplier={2} className="market-result-player-payout"/>) : null}
                              </li>);
                                })}
                        </ul>)}
                    </div>);
                    })}
              </div>
            </section>);
            })}
        </div>)}
    </main>);
}
