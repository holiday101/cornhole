// Combines every $ side-game into one final balance per player: coins' net (see
// coins.js), Left Left Right Right's net (see llrr.js) when LLRR was played, and
// beans' net (see beans.js) when beans were wagered.
//
// Coins and beans nets are "how much this player holds" (coinValue() * count),
// settled by comparing every PAIR independently (see their own settleUp) rather
// than against a shared pot -- so they generally do NOT sum to zero across the
// group (e.g. one player holding every coin nets everyone else $0, even though
// each of them owes the holder). Feeding raw values like that into
// settleUpFromNet -- which assumes a real zero-sum ledger, as LLRR's net already
// is -- would silently drop debts wherever there's no exact opposite balance to
// match against. rescaleToLedger() converts a pairwise-settled net into the
// equivalent zero-sum final position (N * net_i - sum(net)): this is exactly
// what each player would end up with if every one of their pairwise settle-up
// payments were actually paid, so it can be safely added alongside LLRR's net
// and passed to settleUpFromNet for a minimal combined settle-up.
import { summarizeBeans } from './beans';
import { summarizeCoins } from './coins';
import { summarizeLLRR, settleUpFromNet } from './llrr';

function rescaleToLedger(rawNet, playerIds) {
  const sum = playerIds.reduce((total, id) => total + (rawNet[id] || 0), 0);
  const n = playerIds.length;
  const scaled = {};
  playerIds.forEach((id) => {
    scaled[id] = n * (rawNet[id] || 0) - sum;
  });
  return scaled;
}

export function summarizeTotalOwed(game) {
  const coinSummary = summarizeCoins(game);
  const llrrEnabled =
    game.playerIds.length === 4 && game.llrrPointValue !== null && game.llrrPointValue !== undefined;
  const llrrSummary = llrrEnabled ? summarizeLLRR(game) : null;
  const beansSummary = summarizeBeans(game);

  const scaledCoinsNet = rescaleToLedger(coinSummary.net, game.playerIds);
  const scaledBeansNet = rescaleToLedger(beansSummary.net, game.playerIds);

  const net = {};
  game.playerIds.forEach((id) => {
    net[id] =
      scaledCoinsNet[id] + scaledBeansNet[id] + (llrrSummary ? llrrSummary.net[id] || 0 : 0);
  });

  const settleUp = settleUpFromNet(net, game.playerIds);

  return { net, settleUp };
}
