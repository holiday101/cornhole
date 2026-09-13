import { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Screen from '../components/Screen';
import PrimaryButton from '../components/PrimaryButton';
import Chip from '../components/Chip';
import { colors, spacing, typography } from '../theme';
import { getCourses } from '../api/courses';
import { getContacts } from '../api/contacts';
import { createGame } from '../api/games';
import { ApiError } from '../api/client';

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 4;

function variantOptionsFor(course) {
  if (!course) {
    return [
      { value: 'front9', label: '9 holes' },
      { value: 'full18', label: '18 holes' },
    ];
  }
  if (course.holesCount === 9) {
    return [{ value: 'front9', label: '9 holes' }];
  }
  return [
    { value: 'front9', label: 'Front Nine' },
    { value: 'back9', label: 'Back Nine' },
    { value: 'full18', label: 'Full 18' },
  ];
}

export default function NewGameScreen({ navigation }) {
  const [courses, setCourses] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [variant, setVariant] = useState('front9');
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getCourses().then(({ courses: list }) => setCourses(list));
      getContacts().then(({ contacts: list }) => setContacts(list));
    }, [])
  );

  const selectedCourse = courses.find((c) => c.id === selectedCourseId) || null;
  const variantOptions = variantOptionsFor(selectedCourse);

  useEffect(() => {
    if (!variantOptions.some((o) => o.value === variant)) {
      setVariant(variantOptions[0].value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourseId]);

  const toggle = (id) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id);
      if (prev.length >= MAX_PLAYERS - 1) return prev;
      return [...prev, id];
    });
  };

  const canStart = selected.length + 1 >= MIN_PLAYERS && selected.length + 1 <= MAX_PLAYERS;

  const handleStart = async () => {
    setError('');
    setSubmitting(true);
    try {
      const { game } = await createGame({
        courseId: selectedCourseId,
        variant,
        playerUserIds: selected,
      });
      navigation.replace('Scorecard', { gameId: game.id });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not start the game.');
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <Text style={[typography.title, styles.title]}>New Game</Text>

      <Text style={typography.label}>COURSE</Text>
      <View style={styles.chipRow}>
        <Chip
          label="No Course"
          selected={selectedCourseId === null}
          onPress={() => setSelectedCourseId(null)}
        />
        {courses.map((c) => (
          <Chip
            key={c.id}
            label={c.name}
            selected={selectedCourseId === c.id}
            onPress={() => setSelectedCourseId(c.id)}
          />
        ))}
      </View>

      <Text style={[typography.label, styles.holesLabel]}>HOLES</Text>
      <View style={styles.chipRow}>
        {variantOptions.map((o) => (
          <Chip key={o.value} label={o.label} selected={variant === o.value} onPress={() => setVariant(o.value)} />
        ))}
      </View>

      <Text style={[typography.label, styles.playersLabel]}>
        PLAYERS ({selected.length + 1}/{MAX_PLAYERS}, min {MIN_PLAYERS}) — you're always included
      </Text>

      {contacts.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>
            No friends yet. Add someone from the Friends screen to play with them.
          </Text>
          <PrimaryButton
            title="Go to Friends"
            variant="outline"
            onPress={() => navigation.navigate('Friends')}
            style={{ marginTop: spacing.md }}
          />
        </View>
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          renderItem={({ item }) => (
            <View style={{ flex: 1 }}>
              <Chip
                label={item.name}
                selected={selected.includes(item.id)}
                onPress={() => toggle(item.id)}
                disabled={!selected.includes(item.id) && selected.length >= MAX_PLAYERS - 1}
              />
            </View>
          )}
        />
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <PrimaryButton
        title={submitting ? 'Starting…' : 'Start Game'}
        onPress={handleStart}
        disabled={!canStart || submitting}
        style={styles.startBtn}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  holesLabel: {},
  playersLabel: {
    marginBottom: spacing.sm,
  },
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 16,
    textAlign: 'center',
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  startBtn: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
});
