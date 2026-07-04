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
  resolveTimelinePlayerIds,
  TIMELINE_BOSS_PLAYER_NAMES,
  type TimelinePlayerViewMode
} from "@/lib/timeline-player-views";

export function AnswersEarningsTimelineTab() {
  const { players, markets, picks } = useGame();
  const { t } = useLocale();
  const [viewMode, setViewMode] = useState<TimelinePlayerViewMode>("top10");

  const page1Markets = useMemo(
    () => markets.filter((market) => market.page === 1),
    [markets]
  );

  const hasSettled = useMemo(
    () => sortMarketsBySettlementOrder(page1Markets).length > 0,
    [page1Markets]
  );

  const earningsTimeline = useMemo(
    () => (hasSettled ? computeEarningsTimeline(players, page1Markets, picks) : null),
    [hasSettled, players, page1Markets, picks]
  );
  const rankingTimeline = useMemo(
    () => (hasSettled ? computeRankingTimeline(players, page1Markets, picks) : null),
    [hasSettled, players, page1Markets, picks]
  );

  const playerMetaById = useMemo(() => {
    if (!earningsTimeline || !rankingTimeline)
      return new Map<string, { playerName: string; finalNet: number; finalRank: number; colorIndex: number }>();
    const rankById = new Map(
      rankingTimeline.series.map((row) => [row.playerId, row.finalRank])
    );
    return new Map(
      earningsTimeline.series.map((row, index) => [
        row.playerId,
        {
          playerName: row.playerName,
          finalNet: row.finalNet,
          finalRank: rankById.get(row.playerId) ?? players.length,
          colorIndex: index
        }
      ])
    );
  }, [earningsTimeline, rankingTimeline, players.length]);

  const colorIndexByPlayerId = useMemo(
    () => new Map([...playerMetaById.entries()].map(([id, meta]) => [id, meta.colorIndex])),
    [playerMetaById]
  );

  const selectedPlayerIds = useMemo(() => {
    if (!earningsTimeline)
      return new Set<string>();
    return resolveTimelinePlayerIds(viewMode, earningsTimeline.series, players);
  }, [viewMode, earningsTimeline, players]);

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

    return earningsTimeline?.series
      .filter((row) => selectedPlayerIds.has(row.playerId))
      .map((row) => buildRow(row.playerId))
      .filter((row): row is NonNullable<typeof row> => row !== null) ?? [];
  }, [viewMode, earningsTimeline, players, selectedPlayerIds, playerMetaById]);

  if (players.length === 0 || !hasSettled || !earningsTimeline || !rankingTimeline) {
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
          players={players}
          markets={markets}
          picks={picks}
          selectedPlayerIds={selectedPlayerIds}
          colorIndexByPlayerId={colorIndexByPlayerId}
          legendPlayers={legendPlayers}
        />
      </section>
      <section className="card answers-analytics-section answers-analytics-chart-section answers-ranking-timeline-section">
        <AnswersRankingTimelineChart
          players={players}
          markets={markets}
          picks={picks}
          selectedPlayerIds={selectedPlayerIds}
          colorIndexByPlayerId={colorIndexByPlayerId}
          legendPlayers={legendPlayers}
        />
      </section>
    </>
  );
}
