"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PublicFeatureNavLinks } from "@/components/PublicFeatureLinks";
import { useLocale } from "@/context/LocaleContext";
import { formatScore } from "@/lib/score-format";
import { useGame } from "@/context/GameContext";
import { DOUBLE_STAKE, MIN_PAGE1_PICKS, MIN_PAGE2_PICKS, MIN_PAGE3_PICKS } from "@/data/markets";
import { allPickColumns, findPlayerPick } from "@/lib/market-helpers";
import { isAnswersAnyPublic, isAnswersPagePublic } from "@/lib/public-features";
import { translateMarketCandidate } from "@/i18n";
import type { PlayPage } from "@/types";

type ViewFilter = "all" | PlayPage;

export default function AnswersPage() {
  const { ready, config, players, markets, picks, leaderboard } = useGame();
  const { t, locale } = useLocale();
  const [filter, setFilter] = useState<ViewFilter>("all");

  const page1Public = ready && isAnswersPagePublic(config, 1);
  const page2Public = ready && isAnswersPagePublic(config, 2);
  const page3Public = ready && isAnswersPagePublic(config, 3);

  useEffect(() => {
    if (!ready) return;
    if (filter !== "all" && !isAnswersPagePublic(config, filter)) {
      const visible: PlayPage[] = [];
      if (page1Public) visible.push(1);
      if (page2Public) visible.push(2);
      if (page3Public) visible.push(3);
      setFilter(visible.length > 1 ? "all" : visible[0] ?? "all");
    }
  }, [ready, filter, config, page1Public, page2Public, page3Public]);

  const columns = useMemo(() => {
    const all = allPickColumns(markets).filter(
      (col) =>
        (col.page === 1 && page1Public) ||
        (col.page === 2 && page2Public) ||
        (col.page === 3 && page3Public)
    );
    if (filter === "all") return all;
    return all.filter((col) => col.page === filter);
  }, [markets, filter, page1Public, page2Public, page3Public]);

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
  const showAllFilter = [page1Public, page2Public, page3Public].filter(Boolean).length > 1;

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
          <h1 style={{ marginTop: 0 }}>{t("answers.closedTitle")}</h1>
          <p style={{ color: "var(--muted)", marginBottom: 0 }}>
            {t("answers.closedDesc")}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="container container-wide">
      <nav className="nav-bar">
        <Link href="/">{t("common.backHome")}</Link>
        <PublicFeatureNavLinks />
        <Link href="/play">{t("common.play")}</Link>
      </nav>

      <h1 style={{ marginTop: 0 }}>{t("answers.title")}</h1>
      <p className="page-lead">
        {t("answers.lead")}
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
          <p style={{ margin: 0, color: "var(--muted)" }}>{t("answers.empty")}</p>
        </div>
      ) : (
        <div className="card table-wrap answers-table-wrap">
          <table className="answers-table">
            <thead>
              {filter === "all" && showAllFilter && (page1ColCount > 0 || page2ColCount > 0 || page3ColCount > 0) && (
                <tr className="answers-group-row">
                  <th rowSpan={2} className="sticky-col">
                    {t("common.player")}
                  </th>
                  <th rowSpan={2}>{t("common.page1Short")}</th>
                  <th rowSpan={2}>{t("common.page2Short")}</th>
                  <th rowSpan={2}>{t("common.page3Short")}</th>
                  <th rowSpan={2}>{t("common.score")}</th>
                  {page1ColCount > 0 && (
                    <th colSpan={page1ColCount} className="group-header">
                      {t("answers.groupP1", { count: page1ColCount })}
                    </th>
                  )}
                  {page2ColCount > 0 && (
                    <th colSpan={page2ColCount} className="group-header">
                      {t("answers.groupP2", { count: page2ColCount })}
                    </th>
                  )}
                  {page3ColCount > 0 && (
                    <th colSpan={page3ColCount} className="group-header">
                      {t("answers.groupP3", { count: page3ColCount })}
                    </th>
                  )}
                </tr>
              )}
              <tr>
                {(filter !== "all" || !showAllFilter) && (
                  <>
                    <th className="sticky-col">{t("common.player")}</th>
                    <th>{t("common.page1Short")}</th>
                    <th>{t("common.page2Short")}</th>
                    <th>{t("common.page3Short")}</th>
                    <th>{t("common.score")}</th>
                  </>
                )}
                {columns.map((col) => (
                  <th key={col.id} title={col.fullLabel}>
                    {col.shortLabel}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedPlayers.map((player) => {
                const score = leaderboard.find((e) => e.playerId === player.id)?.netEarnings ?? 0;
                return (
                  <tr key={player.id}>
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
                        return (
                          <td key={col.id} className="pick-empty">
                            {t("common.none")}
                          </td>
                        );
                      }
                      const isDouble = pick.stake === DOUBLE_STAKE;
                      const teamLabel = translateMarketCandidate(locale, pick.team);
                      return (
                        <td
                          key={col.id}
                          className={isDouble ? "pick-double" : undefined}
                          title={
                            isDouble
                              ? t("answers.doubleTitle", { team: teamLabel })
                              : teamLabel
                          }
                        >
                          {teamLabel}
                          {isDouble && <span className="pick-double-badge">×2</span>}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
