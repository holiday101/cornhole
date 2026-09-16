import { useCallback, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Screen from '../components/Screen';
import ConfirmDialog from '../components/ConfirmDialog';
import { colors, radius, spacing, typography } from '../theme';
import { getAdminUsers, setUserRole, deleteUser } from '../api/admin';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';

export default function AdminUsersScreen({ navigation }) {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  const load = useCallback(async () => {
    try {
      const { users: list } = await getAdminUsers();
      setUsers(list);
      setError('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const toggleRole = async (target) => {
    const nextRole = target.role === 'admin' ? 'user' : 'admin';
    setError('');
    setBusyId(target.id);
    try {
      await setUserRole(target.id, nextRole);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not change that role.');
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    const target = pendingDelete;
    setPendingDelete(null);
    setError('');
    setBusyId(target.id);
    try {
      await deleteUser(target.id);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not delete that user.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Screen>
      <Text style={[typography.title, styles.title]}>Manage Users</Text>
      <Text style={styles.hint}>
        Promote a friend to admin, or remove an account. Any courses they created move to
        you. Users with game history can't be deleted -- change their role instead.
      </Text>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <FlatList
        data={users}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={users.length === 0 && styles.emptyContainer}
        ListEmptyComponent={
          !loading && <Text style={styles.emptyText}>No users found.</Text>
        }
        renderItem={({ item }) => {
          const isSelf = item.id === me.id;
          const isBusy = busyId === item.id;
          return (
            <View style={styles.row}>
              <View style={styles.rowHeader}>
                <Text style={styles.name}>
                  {item.name}
                  {isSelf ? ' (you)' : ''}
                </Text>
                <View style={[styles.roleBadge, item.role === 'admin' && styles.roleBadgeAdmin]}>
                  <Text style={styles.roleBadgeText}>{item.role}</Text>
                </View>
              </View>
              <Text style={styles.email}>{item.email}</Text>
              <Text style={styles.meta}>
                {item.games_played} games · {item.courses_created} courses · {item.friend_count} friends
              </Text>

              <View style={styles.actions}>
                <Pressable
                  onPress={() => navigation.navigate('AdminUserFriends', { userId: item.id, userName: item.name })}
                  style={[styles.actionBtn, styles.roleBtn]}
                >
                  <Text style={styles.roleBtnText}>Friends</Text>
                </Pressable>
                {!isSelf && (
                  <>
                    <Pressable
                      onPress={() => toggleRole(item)}
                      disabled={isBusy}
                      style={[styles.actionBtn, styles.roleBtn]}
                    >
                      <Text style={styles.roleBtnText}>
                        {isBusy ? '…' : item.role === 'admin' ? 'Make user' : 'Make admin'}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setPendingDelete(item)}
                      disabled={isBusy}
                      style={[styles.actionBtn, styles.deleteBtn]}
                    >
                      <Text style={styles.deleteBtnText}>{isBusy ? '…' : 'Delete'}</Text>
                    </Pressable>
                  </>
                )}
              </View>
            </View>
          );
        }}
      />

      <ConfirmDialog
        visible={!!pendingDelete}
        title="Delete this user?"
        message={
          pendingDelete
            ? `${pendingDelete.name} <${pendingDelete.email}> will be permanently removed. This can't be undone.`
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
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  roleBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.surfaceAlt,
  },
  roleBadgeAdmin: {
    backgroundColor: colors.primaryDark,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    textTransform: 'uppercase',
  },
  email: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  meta: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.md,
  },
  actionBtn: {
    minHeight: 44,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  roleBtn: {
    backgroundColor: colors.surfaceAlt,
  },
  roleBtnText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 14,
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
