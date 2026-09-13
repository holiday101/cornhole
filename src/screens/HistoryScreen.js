import { useCallback, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Screen from '../components/Screen';
import ConfirmDialog from '../components/ConfirmDialog';
import { colors, radius, spacing, typography } from '../theme';
import { getGames, deleteGame } from '../api/games';
import { useAuth } from '../auth/AuthContext';
import { totalScore } from '../logic/beans';

export default function HistoryScreen({ navigation }) {
  const { user } = useAuth();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState(null);

  const load = useCallback(async () => {
    const { games: gameList } = await getGames();
    setGames(gameList.slice().sort((a, b) => new Date(b.date) - new Date(a.date)));
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    await deleteGame(pendingDelete.id);
    setPendingDelete(null);
    load();
  };

  const openGame = (game) => {
    if (game.completed) {
      navigation.navigate('GameSummary', { gameId: game.id });
    } else {
      navigation.navigate('Scorecard', { gameId: game.id });
    }
  };

  const editGame = (game) => {
    navigation.navigate('Scorecard', { gameId: game.id, editMode: true });
  };

  return (
    <Screen>
      <Text style={[typography.title, styles.title]}>Game History</Text>
      {games.length > 0 && <Text style={styles.hint}>Tap to open · long press to delete</Text>}

      <FlatList
        data={games}
        keyExtractor={(item) => item.id}
        contentContainerStyle={games.length === 0 && styles.emptyContainer}
        ListEmptyComponent={
          !loading && <Text style={styles.emptyText}>No games played yet.</Text>
        }
        renderItem={({ item }) => {
          const names = item.players.map((p) => p.name).join(', ');
          const canDelete = item.creatorUserId === user.id;
          const dateLabel = new Date(item.date).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });
          const finalScores = item.completed
            ? item.playerIds
                .map((pid) => ({
                  name: item.players.find((p) => p.id === pid)?.name || 'Unknown',
                  score: totalScore(item.holes, pid),
                }))
                .sort((a, b) => a.score - b.score)
            : null;
          return (
            <View style={styles.row}>
              <Pressable
                onPress={() => openGame(item)}
                onLongPress={() => canDelete && setPendingDelete(item)}
              >
                <View style={styles.rowHeader}>
                  <Text style={styles.rowTitle}>
                    {item.holesCount} holes · {dateLabel}
                  </Text>
                  <Text
                    style={[
                      styles.statusBadge,
                      item.completed ? styles.statusDone : styles.statusProgress,
                    ]}
                  >
                    {item.completed ? 'Completed' : 'In Progress'}
                  </Text>
                </View>
                <Text style={styles.rowPlayers} numberOfLines={1}>
                  {names}
                </Text>
                {finalScores && (
                  <Text style={styles.rowScores} numberOfLines={1}>
                    {finalScores.map((s) => `${s.name} ${s.score}`).join(' · ')}
                  </Text>
                )}
              </Pressable>

              {item.completed && (
                <View style={styles.actionsRow}>
                  <Pressable style={styles.actionBtn} onPress={() => openGame(item)}>
                    <Text style={styles.actionBtnText}>View</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionBtn, styles.actionBtnPrimary]}
                    onPress={() => editGame(item)}
                  >
                    <Text style={[styles.actionBtnText, styles.actionBtnPrimaryText]}>Edit</Text>
                  </Pressable>
                </View>
              )}
            </View>
          );
        }}
      />

      <ConfirmDialog
        visible={!!pendingDelete}
        title="Delete game"
        message="Remove this round from history?"
        confirmLabel="Delete"
        destructive
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: spacing.md,
  },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  rowPlayers: {
    marginTop: spacing.xs,
    fontSize: 14,
    color: colors.textMuted,
  },
  rowScores: {
    marginTop: spacing.xs,
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent,
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  actionBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  actionBtnPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  actionBtnText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  actionBtnPrimaryText: {
    color: colors.background,
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  statusDone: {
    backgroundColor: colors.primaryDark,
    color: colors.white,
  },
  statusProgress: {
    backgroundColor: colors.surfaceAlt,
    color: colors.accent,
  },
  emptyContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 16,
  },
});
