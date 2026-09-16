// Combines every $ side-game into one final balance per player: coins' net (see
// coins.js) plus Left Left Right Right's net (see llrr.js), when LLRR was played.
// Beans (longest drive, CIR, one-putt, hole winner) don't carry a $ value, so they
// aren't part of this total.
import { summarizeCoins } from './coins';
import { summarizeLLRR, settleUpFromNet } from './llrr';

export function summarizeTotalOwed(game) {
  const coinSummary = summarizeCoins(game);
  const llrrEnabled =
    game.playerIds.length === 4 && game.llrrPointValue !== null && game.llrrPointValue !== undefined;
  const llrrSummary = llrrEnabled ? summarizeLLRR(game) : null;

  const net = {};
  game.playerIds.forEach((id) => {
    net[id] = (coinSummary.net[id] || 0) + (llrrSummary ? llrrSummary.net[id] || 0 : 0);
  });

  const settleUp = settleUpFromNet(net, game.playerIds);

  return { net, settleUp };
}
