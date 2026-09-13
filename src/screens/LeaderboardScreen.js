import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import Screen from '../components/Screen';
import { colors, radius, spacing, typography } from '../theme';
import { getGames } from '../api/games';
import { buildPlayerStatsMap } from '../logic/stats';

function Ranking({ title, players, navigation, renderValue }) {
  if (players.length === 0) return null;
  return (
    <>
      <Text style={[typography.label, styles.sectionLabel]}>{title}</Text>
      <View style={styles.card}>
        {players.map((p, i) => (
          <Pressable
            key={p.id}
            onPress={() => navigation.navigate('PlayerStats', { playerId: p.id, playerName: p.name })}
            style={[styles.row, i === 0 && styles.rowFirst]}
          >
            <Text style={styles.rank}>{i + 1}</Text>
            <Text style={styles.name} numberOfLines={1}>
              {p.name}
            </Text>
            <Text style={styles.value}>{renderValue(p)}</Text>
          </Pressable>
        ))}
      </View>
    </>
  );
}

function FunStat({ title, icon, player, count, navigation }) {
  if (!player || count <= 0) return null;
  return (
    <Pressable
      onPress={() => navigation.navigate('PlayerStats', { playerId: player.id, playerName: player.name })}
      style={styles.funCard}
    >
      <Text style={styles.funIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.funTitle}>{title}</Text>
        <Text style={styles.funPlayer}>{player.name}</Text>
      </View>
      <Text style={styles.funCount}>{count}</Text>
    </Pressable>
  );
}

function topByCount(players, key) {
  const ranked = players.filter((p) => p.beanBreakdown[key] > 0).sort((a, b) => b.beanBreakdown[key] - a.beanBreakdown[key]);
  return ranked[0] || null;
}

export default function LeaderboardScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    getGames()
      .then(({ games }) => setPlayers(Object.values(buildPlayerStatsMap(games))))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Screen>
        <Text style={styles.loadingText}>Loading...</Text>
      </Screen>
    );
  }

  if (players.length === 0) {
    return (
      <Screen>
        <Text style={[typography.title, styles.title]}>Leaderboard</Text>
        <Text style={styles.emptyText}>No completed games yet.</Text>
      </Screen>
    );
  }

  const byBeans = players.slice().sort((a, b) => b.totalBeans - a.totalBeans);
  const byAverage = players
    .filter((p) => p.gamesPlayed > 0)
    .slice()
    .sort((a, b) => a.avgPer18 - b.avgPer18);
  const byWins = players.slice().sort((a, b) => b.wins - a.wins);

  const drivePlayer = topByCount(players, 'longestDrive');
  const onePuttPlayer = topByCount(players, 'onePutt');
  const cirPlayer = topByCount(players, 'closestRegulation');

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={[typography.title, styles.title]}>Leaderboard</Text>
        <Text style={styles.meta}>All-time rankings from completed games</Text>

        <Ranking
          title="MOST BEANS"
          players={byBeans}
          navigation={navigation}
          renderValue={(p) => `🫘 ${p.totalBeans}`}
        />
        <Ranking
          title="LOWEST AVG SCORE (/18)"
          players={byAverage}
          navigation={navigation}
          renderValue={(p) => p.avgPer18.toFixed(1)}
        />
        <Ranking
          title="MOST WINS"
          players={byWins}
          navigation={navigation}
          renderValue={(p) => `${p.wins}-${p.losses}`}
        />

        <Text style={[typography.label, styles.sectionLabel]}>FUN STATS</Text>
        <FunStat
          title="Longest Drive King"
          icon="🚗"
          player={drivePlayer}
          count={drivePlayer?.beanBreakdown.longestDrive}
          navigation={navigation}
        />
        <FunStat
          title="One-Putt Wizard"
          icon="⛳"
          player={onePuttPlayer}
          count={onePuttPlayer?.beanBreakdown.onePutt}
          navigation={navigation}
        />
        <FunStat
          title="Closest in Regulation Champ"
          icon="🎯"
          player={cirPlayer}
          count={cirPlayer?.beanBreakdown.closestRegulation}
          navigation={navigation}
        />

        <View style={{ height: spacing.lg }} />
      </ScrollView>
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
  emptyText: {
    color: colors.textMuted,
    fontSize: 16,
    marginTop: spacing.lg,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowFirst: {
    borderTopWidth: 0,
  },
  rank: {
    width: 24,
    fontSize: 16,
    fontWeight: '700',
    color: colors.accent,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  value: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  funCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  funIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  funTitle: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  funPlayer: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  funCount: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.accent,
  },
});
