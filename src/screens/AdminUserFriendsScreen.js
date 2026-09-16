import { useCallback, useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Screen from '../components/Screen';
import ConfirmDialog from '../components/ConfirmDialog';
import { colors, radius, spacing, typography } from '../theme';
import { getUserContacts, addUserContact, removeUserContact } from '../api/admin';
import { ApiError } from '../api/client';

export default function AdminUserFriendsScreen({ route }) {
  const { userId, userName } = route.params;
  const [contacts, setContacts] = useState([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [pendingRemove, setPendingRemove] = useState(null);

  const load = useCallback(async () => {
    try {
      const { contacts: list } = await getUserContacts(userId);
      setContacts(list);
      setError('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load friends.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleAdd = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    setError('');
    setAdding(true);
    try {
      await addUserContact(userId, trimmed);
      setEmail('');
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not add that friend.');
    } finally {
      setAdding(false);
    }
  };

  const confirmRemove = async () => {
    const friend = pendingRemove;
    setPendingRemove(null);
    setError('');
    try {
      await removeUserContact(userId, friend.id);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not remove that friend.');
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Text style={[typography.title, styles.title]}>{userName}'s Friends</Text>
        <Text style={styles.hint}>
          Connect two existing accounts, or remove a friend connection. Only accounts that
          have already signed up can be added this way.
        </Text>

        <View style={styles.addRow}>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Friend's email"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
            returnKeyType="done"
            onSubmitEditing={handleAdd}
          />
          <Pressable onPress={handleAdd} style={styles.addBtn} hitSlop={8}>
            <Text style={styles.addBtnText}>{adding ? '…' : 'Add'}</Text>
          </Pressable>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <FlatList
          data={contacts}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={contacts.length === 0 && styles.emptyContainer}
          ListEmptyComponent={
            !loading && <Text style={styles.emptyText}>No friends yet.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.friendRow}>
              <View>
                <Text style={styles.friendName}>{item.name}</Text>
                <Text style={styles.friendEmail}>{item.email}</Text>
              </View>
              <Pressable onPress={() => setPendingRemove(item)} style={styles.removeBtn} hitSlop={8}>
                <Text style={styles.removeBtnText}>Remove</Text>
              </Pressable>
            </View>
          )}
        />
      </KeyboardAvoidingView>

      <ConfirmDialog
        visible={!!pendingRemove}
        title="Remove this friend?"
        message={
          pendingRemove
            ? `${userName} and ${pendingRemove.name} will no longer be connected as friends.`
            : ''
        }
        confirmLabel="Remove"
        destructive
        onCancel={() => setPendingRemove(null)}
        onConfirm={confirmRemove}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    fontSize: 24,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: spacing.md,
  },
  addRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  input: {
    flex: 1,
    height: 56,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: 16,
    marginRight: spacing.sm,
  },
  addBtn: {
    minWidth: 72,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  addBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  friendName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  friendEmail: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  removeBtn: {
    minHeight: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    backgroundColor: colors.danger,
  },
  removeBtnText: {
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
