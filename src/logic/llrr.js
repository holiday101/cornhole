// Left Left Right Right (LLRR): a 2v2 team game for exactly 4 players. Tee positions
// are assigned per hole (1 = leftmost drive ... 4 = rightmost), and teams are always
// positions {1,2} ("team A") vs {3,4} ("team B") -- so teams reshuffle hole to hole as
// drives land differently. Each team's two scores are combined into a two-digit number
// by concatenating them in left-to-right order (the more-left player's score is the
// tens digit, the more-right player's is the ones digit) -- not added. The team with
// the LOWER combined number wins the hole; the margin (higher - lower) is the point
// swing, credited in full to each teammate (+margin for the winners, -margin for the
// losers), so every hole nets to zero across all four players. Equal combined numbers
// is a push (0 for everyone that hole).
//
// Birdie-or-better flip: if a team makes birdie or better on a hole (either player, it
// doesn't matter which one or how many), the OTHER team's combined number gets its two
// digits swapped before comparing -- a team's own birdie never affects its own number,
// only the opponents'. This needs the hole's par, so it can never fire on a course-less
// quick game (no par on record) -- the flip is simply skipped on those holes.
//
// Digit clamp: each individual score is clamped to 9 for the concatenation only (never
// for the birdie check, and never anywhere else in the app) -- otherwise a blow-up hole
// (a score of 10+) breaks the two-digit-number trick ("4 and 10" isn't unambiguously
// "410"), and would blow the point margin (and $ swing) wildly out of proportion to
// every other hole.

const TEAM_A_POSITIONS = [1, 2]; // "left" team: leftmost + second-from-left
const TEAM_B_POSITIONS = [3, 4]; // "right" team: second-from-right + rightmost

function clampDigit(score) {
  return Math.min(9, score);
}

function teamIsBirdieOrBetter(scores, par) {
  if (par === null || par === undefined) return false;
  return scores.some((score) => score <= par - 1);
}

function combinedNumber(scores, flip) {
  const [tensScore, onesScore] = scores.map(clampDigit);
  return flip ? onesScore * 10 + tensScore : tensScore * 10 + onesScore;
}

function scoreAt(hole, positions, position) {
  const userId = positions[position];
  if (userId == null) return null;
  const score = hole.scores[userId];
  return score !== undefined && score !== null && score !== '' ? Number(score) : null;
}

// Result for one hole. `positions` is { 1: userId, 2: userId, 3: userId, 4: userId }.
// Not resolved until all 4 positions are assigned and all 4 players have a score in.
export function computeHoleResult(hole, positions) {
  const unresolved = { resolved: false, pushed: false, margin: 0, pointsByPlayer: {} };

  const allPositioned = [1, 2, 3, 4].every((p) => positions[p] != null);
  if (!allPositioned) return unresolved;

  const rawScores = {
    1: scoreAt(hole, positions, 1),
    2: scoreAt(hole, positions, 2),
    3: scoreAt(hole, positions, 3),
    4: scoreAt(hole, positions, 4),
  };
  if (Object.values(rawScores).some((s) => s === null)) return unresolved;

  const teamAScores = TEAM_A_POSITIONS.map((p) => rawScores[p]);
  const teamBScores = TEAM_B_POSITIONS.map((p) => rawScores[p]);

  const teamABirdied = teamIsBirdieOrBetter(teamAScores, hole.par);
  const teamBBirdied = teamIsBirdieOrBetter(teamBScores, hole.par);

  // A team's number is flipped when the OTHER team birdied -- not its own.
  const teamANumber = combinedNumber(teamAScores, teamBBirdied);
  const teamBNumber = combinedNumber(teamBScores, teamABirdied);

  const pointsByPlayer = {};

  if (teamANumber === teamBNumber) {
    [...TEAM_A_POSITIONS, ...TEAM_B_POSITIONS].forEach((p) => {
      pointsByPlayer[positions[p]] = 0;
    });
    return {
      resolved: true,
      pushed: true,
      margin: 0,
      teamANumber,
      teamBNumber,
      teamABirdied,
      teamBBirdied,
      pointsByPlayer,
    };
  }

  const margin = Math.abs(teamANumber - teamBNumber);
  const teamAWins = teamANumber < teamBNumber;

  TEAM_A_POSITIONS.forEach((p) => {
    pointsByPlayer[positions[p]] = teamAWins ? margin : -margin;
  });
  TEAM_B_POSITIONS.forEach((p) => {
    pointsByPlayer[positions[p]] = teamAWins ? -margin : margin;
  });

  return {
    resolved: true,
    pushed: false,
    margin,
    teamANumber,
    teamBNumber,
    teamABirdied,
    teamBBirdied,
    winningTeam: teamAWins ? 'a' : 'b',
    pointsByPlayer,
  };
}

export function computeHoleResults(game) {
  return game.holes.map((hole) => computeHoleResult(hole, hole.positions || {}));
}

// Turns a set of final $ balances (which always sum to ~0 for LLRR, since every hole
// nets to zero across all four players) into the smallest set of payments that settles
// everyone up exactly: largest creditor paid by largest debtor, repeatedly, until both
// are zeroed out. Unlike coins' settle-up (a deliberate "pay every other player" model,
// since a coin's value isn't inherently split across a single opponent), LLRR's margin
// on a hole IS already the full head-to-head swing -- so a player's final net is their
// real payout, and this settles it with the minimum number of $ handoffs rather than
// multiplying it by the number of opponents.
export function settleUpFromNet(net, playerIds) {
  const EPSILON = 1e-9;
  const creditors = playerIds
    .map((id) => ({ id, amount: net[id] }))
    .filter((b) => b.amount > EPSILON)
    .sort((a, b) => b.amount - a.amount);
  const debtors = playerIds
    .map((id) => ({ id, amount: -net[id] }))
    .filter((b) => b.amount > EPSILON)
    .sort((a, b) => b.amount - a.amount);

  const settleUp = [];
  let ci = 0;
  let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const credit = creditors[ci];
    const debt = debtors[di];
    const amount = Math.min(credit.amount, debt.amount);
    settleUp.push({ fromId: debt.id, toId: credit.id, amount });
    credit.amount -= amount;
    debt.amount -= amount;
    if (credit.amount <= EPSILON) ci++;
    if (debt.amount <= EPSILON) di++;
  }
  return settleUp;
}

// Running point total per player across the round, the $ value of that total using the
// game's llrrPointValue, and a settle-up list ({ fromId, toId, amount }) for the
// summary screen.
export function summarizeLLRR(game) {
  const results = computeHoleResults(game);

  const totals = {};
  game.playerIds.forEach((id) => {
    totals[id] = 0;
  });

  results.forEach((result) => {
    if (!result.resolved) return;
    Object.entries(result.pointsByPlayer).forEach(([playerId, points]) => {
      totals[playerId] = (totals[playerId] || 0) + points;
    });
  });

  const pointValue = game.llrrPointValue || 0;
  const net = {};
  game.playerIds.forEach((id) => {
    net[id] = totals[id] * pointValue;
  });

  const settleUp = settleUpFromNet(net, game.playerIds);

  return { results, totals, net, settleUp };
}
