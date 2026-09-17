// Combines coins and beans into one combined "who owes who" list (settleUp),
// plus a grandTotal list that folds LLRR in too, one number per pair.
//
// Coins and beans are both settled by comparing every PAIR independently
// (whoever's total is lower owes the other the exact gap, regardless of what
// anyone else has), so adding them together per pair is still one real
// payment -- that's settleUp. LLRR settles completely differently: its net is
// a real zero-sum $ swing, reduced to the minimum number of payments (a
// player at -$1 pays whichever single player holds the matching +$1, not
// everyone), which can land on a different counterparty than who you owe in
// coins/beans. grandTotal adds LLRR's own settle-up amount for a pair (if any)
// on top of that pair's coins+beans gap, so each pair ends up with exactly one
// net number covering every side-game at once.
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

  function coinsBeansGap(x, y) {
    return (
      (coinSummary.net[y] || 0) -
      (coinSummary.net[x] || 0) +
      ((beansSummary.net[y] || 0) - (beansSummary.net[x] || 0))
    );
  }

  const settleUp = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const x = ids[i];
      const y = ids[j];
      const amount = coinsBeansGap(x, y);
      if (amount > EPSILON) settleUp.push({ fromId: x, toId: y, amount });
      else if (amount < -EPSILON) settleUp.push({ fromId: y, toId: x, amount: -amount });
    }
  }

  // LLRR's own settle-up, keyed by pair, storing the raw {fromId, toId,
  // amount}. The sign relative to any given (x, y) is derived at lookup time
  // (llrrAmountFor) by comparing against the stored fromId directly -- pairKey
  // only normalizes which key to look under, it says nothing about direction,
  // so a signed value fixed at storage time would silently flip whenever (x,
  // y) below is passed in the opposite order from how pairKey happened to
  // normalize it.
  const llrrByPair = {};
  if (llrrSummary) {
    llrrSummary.settleUp.forEach((t) => {
      llrrByPair[pairKey(t.fromId, t.toId)] = t;
    });
  }

  function llrrAmountFor(x, y) {
    const entry = llrrByPair[pairKey(x, y)];
    if (!entry) return 0;
    return entry.fromId === x ? entry.amount : -entry.amount;
  }

  const grandTotal = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const x = ids[i];
      const y = ids[j];
      const amount = coinsBeansGap(x, y) + llrrAmountFor(x, y);
      if (amount > EPSILON) grandTotal.push({ fromId: x, toId: y, amount });
      else if (amount < -EPSILON) grandTotal.push({ fromId: y, toId: x, amount: -amount });
    }
  }

  return { settleUp, grandTotal };
}
