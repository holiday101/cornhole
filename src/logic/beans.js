// Computes hole-winner results (skins-style, lowest score wins, ties carry the pot forward).
// Returns an array parallel to `holes`, one entry per hole:
//   { resolved: bool, winnerId: string|null, beansAwarded: number, tied: bool }
// - resolved=false means the hole doesn't have a score for every player yet.
// - tied=true means this hole's low score was shared, so its bean carries to the next hole.
// - beansAwarded is the number of beans the winner takes on the hole they win (1 + any carryover).
export function computeHoleWinners(holes, playerIds) {
  const results = [];
  let pot = 0;

  for (const hole of holes) {
    const allEntered = playerIds.every(
      (id) => hole.scores[id] !== undefined && hole.scores[id] !== null && hole.scores[id] !== ''
    );

    if (!allEntered) {
      results.push({ resolved: false, winnerId: null, beansAwarded: 0, tied: false });
      continue;
    }

    const scored = playerIds.map((id) => ({ id, score: Number(hole.scores[id]) }));
    const minScore = Math.min(...scored.map((s) => s.score));
    const lowest = scored.filter((s) => s.score === minScore);

    pot += 1;

    if (lowest.length === 1) {
      results.push({ resolved: true, winnerId: lowest[0].id, beansAwarded: pot, tied: false });
      pot = 0;
    } else {
      results.push({ resolved: true, winnerId: null, beansAwarded: 0, tied: true });
      // pot carries into the next hole
    }
  }

  return results;
}

// Aggregates every bean type into per-player totals + a breakdown for the summary screen.
export function summarizeBeans(game) {
  const holeWinners = computeHoleWinners(game.holes, game.playerIds);

  const totals = {};
  const breakdown = {};
  game.playerIds.forEach((id) => {
    totals[id] = 0;
    breakdown[id] = { longestDrive: 0, closestRegulation: 0, onePutt: 0, holeWinner: 0 };
  });

  game.holes.forEach((hole, i) => {
    const { longestDrive, closestRegulation, onePutt } = hole.beans;
    if (longestDrive && breakdown[longestDrive]) {
      breakdown[longestDrive].longestDrive += 1;
      totals[longestDrive] += 1;
    }
    if (closestRegulation && breakdown[closestRegulation]) {
      breakdown[closestRegulation].closestRegulation += 1;
      totals[closestRegulation] += 1;
    }
    if (onePutt && breakdown[onePutt]) {
      breakdown[onePutt].onePutt += 1;
      totals[onePutt] += 1;
    }

    const result = holeWinners[i];
    if (result.resolved && result.winnerId) {
      breakdown[result.winnerId].holeWinner += result.beansAwarded;
      totals[result.winnerId] += result.beansAwarded;
    }
  });

  return { holeWinners, totals, breakdown };
}

export function totalScore(hole_or_holes, playerId) {
  const holes = Array.isArray(hole_or_holes) ? hole_or_holes : [hole_or_holes];
  return holes.reduce((sum, hole) => {
    const score = hole.scores[playerId];
    return sum + (score !== undefined && score !== null && score !== '' ? Number(score) : 0);
  }, 0);
}
