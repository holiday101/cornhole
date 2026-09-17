// Combines every $ side-game into one place: a per-player breakdown by category
// (coins, beans, LLRR), and a single combined "who owes who" list.
//
// Coins and beans are both "how much this player holds" nets, settled by comparing
// every PAIR independently (see their own settleUp): whoever's total is lower owes
// the other the exact gap, regardless of what anyone else has. LLRR is settled
// differently on purpose -- its net is a real zero-sum $ swing, so it's already
// reduced to the minimum number of payments (a player at -$1 pays whichever single
// player is holding the matching +$1, not everyone). This combines coins+beans'
// pairwise gap with LLRR's own settle-up (only for the specific pair it applies to)
// into one amount per pair, rather than forcing everything through one model.
import { summarizeBeans } from './beans';
import { summarizeCoins } from './coins';
import { summarizeLLRR } from './llrr';

const EPSILON = 1e-9;

function pairKey(a, b) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function summarizeTotalOwed(game) {
  const coinSummary = summarizeCoins(game);
  const beansSummary = summarizeBeans(game);
  const llrrEnabled =
    game.playerIds.length === 4 && game.llrrPointValue !== null && game.llrrPointValue !== undefined;
  const llrrSummary = llrrEnabled ? summarizeLLRR(game) : null;

  const ids = game.playerIds;

  const byPlayer = ids.map((id) => {
    const coins = coinSummary.net[id] || 0;
    const beans = beansSummary.net[id] || 0;
    const llrr = llrrSummary ? llrrSummary.net[id] || 0 : null;
    return { id, coins, beans, llrr, total: coins + beans + (llrr || 0) };
  });

  // LLRR's own settle-up, keyed by pair, as a signed amount from the lower-sorted
  // id to the higher-sorted one (positive = lower owes higher).
  const llrrByPair = {};
  if (llrrSummary) {
    llrrSummary.settleUp.forEach((t) => {
      const signed = t.fromId < t.toId ? t.amount : -t.amount;
      llrrByPair[pairKey(t.fromId, t.toId)] = signed;
    });
  }

  const settleUp = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const x = ids[i];
      const y = ids[j];
      let amount =
        (coinSummary.net[y] || 0) -
        (coinSummary.net[x] || 0) +
        ((beansSummary.net[y] || 0) - (beansSummary.net[x] || 0));
      amount += llrrByPair[pairKey(x, y)] || 0;

      if (amount > EPSILON) settleUp.push({ fromId: x, toId: y, amount });
      else if (amount < -EPSILON) settleUp.push({ fromId: y, toId: x, amount: -amount });
    }
  }

  return { byPlayer, settleUp, llrrEnabled };
}
