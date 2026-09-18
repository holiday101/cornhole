import { useCallback, useMemo, useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Screen from '../components/Screen';
import { colors, radius, spacing, typography } from '../theme';
import { getPeople, addPerson, setFavorite } from '../api/people';
import { ApiError } from '../api/client';

export default function FriendsScreen({ navigation }) {
  const [people, setPeople] = useState([]);
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      const { people: list } = await getPeople();
      setPeople(list);
    } catch (e) {
      setError('Could not load the directory.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return people;
    return people.filter((p) => p.name.toLowerCase().includes(q));
  }, [people, search]);

  const handleAdd = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName || !trimmedEmail) return;
    setError('');
    setInfo('');
    setAdding(true);
    try {
      const result = await addPerson(trimmedName, trimmedEmail);
      setName('');
      setEmail('');
      if (result && result.created) {
        setInfo(`Added ${result.person.name} and sent them an invite.`);
      } else if (result) {
        setInfo(`${result.person.name} was already in the directory — added to your favorites.`);
      }
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not add that person.');
    } finally {
      setAdding(false);
    }
  };

  const toggleFavorite = async (person) => {
    setBusyId(person.id);
    setError('');
    const next = !person.isFavorite;
    setPeople((prev) => prev.map((p) => (p.id === person.id ? { ...p, isFavorite: next } : p)));
    try {
      await setFavorite(person.id, next);
    } catch (e) {
      setPeople((prev) => prev.map((p) => (p.id === person.id ? { ...p, isFavorite: !next } : p)));
      setError(e instanceof ApiError ? e.message : 'Could not update favorites.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Text style={[typography.title, styles.title]}>People</Text>
        <Text style={styles.hint}>
          Everyone in the app is here. Star your regulars to favorite them for quick picks in New
          Game, or add someone by name and email — they'll show up right away, even before they
          sign up.
        </Text>

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search people"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          style={[styles.input, styles.searchInput]}
        />

        <View style={styles.addRow}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Name"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, styles.nameInput]}
            returnKeyType="next"
          />
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            style={[styles.input, styles.emailInput]}
            returnKeyType="done"
            onSubmitEditing={handleAdd}
          />
          <Pressable onPress={handleAdd} style={styles.addBtn} hitSlop={8}>
            <Text style={styles.addBtnText}>{adding ? '…' : 'Add'}</Text>
          </Pressable>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {info ? <Text style={styles.infoText}>{info}</Text> : null}

        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={filtered.length === 0 && styles.emptyContainer}
          ListEmptyComponent={
            !loading && (
              <Text style={styles.emptyText}>
                {people.length === 0
                  ? 'Nobody in the directory yet. Add someone by name and email.'
                  : 'No matches.'}
              </Text>
            )
          }
          renderItem={({ item }) => (
            <View style={styles.personRow}>
              <Pressable
                style={styles.personInfo}
                onPress={() => navigation.navigate('PlayerStats', { playerId: item.id, playerName: item.name })}
              >
                <Text style={styles.personName}>{item.name}</Text>
                {item.isPlaceholder ? <Text style={styles.invitedBadge}>Invited</Text> : null}
              </Pressable>
              <Pressable
                onPress={() => toggleFavorite(item)}
                disabled={busyId === item.id}
                style={styles.starBtn}
                hitSlop={8}
              >
                <Text style={[styles.star, item.isFavorite && styles.starActive]}>
                  {item.isFavorite ? '★' : '☆'}
                </Text>
              </Pressable>
            </View>
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
  input: {
    height: 56,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: 16,
  },
  searchInput: {
    marginBottom: spacing.sm,
  },
  addRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  nameInput: {
    flex: 1,
    marginRight: spacing.sm,
  },
  emailInput: {
    flex: 1,
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
  infoText: {
    color: colors.primary,
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  personInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  personName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  invitedBadge: {
    marginLeft: spacing.sm,
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  starBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  star: {
    fontSize: 24,
    color: colors.textMuted,
  },
  starActive: {
    color: colors.primary,
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
