import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import Screen from '../components/Screen';
import PrimaryButton from '../components/PrimaryButton';
import { colors, radius, spacing, typography } from '../theme';
import { getGame } from '../api/games';
import { summarizeBeans, totalScore } from '../logic/beans';
import { summarizeCoins, COIN_TYPES } from '../logic/coins';
import { summarizeLLRR } from '../logic/llrr';

const COIN_LABELS = Object.fromEntries(COIN_TYPES.map((c) => [c.key, c]));

const BEAN_COLUMNS = [
  { key: 'longestDrive', label: 'Drive' },
  { key: 'closestRegulation', label: 'CIR' },
  { key: 'onePutt', label: '1-Putt' },
  { key: 'holeWinner', label: 'Holes' },
];

export default function GameSummaryScreen({ route, navigation }) {
  const { gameId } = route.params;
  const [game, setGame] = useState(null);
  const [playerMap, setPlayerMap] = useState({});

  useEffect(() => {
    getGame(gameId)
      .then(({ game: loadedGame }) => {
        const map = {};
        loadedGame.players.forEach((p) => (map[p.id] = p.name));
        setGame(loadedGame);
        setPlayerMap(map);
      })
      .catch(() => navigation.goBack());
  }, [gameId]);

  if (!game) {
    return (
      <Screen>
        <Text style={styles.loadingText}>Loading...</Text>
      </Screen>
    );
  }

  const { totals, breakdown, holeWinners, settleUp: beansSettleUp } = summarizeBeans(game);
  const beansEnabled = game.beansValue !== null && game.beansValue !== undefined;
  const coinSummary = summarizeCoins(game);
  const llrrEnabled =
    game.playerIds.length === 4 && game.llrrPointValue !== null && game.llrrPointValue !== undefined;
  const llrrSummary = llrrEnabled ? summarizeLLRR(game) : null;

  const leaderboard = game.playerIds
    .map((pid) => ({
      id: pid,
      name: playerMap[pid] || 'Unknown',
      strokes: totalScore(game.holes, pid),
      beans: totals[pid] || 0,
    }))
    .sort((a, b) => a.strokes - b.strokes);

  const dateLabel = new Date(game.date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={[typography.title, styles.title]}>Round Summary</Text>
        <Text style={styles.meta}>
          {dateLabel} · {game.holesCount} holes · {game.playerIds.length} players
        </Text>

        <Text style={[typography.label, styles.sectionLabel]}>LEADERBOARD (STROKES)</Text>
        <View style={styles.card}>
          {leaderboard.map((p, i) => (
            <View key={p.id} style={[styles.leaderRow, i === 0 && styles.leaderRowFirst]}>
              <Text style={styles.rank}>{i + 1}</Text>
              <Text style={styles.leaderName}>{p.name}</Text>
              <Text style={styles.leaderStrokes}>{p.strokes}</Text>
              <Text style={styles.leaderBeans}>🫘 {p.beans}</Text>
            </View>
          ))}
        </View>

        <Text style={[typography.label, styles.sectionLabel]}>BEAN BREAKDOWN</Text>
        <View style={styles.card}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableCell, styles.tableNameCell, styles.tableHeaderText]}>
              Player
            </Text>
            {BEAN_COLUMNS.map((col) => (
              <Text key={col.key} style={[styles.tableCell, styles.tableHeaderText]}>
                {col.label}
              </Text>
            ))}
            <Text style={[styles.tableCell, styles.tableHeaderText]}>Total</Text>
          </View>
          {game.playerIds.map((pid) => (
            <View key={pid} style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.tableNameCell]} numberOfLines={1}>
                {playerMap[pid] || 'Unknown'}
              </Text>
              {BEAN_COLUMNS.map((col) => (
                <Text key={col.key} style={styles.tableCell}>
                  {breakdown[pid]?.[col.key] ?? 0}
                </Text>
              ))}
              <Text style={[styles.tableCell, styles.tableTotalText]}>{totals[pid] || 0}</Text>
            </View>
          ))}
        </View>

        {beansEnabled && beansSettleUp.length > 0 && (
          <>
            <Text style={[typography.label, styles.sectionLabel]}>BEANS SETTLE UP</Text>
            <View style={styles.card}>
              {beansSettleUp.map((t, i) => (
                <View
                  key={`beans-${t.fromId}-${t.toId}`}
                  style={[styles.settleRow, i === 0 && styles.leaderRowFirst]}
                >
                  <Text style={styles.settleText}>
                    {(playerMap[t.fromId] || 'Unknown') + ' owes ' + (playerMap[t.toId] || 'Unknown')}
                  </Text>
                  <Text style={styles.settleAmount}>${t.amount.toFixed(2)}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={[typography.label, styles.sectionLabel]}>COIN BALANCES</Text>
        <View style={styles.card}>
          {game.playerIds.map((pid, i) => {
            const net = coinSummary.net[pid] || 0;
            const heldCoins = coinSummary.coinsByPlayer[pid] || [];
            return (
              <View key={pid} style={[styles.leaderRow, i === 0 && styles.leaderRowFirst]}>
                <View style={styles.coinPlayerCol}>
                  <Text style={styles.leaderName}>{playerMap[pid] || 'Unknown'}</Text>
                  {heldCoins.length > 0 && (
                    <Text style={styles.coinHeldList} numberOfLines={2}>
                      {heldCoins.map((key) => COIN_LABELS[key]?.label).join(', ')}
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.coinNetText,
                    net > 0 && styles.coinNetPositive,
                    net < 0 && styles.coinNetNegative,
                  ]}
                >
                  {net > 0 ? `+$${net}` : net < 0 ? `-$${Math.abs(net)}` : '$0'}
                </Text>
              </View>
            );
          })}
        </View>

        {coinSummary.settleUp.length > 0 && (
          <>
            <Text style={[typography.label, styles.sectionLabel]}>SETTLE UP</Text>
            <View style={styles.card}>
              {coinSummary.settleUp.map((t, i) => (
                <View
                  key={`${t.fromId}-${t.toId}`}
                  style={[styles.settleRow, i === 0 && styles.leaderRowFirst]}
                >
                  <Text style={styles.settleText}>
                    {(playerMap[t.fromId] || 'Unknown') + ' owes ' + (playerMap[t.toId] || 'Unknown')}
                  </Text>
                  <Text style={styles.settleAmount}>${t.amount}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {llrrEnabled && (
          <>
            <Text style={[typography.label, styles.sectionLabel]}>LEFT LEFT RIGHT RIGHT</Text>
            <View style={styles.card}>
              {game.playerIds.map((pid, i) => {
                const points = llrrSummary.totals[pid] || 0;
                const net = llrrSummary.net[pid] || 0;
                return (
                  <View key={pid} style={[styles.leaderRow, i === 0 && styles.leaderRowFirst]}>
                    <Text style={styles.leaderName}>{playerMap[pid] || 'Unknown'}</Text>
                    <Text style={styles.leaderStrokes}>
                      {points > 0 ? `+${points}` : points} pts
                    </Text>
                    <Text
                      style={[
                        styles.coinNetText,
                        net > 0 && styles.coinNetPositive,
                        net < 0 && styles.coinNetNegative,
                      ]}
                    >
                      {net > 0
                        ? `+$${net.toFixed(2)}`
                        : net < 0
                        ? `-$${Math.abs(net).toFixed(2)}`
                        : '$0.00'}
                    </Text>
                  </View>
                );
              })}
            </View>

            {llrrSummary.settleUp.length > 0 && (
              <>
                <Text style={[typography.label, styles.sectionLabel]}>LLRR SETTLE UP</Text>
                <View style={styles.card}>
                  {llrrSummary.settleUp.map((t, i) => (
                    <View
                      key={`llrr-${t.fromId}-${t.toId}`}
                      style={[styles.settleRow, i === 0 && styles.leaderRowFirst]}
                    >
                      <Text style={styles.settleText}>
                        {(playerMap[t.fromId] || 'Unknown') + ' owes ' + (playerMap[t.toId] || 'Unknown')}
                      </Text>
                      <Text style={styles.settleAmount}>${t.amount.toFixed(2)}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </>
        )}

        <Text style={[typography.label, styles.sectionLabel]}>HOLE BY HOLE</Text>
        <View style={styles.card}>
          {game.holes.map((hole, i) => {
            const result = holeWinners[i];
            return (
              <View
                key={hole.holeNumber}
                style={[styles.holeRow, i === 0 && styles.holeRowFirst]}
              >
                <View style={styles.holeRowHeader}>
                  <Text style={styles.holeRowTitle}>
                    Hole {hole.holeNumber}
                    {hole.par ? ` · Par ${hole.par}` : ''}
                  </Text>
                  {result.resolved && result.winnerId && (
                    <Text style={styles.holeRowWinner}>
                      🏆 {playerMap[result.winnerId]}
                    </Text>
                  )}
                  {result.resolved && result.tied && (
                    <Text style={styles.holeRowTied}>Tied</Text>
                  )}
                </View>
                <View style={styles.holePlayersRow}>
                  {game.playerIds.map((pid) => (
                    <View key={pid} style={styles.holePlayerCell}>
                      <Text style={styles.holePlayerName} numberOfLines={1}>
                        {playerMap[pid] || 'Unknown'}
                      </Text>
                      <Text style={styles.holePlayerScore}>{hole.scores[pid] ?? '–'}</Text>
                      <Text style={styles.holeBeanIcons}>
                        {hole.beans.longestDrive === pid ? '🚗 ' : ''}
                        {hole.beans.closestRegulation === pid ? '🎯 ' : ''}
                        {hole.beans.onePutt === pid ? '⛳' : ''}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
        </View>

        <View style={{ height: spacing.md }} />
      </ScrollView>

      <PrimaryButton title="Back to Home" onPress={() => navigation.popToTop()} style={styles.doneBtn} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  loadingText: {
    color: colors.textMuted,
    fontSize: 16,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  title: {
    marginTop: spacing.md,
  },
  meta: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  leaderRowFirst: {
    borderTopWidth: 0,
  },
  rank: {
    width: 24,
    fontSize: 16,
    fontWeight: '700',
    color: colors.accent,
  },
  leaderName: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  leaderStrokes: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginRight: spacing.md,
  },
  leaderBeans: {
    fontSize: 15,
    color: colors.textMuted,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.xs,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
  },
  tableCell: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
  },
  tableNameCell: {
    flex: 1.6,
    textAlign: 'left',
    fontWeight: '600',
  },
  tableHeaderText: {
    color: colors.textMuted,
    fontWeight: '700',
    fontSize: 12,
  },
  tableTotalText: {
    fontWeight: '700',
    color: colors.accent,
  },
  doneBtn: {
    marginBottom: spacing.md,
  },
  coinPlayerCol: {
    flex: 1,
  },
  coinHeldList: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  coinNetText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  coinNetPositive: {
    color: colors.primary,
  },
  coinNetNegative: {
    color: colors.danger,
  },
  settleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  settleText: {
    fontSize: 15,
    color: colors.text,
    flex: 1,
  },
  settleAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.danger,
    marginLeft: spacing.sm,
  },
  holeRow: {
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  holeRowFirst: {
    borderTopWidth: 0,
  },
  holeRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  holeRowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  holeRowWinner: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accent,
  },
  holeRowTied: {
    fontSize: 13,
    color: colors.textMuted,
  },
  holePlayersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  holePlayerCell: {
    width: '50%',
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  holePlayerName: {
    flex: 1,
    fontSize: 13,
    color: colors.textMuted,
  },
  holePlayerScore: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginRight: spacing.xs,
    marginLeft: spacing.xs,
  },
  holeBeanIcons: {
    fontSize: 12,
    width: 44,
  },
});
