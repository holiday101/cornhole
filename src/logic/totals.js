// Combines coins and beans into one combined "who owes who" list. Coins and
// beans are both settled by comparing every PAIR independently (whoever's
// total is lower owes the other the exact gap, regardless of what anyone else
// has), so adding them together per pair still produces one real payment.
//
// LLRR is deliberately NOT part of this: its net is a real zero-sum $ swing,
// reduced to the minimum number of payments (a player at -$1 pays whichever
// single player holds the matching +$1, not everyone) -- which can land on a
// different counterparty than who you owe in coins/beans. It keeps its own
// settle-up (see summarizeLLRR) and is rendered as its own separate list.
import { summarizeBeans } from './beans';
import { summarizeCoins } from './coins';

const EPSILON = 1e-9;

export function summarizeTotalOwed(game) {
  const coinSummary = summarizeCoins(game);
  const beansSummary = summarizeBeans(game);
  const ids = game.playerIds;

  const settleUp = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const x = ids[i];
      const y = ids[j];
      const amount =
        (coinSummary.net[y] || 0) -
        (coinSummary.net[x] || 0) +
        ((beansSummary.net[y] || 0) - (beansSummary.net[x] || 0));

      if (amount > EPSILON) settleUp.push({ fromId: x, toId: y, amount });
      else if (amount < -EPSILON) settleUp.push({ fromId: y, toId: x, amount: -amount });
    }
  }

  return { settleUp };
}
