"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnswersDataAnalytics } from "@/components/AnswersDataAnalytics";
import { AnswersPickChartTab } from "@/components/AnswersPickChartTab";
import { AnswersEarningsTimelineTab } from "@/components/AnswersEarningsTimelineTab";
import { PublicFeatureNavLinks } from "@/components/PublicFeatureLinks";
import { useLocale } from "@/context/LocaleContext";
import { formatScore } from "@/lib/score-format";
import { useGame } from "@/context/GameContext";
import { DOUBLE_STAKE, MIN_PAGE1_PICKS, MIN_PAGE2_PICKS, MIN_PAGE3_PICKS } from "@/data/markets";
import { allPickColumns, findPlayerPick } from "@/lib/market-helpers";
import { displayM1MarketColumnLabel, formatPickTeamAsFifaCodes } from "@/lib/fifa-codes";
import { isAnswersAnyPublic, isAnswersPagePublic, isMarketAnswersPublic } from "@/lib/public-features";
import { translateMarketCandidate } from "@/i18n";
import type { PlayPage } from "@/types";

type ViewFilter = "all" | PlayPage;
type AnswersTab = "overview" | "analytics" | "pickChart" | "earningsTimeline";

export default function AnswersPage() {
    const { ready, config, players, markets, picks, leaderboard } = useGame();
    const { t, locale } = useLocale();
    const [filter, setFilter] = useState<ViewFilter>("all");
    const [tab, setTab] = useState<AnswersTab>("overview");
    const [tabInitialized, setTabInitialized] = useState(false);
    const answersOverviewPublic = ready && isAnswersAnyPublic(config);
    const page1FullyPublic = ready && isAnswersPagePublic(config, 1);
    const page2Public = ready && isAnswersPagePublic(config, 2);
    const page3Public = ready && isAnswersPagePublic(config, 3);
    const onlyEarlyM1_1 = ready && config.answersM1_1Public && !page1FullyPublic && !page2Public && !page3Public;

    useEffect(() => {
        if (!ready || tabInitialized)
            return;
        setTab(answersOverviewPublic ? "overview" : "analytics");
        setTabInitialized(true);
    }, [ready, answersOverviewPublic, tabInitialized]);

    useEffect(() => {
        if (!ready)
            return;
        if (filter !== "all" && !isAnswersPagePublic(config, filter)) {
            const visible: PlayPage[] = [];
            if (page1FullyPublic)
                visible.push(1);
            if (page2Public)
                visible.push(2);
            if (page3Public)
                visible.push(3);
            setFilter(visible.length > 1 ? "all" : visible[0] ?? "all");
        }
    }, [ready, filter, config, page1FullyPublic, page2Public, page3Public]);

    const marketById = useMemo(() => new Map(markets.map((m) => [m.id, m])), [markets]);
    const columns = useMemo(() => {
        const all = allPickColumns(markets).filter((col) => isMarketAnswersPublic(config, col.id, col.page));
        if (filter === "all")
            return all;
        return all.filter((col) => col.page === filter);
    }, [markets, filter, config]);
    const sortedPlayers = useMemo(() => {
        const rankById = new Map(leaderboard.map((e) => [e.playerId, e.rank]));
        return [...players].sort((a, b) => {
            const rankA = rankById.get(a.id) ?? Number.MAX_SAFE_INTEGER;
            const rankB = rankById.get(b.id) ?? Number.MAX_SAFE_INTEGER;
            return rankA - rankB || a.createdAt.localeCompare(b.createdAt);
        });
    }, [players, leaderboard]);
    const page1ColCount = columns.filter((c) => c.page === 1).length;
    const page2ColCount = columns.filter((c) => c.page === 2).length;
    const page3ColCount = columns.filter((c) => c.page === 3).length;
    const showAllFilter = [page1FullyPublic, page2Public, page3Public].filter(Boolean).length > 1;
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

    return (<main className="container container-wide">
      <nav className="nav-bar">
        <Link href="/">{t("common.backHome")}</Link>
        <PublicFeatureNavLinks />
        <Link href="/play">{t("common.play")}</Link>
      </nav>

      <h1 style={{ marginTop: 0 }}>{t("answers.title")}</h1>

      <div className="answers-page-tabs" role="tablist" aria-label={t("answers.title")}>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "overview"}
          className={`answers-page-tab${tab === "overview" ? " answers-page-tab-active" : ""}`}
          onClick={() => setTab("overview")}
        >
          {t("answers.tabOverview")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "analytics"}
          className={`answers-page-tab${tab === "analytics" ? " answers-page-tab-active" : ""}`}
          onClick={() => setTab("analytics")}
        >
          {t("answers.tabAnalytics")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "pickChart"}
          className={`answers-page-tab${tab === "pickChart" ? " answers-page-tab-active" : ""}`}
          onClick={() => setTab("pickChart")}
        >
          {t("answers.tabPickChart")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "earningsTimeline"}
          className={`answers-page-tab${tab === "earningsTimeline" ? " answers-page-tab-active" : ""}`}
          onClick={() => setTab("earningsTimeline")}
        >
          {t("answers.tabEarningsTimeline")}
        </button>
      </div>

      {tab === "analytics" ? (
        <div className="answers-analytics-pane">
          <AnswersDataAnalytics />
        </div>
      ) : tab === "pickChart" ? (
        <div className="answers-analytics-pane">
          <AnswersPickChartTab />
        </div>
      ) : tab === "earningsTimeline" ? (
        <div className="answers-analytics-pane">
          <AnswersEarningsTimelineTab />
        </div>
      ) : !answersOverviewPublic ? (
        <div className="card" style={{ maxWidth: 480 }}>
          <h2 style={{ marginTop: 0 }}>{t("answers.closedTitle")}</h2>
          <p style={{ color: "var(--muted)", marginBottom: 0 }}>
            {t("answers.closedDesc")}
          </p>
        </div>
      ) : (
        <>
          <p className="page-lead">
            {t("answers.lead")}
            {onlyEarlyM1_1 && t("common.onlyM1_1")}
            {!page1FullyPublic && page2Public && t("common.onlyPage2")}
            {page1FullyPublic && !page2Public && !page3Public && t("common.onlyPage1")}
          </p>

          {filterOptions.length > 1 && (<div className="answers-toolbar">
              {filterOptions.map(({ value, label }) => (<button key={value} type="button" className={`btn btn-sm ${filter === value ? "btn-primary" : "btn-secondary"}`} onClick={() => setFilter(value)}>
                  {label}
                </button>))}
            </div>)}

          {players.length === 0 ? (<div className="card">
              <p style={{ margin: 0, color: "var(--muted)" }}>{t("answers.empty")}</p>
            </div>) : (<div className="card table-wrap answers-table-wrap">
              <table className="answers-table">
                <thead>
                  {filter === "all" && showAllFilter && (page1ColCount > 0 || page2ColCount > 0 || page3ColCount > 0) && (<tr className="answers-group-row">
                      <th rowSpan={2} className="sticky-col">
                        {t("common.player")}
                      </th>
                      <th rowSpan={2}>{t("common.page1Short")}</th>
                      <th rowSpan={2}>{t("common.page2Short")}</th>
                      <th rowSpan={2}>{t("common.page3Short")}</th>
                      <th rowSpan={2}>{t("leaderboard.earning")}</th>
                      {page1FullyPublic && page1ColCount > 0 && (<th colSpan={page1ColCount} className="group-header">
                          {t("answers.groupP1", { count: page1ColCount })}
                        </th>)}
                      {page2ColCount > 0 && (<th colSpan={page2ColCount} className="group-header">
                          {t("answers.groupP2", { count: page2ColCount })}
                        </th>)}
                      {page3ColCount > 0 && (<th colSpan={page3ColCount} className="group-header">
                          {t("answers.groupP3", { count: page3ColCount })}
                        </th>)}
                    </tr>)}
                  <tr>
                    {(filter !== "all" || !showAllFilter) && (<>
                        <th className="sticky-col">{t("common.player")}</th>
                        <th>{t("common.page1Short")}</th>
                        <th>{t("common.page2Short")}</th>
                        <th>{t("common.page3Short")}</th>
                        <th>{t("leaderboard.earning")}</th>
                      </>)}
                    {columns.map((col) => {
                        const market = marketById.get(col.id);
                        const header = displayM1MarketColumnLabel(col.id, market?.candidates, locale, col.shortLabel);
                        return (<th key={col.id} title={col.fullLabel}>
                        {header}
                      </th>);
                    })}
                  </tr>
                </thead>
                <tbody>
                  {sortedPlayers.map((player) => {
                    const score = leaderboard.find((e) => e.playerId === player.id)?.netEarnings ?? 0;
                    return (<tr key={player.id}>
                        <td className="sticky-col player-name">{player.name}</td>
                        <td>
                          {player.pickStats.page1Count}/{MIN_PAGE1_PICKS}
                        </td>
                        <td>
                          {player.pickStats.page2Count}/{MIN_PAGE2_PICKS}
                        </td>
                        <td>
                          {player.pickStats.page3Count}/{MIN_PAGE3_PICKS}
                        </td>
                        <td>{formatScore(score)}</td>
                        {columns.map((col) => {
                            const pick = findPlayerPick(picks, player.id, col.id);
                            if (!pick) {
                                return (<td key={col.id} className="pick-empty">
                                {t("common.none")}
                              </td>);
                            }
                            const isDouble = pick.stake === DOUBLE_STAKE;
                            const teamTitle = translateMarketCandidate(locale, pick.team);
                            const teamLabel = locale === "en"
                                ? formatPickTeamAsFifaCodes(pick.team)
                                : teamTitle;
                            return (<td key={col.id} className={isDouble ? "pick-double" : undefined} title={isDouble
                                    ? t("answers.doubleTitle", { team: teamTitle })
                                    : teamTitle}>
                              {teamLabel}
                              {isDouble && <span className="pick-double-badge">×2</span>}
                            </td>);
                        })}
                      </tr>);
                })}
                </tbody>
              </table>
            </div>)}
        </>
      )}
    </main>);
}
