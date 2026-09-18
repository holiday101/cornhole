import { useCallback, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Screen from '../components/Screen';
import ConfirmDialog from '../components/ConfirmDialog';
import { colors, radius, spacing, typography } from '../theme';
import { getAdminGames } from '../api/admin';
import { deleteGame } from '../api/games';
import { ApiError } from '../api/client';

export default function AdminGamesScreen() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  const load = useCallback(async () => {
    try {
      const { games: list } = await getAdminGames();
      setGames(list);
      setError('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load games.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const confirmDelete = async () => {
    const target = pendingDelete;
    setPendingDelete(null);
    setError('');
    setBusyId(target.id);
    try {
      await deleteGame(target.id);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not delete that game.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Screen>
      <Text style={[typography.title, styles.title]}>Manage Games</Text>
      <Text style={styles.hint}>
        Every game in the system, including ones you're not a player in. Deleting a game
        removes its scores and history permanently.
      </Text>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <FlatList
        data={games}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={games.length === 0 && styles.emptyContainer}
        ListEmptyComponent={!loading && <Text style={styles.emptyText}>No games found.</Text>}
        renderItem={({ item }) => {
          const isBusy = busyId === item.id;
          const dateLabel = new Date(item.date.replace(' ', 'T') + 'Z').toLocaleDateString(
            undefined,
            { month: 'short', day: 'numeric', year: 'numeric' }
          );
          return (
            <View style={styles.row}>
              <View style={styles.rowHeader}>
                <Text style={styles.title2}>
                  {item.holes_count} holes · {dateLabel}
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
              <Text style={styles.meta}>{item.course_name || 'No course'} · {item.variant}</Text>
              <Text style={styles.players} numberOfLines={1}>
                {item.player_names || 'No players'}
              </Text>

              <View style={styles.actions}>
                <Pressable
                  onPress={() => setPendingDelete(item)}
                  disabled={isBusy}
                  style={[styles.actionBtn, styles.deleteBtn]}
                >
                  <Text style={styles.deleteBtnText}>{isBusy ? '…' : 'Delete'}</Text>
                </Pressable>
              </View>
            </View>
          );
        }}
      />

      <ConfirmDialog
        visible={!!pendingDelete}
        title="Delete this game?"
        message={
          pendingDelete
            ? `This round (${pendingDelete.player_names || 'no players'}) will be permanently deleted. This can't be undone.`
            : ''
        }
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
    fontSize: 14,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    marginBottom: spacing.sm,
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
  title2: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  meta: {
    marginTop: spacing.xs,
    fontSize: 13,
    color: colors.textMuted,
  },
  players: {
    marginTop: spacing.xs,
    fontSize: 14,
    color: colors.text,
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
  actions: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  actionBtn: {
    minHeight: 44,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  deleteBtn: {
    backgroundColor: colors.danger,
  },
  deleteBtnText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  emptyContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
});
