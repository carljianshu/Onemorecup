const STAKE = 10;

function roundScore(value) {
  return Math.round(value * 10) / 10;
}

/**
 * Settle a single market. Returns { [playerId]: score } for participants only.
 * @param {{ id: string, winner: string | null | undefined }} market
 * @param {Array<{ playerId: string, marketId: string, team: string, stake: number }>} marketPicks
 */
function settleMarket(market, marketPicks) {
  const scores = {};

  if (!market.winner) {
    for (const pick of marketPicks) {
      scores[pick.playerId] = 0;
    }
    return scores;
  }

  const winners = marketPicks.filter((pick) => pick.team === market.winner);
  const losers = marketPicks.filter((pick) => pick.team !== market.winner);

  if (winners.length === 0 || losers.length === 0) {
    for (const pick of marketPicks) {
      scores[pick.playerId] = 0;
    }
    return scores;
  }

  const totalLoss = losers.length * STAKE;
  const gainEach = totalLoss / winners.length;

  for (const pick of losers) {
    scores[pick.playerId] = -STAKE;
  }
  for (const pick of winners) {
    scores[pick.playerId] = roundScore(gainEach);
  }

  return scores;
}

/**
 * @param {Array<{ id: string, name: string }>} players
 * @param {Array<{ id: string, round?: string, name?: string, candidates?: string[], winner?: string | null }>} markets
 * @param {Array<{ playerId: string, marketId: string, team: string, stake: number }>} picks
 * @returns {{
 *   leaderboard: Array<{
 *     rank: number,
 *     playerId: string,
 *     name: string,
 *     totalScore: number,
 *     marketScores: Record<string, number>
 *   }>,
 *   byMarket: Record<string, Record<string, number>>
 * }}
 */
export function calculateScores(players, markets, picks) {
  const byMarket = /** @type {Record<string, Record<string, number>>} */ ({});
  const playerMap = new Map(
    players.map((player) => [
      player.id,
      {
        playerId: player.id,
        name: player.name,
        totalScore: 0,
        marketScores: /** @type {Record<string, number>} */ ({})
      }
    ])
  );

  for (const market of markets) {
    const marketPicks = picks.filter((pick) => pick.marketId === market.id);
    const settled = settleMarket(market, marketPicks);
    byMarket[market.id] = settled;

    for (const [playerId, score] of Object.entries(settled)) {
      const entry = playerMap.get(playerId);
      if (!entry) continue;
      entry.marketScores[market.id] = score;
      entry.totalScore = roundScore(entry.totalScore + score);
    }
  }

  const sorted = Array.from(playerMap.values()).sort(
    (a, b) => b.totalScore - a.totalScore || a.name.localeCompare(b.name)
  );

  let lastScore = null;
  let lastRank = 0;

  const leaderboard = sorted.map((entry, index) => {
    const rank = entry.totalScore === lastScore ? lastRank : index + 1;
    lastScore = entry.totalScore;
    lastRank = rank;
    return {
      rank,
      playerId: entry.playerId,
      name: entry.name,
      totalScore: entry.totalScore,
      marketScores: entry.marketScores
    };
  });

  return { leaderboard, byMarket };
}
