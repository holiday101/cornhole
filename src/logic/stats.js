import { summarizeBeans, totalScore } from './beans';

function emptyPlayerStats(id, name) {
  return {
    id,
    name,
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    totalBeans: 0,
    beanBreakdown: { longestDrive: 0, closestRegulation: 0, onePutt: 0, holeWinner: 0 },
    totalStrokes: 0,
    totalHoles: 0,
    bestRound: null,
  };
}

// Aggregates lifetime stats per player across every completed game.
// Ties for the lowest score in a game count as a win for everyone tied.
export function buildPlayerStatsMap(games) {
  const map = {};

  games
    .filter((g) => g.completed)
    .forEach((game) => {
      const { totals, breakdown } = summarizeBeans(game);
      const nameById = {};
      game.players.forEach((p) => (nameById[p.id] = p.name));

      const scores = game.playerIds.map((pid) => ({ pid, score: totalScore(game.holes, pid) }));
      const minScore = Math.min(...scores.map((s) => s.score));

      scores.forEach(({ pid, score }) => {
        if (!map[pid]) map[pid] = emptyPlayerStats(pid, nameById[pid] || 'Unknown');
        const entry = map[pid];

        entry.gamesPlayed += 1;
        entry.totalStrokes += score;
        entry.totalHoles += game.holes.length;
        entry.totalBeans += totals[pid] || 0;

        const b = breakdown[pid] || {};
        entry.beanBreakdown.longestDrive += b.longestDrive || 0;
        entry.beanBreakdown.closestRegulation += b.closestRegulation || 0;
        entry.beanBreakdown.onePutt += b.onePutt || 0;
        entry.beanBreakdown.holeWinner += b.holeWinner || 0;

        if (score === minScore) entry.wins += 1;
        else entry.losses += 1;

        if (!entry.bestRound || score < entry.bestRound.score) {
          entry.bestRound = {
            score,
            date: game.date,
            holesCount: game.holesCount,
            gameId: game.id,
          };
        }
      });
    });

  Object.values(map).forEach((entry) => {
    entry.avgPerHole = entry.totalHoles > 0 ? entry.totalStrokes / entry.totalHoles : 0;
    entry.avgPer9 = entry.avgPerHole * 9;
    entry.avgPer18 = entry.avgPerHole * 18;
  });

  return map;
}

export function statsForPlayer(games, playerId, playerName) {
  const map = buildPlayerStatsMap(games);
  return map[playerId] || emptyPlayerStats(playerId, playerName);
}
