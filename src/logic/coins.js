// Coins: single-possession $1 chips. Unlike beans, a coin is awarded to a player on
// a specific hole and stays with them — on every later hole — until someone else is
// awarded that same coin. There is only ever one holder of a given coin at a time.
//
// Positive coins reward good shots; negative coins mark bad ones. Every coin (either
// kind) is worth $1. A player's "net" for the round is the $1 value of every coin
// they hold at the end, added up. Settling up: for every pair of players, whoever's
// net is lower pays the other the exact gap between their two nets (nothing if
// tied). That always closes to zero across the whole group, and is equivalent to
// paying every other player $1 for every coin you hold — just collapsed into one
// payment per pair instead of one per coin.

// Longest Drive and G.I.R. (green in regulation) aren't here on purpose -- they're
// already tracked as "beans" (see BEAN_FIELDS in ScorecardScreen), a different,
// winner-of-the-hole mechanic. Adding them again as coins would double up the same
// idea under two different UIs.
export const COIN_TYPES = [
  { key: 'birdie', label: 'Birdie', positive: true },
  { key: 'one_putt', label: 'One Putt', positive: true },
  { key: 'three_pars_in_row', label: '3 Pars in a Row', positive: true },
  { key: 'eagle', label: 'Eagle', positive: true },
  { key: 'sand_save', label: 'Sand Save', positive: true },
  { key: 'chip_in', label: 'Chip In', positive: true },
  { key: 'lowest_score', label: 'Lowest Score', positive: true },
  { key: 'wild_card', label: 'Wild Card', positive: true },
  { key: 'putt_off', label: 'Putt Off', positive: true },
  { key: 'par_tee', label: 'Par-Tee', positive: true },
  { key: 'seven', label: 'Seven', positive: true },
  { key: 'three_putt', label: '3-Putt', positive: false },
  { key: 'sand', label: 'Sand', positive: false },
  { key: 'tree', label: 'Tree', positive: false },
  { key: 'man_made', label: 'Man Made', positive: false },
  { key: 'out_of_bounds', label: 'Out of Bounds', positive: false },
  { key: 'water', label: 'Water', positive: false },
  { key: 'score_8', label: 'Score an 8', positive: false },
  { key: 'highest_score', label: 'Highest Score', positive: false },
  { key: 'skull', label: 'Skull', positive: false },
  { key: 'beer', label: 'Beer', positive: false },
  { key: 'grave_digger', label: 'Grave Digger', positive: false },
  { key: 'worm_burner', label: 'Worm Burner', positive: false },
  { key: 'lost_ball', label: 'Lost Ball', positive: false },
];

export const POSITIVE_COINS = COIN_TYPES.filter((c) => c.positive);
export const NEGATIVE_COINS = COIN_TYPES.filter((c) => !c.positive);

const COIN_BY_KEY = Object.fromEntries(COIN_TYPES.map((c) => [c.key, c]));

// Coin types selected for a game (see NewGameScreen's chip picker). `game.enabledCoins`
// missing/non-array means "all" -- games created before chip selection existed.
export function enabledCoinTypes(game) {
  if (!Array.isArray(game?.enabledCoins)) return COIN_TYPES;
  const enabled = new Set(game.enabledCoins);
  return COIN_TYPES.filter((c) => enabled.has(c.key));
}

export function coinValue(coinKeyOrType) {
  const coin = typeof coinKeyOrType === 'string' ? COIN_BY_KEY[coinKeyOrType] : coinKeyOrType;
  return coin?.positive ? 1 : -1;
}

// Running possession per coin as of each hole. Returns an array parallel to `holes`;
// each entry maps coinKey -> the userId currently holding it as of (and including)
// that hole, or null if nobody has ever been awarded it yet.
export function computeCoinHolders(holes) {
  const current = {};
  COIN_TYPES.forEach((c) => {
    current[c.key] = null;
  });

  return holes.map((hole) => {
    COIN_TYPES.forEach((c) => {
      const awarded = hole.coins ? hole.coins[c.key] : undefined;
      if (awarded !== undefined && awarded !== null) {
        current[c.key] = awarded;
      }
    });
    return { ...current };
  });
}

// Each player's net $ balance for a given holders snapshot (e.g. one entry from
// computeCoinHolders) -- used to show the running total as of the hole being viewed,
// not just the final one summarizeCoins reports.
export function computeCoinNet(holders, playerIds) {
  const net = {};
  playerIds.forEach((id) => {
    net[id] = 0;
  });
  COIN_TYPES.forEach((c) => {
    const holderId = holders[c.key];
    if (holderId !== null && holderId !== undefined && net[holderId] !== undefined) {
      net[holderId] += coinValue(c);
    }
  });
  return net;
}

// Final holders + each player's net $ balance + a pairwise settle-up list.
export function summarizeCoins(game) {
  const holderStates = computeCoinHolders(game.holes);
  const finalHolders =
    holderStates.length > 0
      ? holderStates[holderStates.length - 1]
      : Object.fromEntries(COIN_TYPES.map((c) => [c.key, null]));

  const net = {};
  const coinsByPlayer = {};
  game.playerIds.forEach((id) => {
    net[id] = 0;
    coinsByPlayer[id] = [];
  });

  COIN_TYPES.forEach((c) => {
    const holderId = finalHolders[c.key];
    if (holderId !== null && holderId !== undefined && net[holderId] !== undefined) {
      net[holderId] += coinValue(c);
      coinsByPlayer[holderId].push(c.key);
    }
  });

  const settleUp = [];
  const ids = game.playerIds;
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const diff = net[ids[j]] - net[ids[i]];
      if (diff > 0) settleUp.push({ fromId: ids[i], toId: ids[j], amount: diff });
      else if (diff < 0) settleUp.push({ fromId: ids[j], toId: ids[i], amount: -diff });
    }
  }

  return { finalHolders, net, coinsByPlayer, settleUp };
}
