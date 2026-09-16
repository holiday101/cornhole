import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Screen from '../components/Screen';
import PrimaryButton from '../components/PrimaryButton';
import Chip from '../components/Chip';
import PokerChip from '../components/PokerChip';
import TextField from '../components/TextField';
import { colors, spacing, typography } from '../theme';
import { getCourses } from '../api/courses';
import { getContacts } from '../api/contacts';
import { createGame } from '../api/games';
import { ApiError } from '../api/client';
import { COIN_TYPES } from '../logic/coins';

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 4;
const ALL_COIN_KEYS = COIN_TYPES.map((c) => c.key);
const DEFAULT_LLRR_POINT_VALUE = '0.10';
const DEFAULT_BEANS_VALUE = '0.25';

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
  const [enabledCoins, setEnabledCoins] = useState(ALL_COIN_KEYS);
  const [llrrEnabled, setLlrrEnabled] = useState(true);
  const [llrrPointValueInput, setLlrrPointValueInput] = useState(DEFAULT_LLRR_POINT_VALUE);
  const [beansEnabled, setBeansEnabled] = useState(true);
  const [beansValueInput, setBeansValueInput] = useState(DEFAULT_BEANS_VALUE);
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
  const playerCount = selected.length + 1;
  const isFourPlayers = playerCount === MAX_PLAYERS;

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

  const toggleCoin = (key) => {
    setEnabledCoins((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const canStart = selected.length + 1 >= MIN_PLAYERS && selected.length + 1 <= MAX_PLAYERS;

  const handleStart = async () => {
    setError('');

    let llrrPointValue = null;
    if (isFourPlayers && llrrEnabled) {
      const trimmedLlrr = llrrPointValueInput.trim();
      const parsed = Number(trimmedLlrr);
      if (trimmedLlrr === '' || !Number.isFinite(parsed) || parsed < 0) {
        setError('Left Left Right Right $/point must be a positive number.');
        return;
      }
      llrrPointValue = parsed;
    }

    let beansValue = null;
    if (beansEnabled) {
      const trimmedBeans = beansValueInput.trim();
      const parsedBeans = Number(trimmedBeans);
      if (trimmedBeans === '' || !Number.isFinite(parsedBeans) || parsedBeans < 0) {
        setError('Beans $/bean must be a positive number.');
        return;
      }
      beansValue = parsedBeans;
    }

    setSubmitting(true);
    try {
      const { game } = await createGame({
        courseId: selectedCourseId,
        variant,
        playerUserIds: selected,
        llrrPointValue,
        enabledCoins,
        beansValue,
      });
      navigation.replace('Scorecard', { gameId: game.id });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not start the game.');
      setSubmitting(false);
    }
  };

  const positiveCoinDefs = COIN_TYPES.filter((c) => c.positive);
  const negativeCoinDefs = COIN_TYPES.filter((c) => !c.positive);

  return (
    <Screen>
      <Text style={[typography.title, styles.title]}>New Game</Text>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
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
          <View style={styles.contactsGrid}>
            {contacts.map((item) => (
              <View key={item.id} style={styles.contactItem}>
                <Chip
                  label={item.name}
                  selected={selected.includes(item.id)}
                  onPress={() => toggle(item.id)}
                  disabled={!selected.includes(item.id) && selected.length >= MAX_PLAYERS - 1}
                />
              </View>
            ))}
          </View>
        )}

        <Text style={[typography.label, styles.chipsLabel]}>CHIPS — TAP TO INCLUDE OR EXCLUDE</Text>
        <Text style={styles.chipsHint}>All chips are in play by default. + rewards a good shot, − marks a bad one.</Text>

        <Text style={styles.chipsSubLabel}>Positive</Text>
        <View style={styles.chipGrid}>
          {positiveCoinDefs.map((c) => (
            <PokerChip
              key={c.key}
              coinKey={c.key}
              label={c.label}
              positive
              selected={enabledCoins.includes(c.key)}
              onPress={() => toggleCoin(c.key)}
            />
          ))}
        </View>

        <Text style={styles.chipsSubLabel}>Negative</Text>
        <View style={styles.chipGrid}>
          {negativeCoinDefs.map((c) => (
            <PokerChip
              key={c.key}
              coinKey={c.key}
              label={c.label}
              positive={false}
              selected={enabledCoins.includes(c.key)}
              onPress={() => toggleCoin(c.key)}
            />
          ))}
        </View>

        <View style={styles.llrrBox}>
          <Text style={[typography.label, styles.llrrTitle]}>BEANS</Text>
          <Text style={styles.llrrHint}>
            Skins-style pot for longest drive, CIR, one-putt, and low score on the hole.
          </Text>
          <View style={styles.chipRow}>
            <Chip label="Play" selected={beansEnabled} onPress={() => setBeansEnabled(true)} />
            <Chip label="Skip" selected={!beansEnabled} onPress={() => setBeansEnabled(false)} />
          </View>
          {beansEnabled && (
            <TextField
              label="$ PER BEAN"
              placeholder="e.g. 0.25"
              value={beansValueInput}
              onChangeText={setBeansValueInput}
              keyboardType="decimal-pad"
            />
          )}
        </View>

        <View
          style={[styles.llrrBox, !isFourPlayers && styles.llrrBoxDisabled]}
          pointerEvents={isFourPlayers ? 'auto' : 'none'}
        >
          <Text style={[typography.label, styles.llrrTitle]}>LEFT LEFT RIGHT RIGHT</Text>
          <Text style={styles.llrrHint}>
            {isFourPlayers
              ? 'A 2v2 team side game — teams reshuffle by tee order each hole.'
              : `Needs exactly 4 players (you have ${playerCount}).`}
          </Text>
          <View style={styles.chipRow}>
            <Chip label="Play" selected={llrrEnabled} onPress={() => setLlrrEnabled(true)} />
            <Chip label="Skip" selected={!llrrEnabled} onPress={() => setLlrrEnabled(false)} />
          </View>
          {llrrEnabled && (
            <TextField
              label="$ PER POINT"
              placeholder="e.g. 0.10"
              value={llrrPointValueInput}
              onChangeText={setLlrrPointValueInput}
              keyboardType="decimal-pad"
            />
          )}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <PrimaryButton
          title={submitting ? 'Starting…' : 'Start Game'}
          onPress={handleStart}
          disabled={!canStart || submitting}
          style={styles.startBtn}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingBottom: spacing.lg,
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
  contactsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  contactItem: {
    width: '48%',
    marginBottom: spacing.sm,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 16,
    textAlign: 'center',
  },
  chipsLabel: {
    marginTop: spacing.lg,
  },
  chipsHint: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  chipsSubLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.3,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.sm,
  },
  llrrBox: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  llrrBoxDisabled: {
    opacity: 0.45,
  },
  llrrTitle: {
    marginBottom: spacing.xs,
  },
  llrrHint: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: spacing.sm,
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
