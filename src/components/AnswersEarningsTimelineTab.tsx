"use client";

import { useMemo, useState } from "react";
import { AnswersEarningsTimelineChart } from "@/components/AnswersEarningsTimelineChart";
import { AnswersRankingTimelineChart } from "@/components/AnswersRankingTimelineChart";
import { AnswersTimelineViewPicker } from "@/components/AnswersTimelineViewPicker";
import { useGame } from "@/context/GameContext";
import { useLocale } from "@/context/LocaleContext";
import {
  computeEarningsTimeline,
  computeRankingTimeline,
  sortMarketsBySettlementOrder
} from "@/lib/earnings-timeline";
import {
  buildTimelinePlayerOptionsById,
  resolveTimelinePlayerIds,
  TIMELINE_BOSS_PLAYER_NAMES,
  type TimelinePlayerViewMode
} from "@/lib/timeline-player-views";

export function AnswersEarningsTimelineTab() {
  const { players, markets, picks, config } = useGame();
  const { t } = useLocale();
  const [viewMode, setViewMode] = useState<TimelinePlayerViewMode>("top10");

  const timelineMarkets = useMemo(
    () => markets.filter((market) => market.page === 1 || market.page === 2 || market.page === 3),
    [markets]
  );

  const hasSettled = useMemo(
    () => sortMarketsBySettlementOrder(timelineMarkets).length > 0,
    [timelineMarkets]
  );

  const top10PlayerOptions = useMemo(
    () => buildTimelinePlayerOptionsById("top10", players),
    [players]
  );
  const displayPlayerOptions = useMemo(
    () => buildTimelinePlayerOptionsById(viewMode, players),
    [viewMode, players]
  );

  const top10EarningsTimeline = useMemo(
    () =>
      hasSettled
        ? computeEarningsTimeline(players, timelineMarkets, picks, {
            config,
            playerOptionsById: top10PlayerOptions
          })
        : null,
    [hasSettled, players, timelineMarkets, picks, config, top10PlayerOptions]
  );

  const displayEarningsTimeline = useMemo(
    () =>
      hasSettled
        ? computeEarningsTimeline(players, timelineMarkets, picks, {
            config,
            playerOptionsById: displayPlayerOptions
          })
        : null,
    [hasSettled, players, timelineMarkets, picks, config, displayPlayerOptions]
  );

  const displayRankingTimeline = useMemo(
    () =>
      hasSettled
        ? computeRankingTimeline(players, timelineMarkets, picks, {
            config,
            playerOptionsById: displayPlayerOptions
          })
        : null,
    [hasSettled, players, timelineMarkets, picks, config, displayPlayerOptions]
  );

  const playerMetaById = useMemo(() => {
    if (!top10EarningsTimeline || !displayEarningsTimeline || !displayRankingTimeline)
      return new Map<string, { playerName: string; finalNet: number; finalRank: number; colorIndex: number }>();

    const displayNetById = new Map(
      displayEarningsTimeline.series.map((row) => [row.playerId, row.finalNet])
    );
    const displayRankById = new Map(
      displayRankingTimeline.series.map((row) => [row.playerId, row.finalRank])
    );

    return new Map(
      top10EarningsTimeline.series.map((row, index) => [
        row.playerId,
        {
          playerName: row.playerName,
          finalNet: displayNetById.get(row.playerId) ?? row.finalNet,
          finalRank: displayRankById.get(row.playerId) ?? players.length,
          colorIndex: index
        }
      ])
    );
  }, [top10EarningsTimeline, displayEarningsTimeline, displayRankingTimeline, players.length]);

  const colorIndexByPlayerId = useMemo(
    () => new Map([...playerMetaById.entries()].map(([id, meta]) => [id, meta.colorIndex])),
    [playerMetaById]
  );

  const selectedPlayerIds = useMemo(() => {
    if (!top10EarningsTimeline)
      return new Set<string>();
    return resolveTimelinePlayerIds(viewMode, top10EarningsTimeline.series, players);
  }, [viewMode, top10EarningsTimeline, players]);

  const legendPlayers = useMemo(() => {
    const buildRow = (playerId: string) => {
      const meta = playerMetaById.get(playerId);
      if (!meta)
        return null;
      return { playerId, ...meta };
    };

    if (viewMode === "boss") {
      const nameToId = new Map(players.map((player) => [player.name, player.id]));
      return TIMELINE_BOSS_PLAYER_NAMES.flatMap((name) => {
        const playerId = nameToId.get(name);
        if (!playerId || !selectedPlayerIds.has(playerId))
          return [];
        const row = buildRow(playerId);
        return row ? [row] : [];
      });
    }

    return top10EarningsTimeline?.series
      .filter((row) => selectedPlayerIds.has(row.playerId))
      .map((row) => buildRow(row.playerId))
      .filter((row): row is NonNullable<typeof row> => row !== null) ?? [];
  }, [viewMode, top10EarningsTimeline, players, selectedPlayerIds, playerMetaById]);

  if (
    players.length === 0 ||
    !hasSettled ||
    !top10EarningsTimeline ||
    !displayEarningsTimeline ||
    !displayRankingTimeline
  ) {
    return (
      <div className="card answers-analytics-card">
        <p className="answers-analytics-placeholder">
          {t("answers.analyticsEarningsTimelineEmpty")}
        </p>
      </div>
    );
  }

  return (
    <>
      <section className="card answers-analytics-section answers-analytics-chart-section">
        <AnswersTimelineViewPicker
          mode={viewMode}
          onChange={setViewMode}
        />
      </section>
      <section className="card answers-analytics-section answers-analytics-chart-section answers-timeline-chart-section">
        <AnswersEarningsTimelineChart
          timeline={displayEarningsTimeline}
          selectedPlayerIds={selectedPlayerIds}
          colorIndexByPlayerId={colorIndexByPlayerId}
          legendPlayers={legendPlayers}
        />
      </section>
      <section className="card answers-analytics-section answers-analytics-chart-section answers-ranking-timeline-section">
        <AnswersRankingTimelineChart
          timeline={displayRankingTimeline}
          selectedPlayerIds={selectedPlayerIds}
          colorIndexByPlayerId={colorIndexByPlayerId}
          legendPlayers={legendPlayers}
        />
      </section>
    </>
  );
}
