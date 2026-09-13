import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import Screen from '../components/Screen';
import { colors, radius, spacing, typography } from '../theme';
import { getGames } from '../api/games';
import { statsForPlayer } from '../logic/stats';

const BEAN_ROWS = [
  { key: 'longestDrive', label: 'Longest Drive', icon: '🚗' },
  { key: 'closestRegulation', label: 'Closest in Regulation', icon: '🎯' },
  { key: 'onePutt', label: 'One Putt', icon: '⛳' },
  { key: 'holeWinner', label: 'Hole Wins', icon: '🏆' },
];

export default function PlayerStatsScreen({ route, navigation }) {
  const { playerId, playerName } = route.params;
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    navigation.setOptions({ title: playerName });
  }, [playerName]);

  useEffect(() => {
    getGames()
      .then(({ games }) => setStats(statsForPlayer(games, playerId, playerName)))
      .finally(() => setLoading(false));
  }, [playerId]);

  if (loading || !stats) {
    return (
      <Screen>
        <Text style={styles.loadingText}>Loading...</Text>
      </Screen>
    );
  }

  if (stats.gamesPlayed === 0) {
    return (
      <Screen>
        <Text style={[typography.title, styles.title]}>{playerName}</Text>
        <Text style={styles.emptyText}>No completed games yet.</Text>
      </Screen>
    );
  }

  const bestRoundDate = stats.bestRound
    ? new Date(stats.bestRound.date).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={[typography.title, styles.title]}>{playerName}</Text>
        <Text style={styles.meta}>{stats.gamesPlayed} games played</Text>

        <View style={styles.statGrid}>
          <StatTile label="Record" value={`${stats.wins}-${stats.losses}`} />
          <StatTile label="Total Beans" value={`🫘 ${stats.totalBeans}`} />
          <StatTile label="Avg / 9" value={stats.avgPer9.toFixed(1)} />
          <StatTile label="Avg / 18" value={stats.avgPer18.toFixed(1)} />
        </View>

        {stats.bestRound && (
          <>
            <Text style={[typography.label, styles.sectionLabel]}>BEST ROUND</Text>
            <View style={styles.card}>
              <View style={styles.bestRoundRow}>
                <Text style={styles.bestRoundScore}>{stats.bestRound.score}</Text>
                <View>
                  <Text style={styles.bestRoundMeta}>{stats.bestRound.holesCount} holes</Text>
                  <Text style={styles.bestRoundMeta}>{bestRoundDate}</Text>
                </View>
              </View>
            </View>
          </>
        )}

        <Text style={[typography.label, styles.sectionLabel]}>BEAN BREAKDOWN</Text>
        <View style={styles.card}>
          {BEAN_ROWS.map((row, i) => (
            <View key={row.key} style={[styles.beanRow, i === 0 && styles.beanRowFirst]}>
              <Text style={styles.beanIcon}>{row.icon}</Text>
              <Text style={styles.beanLabel}>{row.label}</Text>
              <Text style={styles.beanValue}>{stats.beanBreakdown[row.key]}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: spacing.lg }} />
      </ScrollView>
    </Screen>
  );
}

function StatTile({ label, value }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
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
  emptyText: {
    color: colors.textMuted,
    fontSize: 16,
    marginTop: spacing.lg,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.sm,
  },
  tile: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    marginRight: '4%',
  },
  tileValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  tileLabel: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  sectionLabel: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  bestRoundRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bestRoundScore: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.accent,
    marginRight: spacing.md,
  },
  bestRoundMeta: {
    fontSize: 13,
    color: colors.textMuted,
  },
  beanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  beanRowFirst: {
    borderTopWidth: 0,
  },
  beanIcon: {
    fontSize: 18,
    width: 28,
  },
  beanLabel: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  beanValue: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.accent,
  },
});
