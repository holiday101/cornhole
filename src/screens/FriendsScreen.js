import { useCallback, useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Screen from '../components/Screen';
import { colors, radius, spacing, typography } from '../theme';
import { getContacts, addContact } from '../api/contacts';
import { ApiError } from '../api/client';

export default function FriendsScreen({ navigation }) {
  const [contacts, setContacts] = useState([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      const { contacts: list } = await getContacts();
      setContacts(list);
    } catch (e) {
      setError('Could not load friends.');
    } finally {
      setLoading(false);
    }
  }, []);

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
      await addContact(trimmed);
      setEmail('');
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not add that friend.');
    } finally {
      setAdding(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Text style={[typography.title, styles.title]}>Friends</Text>
        <Text style={styles.hint}>
          Add someone by the email they signed up with. They'll show up here for every future
          game. Tap a friend to see their stats.
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
            !loading && (
              <Text style={styles.emptyText}>
                No friends yet. Add someone by email to start playing together.
              </Text>
            )
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.friendRow}
              onPress={() =>
                navigation.navigate('PlayerStats', { playerId: item.id, playerName: item.name })
              }
            >
              <Text style={styles.friendName}>{item.name}</Text>
              <Text style={styles.friendEmail}>{item.email}</Text>
            </Pressable>
          )}
        />
      </KeyboardAvoidingView>
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
