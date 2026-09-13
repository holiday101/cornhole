import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Screen from '../components/Screen';
import PrimaryButton from '../components/PrimaryButton';
import Chip from '../components/Chip';
import ScoreStepper from '../components/ScoreStepper';
import ConfirmDialog from '../components/ConfirmDialog';
import { colors, radius, spacing } from '../theme';
import {
  getGame,
  adjustScore,
  setBean as setBeanApi,
  setCompleted,
} from '../api/games';
import { computeHoleWinners } from '../logic/beans';

const BEAN_FIELDS = [
  { key: 'longestDrive', label: 'Longest Drive (fairway)' },
  { key: 'closestRegulation', label: 'Closest in Regulation' },
  { key: 'onePutt', label: 'One Putt' },
];

const POLL_INTERVAL_MS = 3000;

function withHoleScore(game, holeNumber, playerId, score) {
  return {
    ...game,
    holes: game.holes.map((h) =>
      h.holeNumber === holeNumber ? { ...h, scores: { ...h.scores, [playerId]: score } } : h
    ),
  };
}

function withHoleBean(game, holeNumber, field, userId) {
  return {
    ...game,
    holes: game.holes.map((h) =>
      h.holeNumber === holeNumber ? { ...h, beans: { ...h.beans, [field]: userId } } : h
    ),
  };
}

export default function ScorecardScreen({ route, navigation }) {
  const { gameId, editMode } = route.params;
  const isEditMode = !!editMode;
  const [game, setGame] = useState(null);
  const [holeIndex, setHoleIndex] = useState(0);
  const [showIncompleteConfirm, setShowIncompleteConfirm] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: isEditMode ? 'Edit Game' : 'Scorecard' });
  }, [isEditMode]);

  useEffect(() => {
    getGame(gameId)
      .then(({ game: loadedGame }) => setGame(loadedGame))
      .catch(() => navigation.goBack());
  }, [gameId]);

  useFocusEffect(
    useCallback(() => {
      const interval = setInterval(() => {
        getGame(gameId)
          .then(({ game: freshGame }) => setGame(freshGame))
          .catch(() => {});
      }, POLL_INTERVAL_MS);
      return () => clearInterval(interval);
    }, [gameId])
  );

  const playerMap = {};
  (game?.players || []).forEach((p) => (playerMap[p.id] = p.name));

  if (!game) {
    return (
      <Screen>
        <Text style={styles.loadingText}>Loading...</Text>
      </Screen>
    );
  }

  const hole = game.holes[holeIndex];
  const holeWinners = computeHoleWinners(game.holes, game.playerIds);
  const currentResult = holeWinners[holeIndex];
  const isLastHole = holeIndex === game.holes.length - 1;

  const incrementScore = async (playerId) => {
    try {
      const { score } = await adjustScore(game.id, hole.holeNumber, playerId, 1);
      setGame((prev) => withHoleScore(prev, hole.holeNumber, playerId, score));
    } catch (e) {
      // next poll reconciles
    }
  };

  const decrementScore = async (playerId) => {
    try {
      const { score } = await adjustScore(game.id, hole.holeNumber, playerId, -1);
      setGame((prev) => withHoleScore(prev, hole.holeNumber, playerId, score));
    } catch (e) {
      // next poll reconciles
    }
  };

  const setBean = async (fieldKey, playerId) => {
    const nextUserId = hole.beans[fieldKey] === playerId ? null : playerId;
    try {
      await setBeanApi(game.id, hole.holeNumber, fieldKey, nextUserId);
      setGame((prev) => withHoleBean(prev, hole.holeNumber, fieldKey, nextUserId));
    } catch (e) {
      // next poll reconciles
    }
  };

  const goToHole = (index) => {
    if (index < 0 || index >= game.holes.length) return;
    setHoleIndex(index);
  };

  const stepHole = (delta) => {
    setHoleIndex((prev) => {
      const next = prev + delta;
      if (next < 0 || next >= game.holes.length) return prev;
      return next;
    });
  };

  const finishGame = async () => {
    setShowIncompleteConfirm(false);
    await setCompleted(game.id, true);
    navigation.replace('GameSummary', { gameId: game.id });
  };

  const handleFinish = () => {
    const allComplete = holeWinners.every((r) => r.resolved);
    if (!allComplete) {
      setShowIncompleteConfirm(true);
    } else {
      finishGame();
    }
  };

  const saveChanges = async () => {
    await setCompleted(game.id, true);
    navigation.replace('GameSummary', { gameId: game.id });
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.heading}>Hole {hole.holeNumber}</Text>
        <Text style={styles.subheading}>of {game.holesCount}</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.holeStrip}
        contentContainerStyle={{ paddingRight: spacing.sm }}
      >
        {game.holes.map((h, i) => {
          const resolvedHere = holeWinners[i]?.resolved;
          return (
            <Pressable
              key={h.holeNumber}
              onPress={() => goToHole(i)}
              style={[
                styles.holeDot,
                i === holeIndex && styles.holeDotActive,
                resolvedHere && i !== holeIndex && styles.holeDotDone,
              ]}
            >
              <Text
                style={[styles.holeDotText, i === holeIndex && styles.holeDotTextActive]}
              >
                {h.holeNumber}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.body}>
        <View style={styles.card}>
          {game.playerIds.map((pid) => (
            <ScoreStepper
              key={pid}
              label={playerMap[pid] || 'Unknown'}
              value={hole.scores[pid]}
              onIncrement={() => incrementScore(pid)}
              onDecrement={() => decrementScore(pid)}
            />
          ))}
        </View>

        <View style={styles.resultBanner}>
          {!currentResult.resolved && (
            <Text style={styles.resultTextMuted} numberOfLines={1}>
              Enter all scores to determine the winner
            </Text>
          )}
          {currentResult.resolved && currentResult.tied && (
            <Text style={styles.resultTextMuted} numberOfLines={1}>
              Tied — bean carries to the next hole
            </Text>
          )}
          {currentResult.resolved && !currentResult.tied && (
            <Text style={styles.resultTextWin} numberOfLines={1}>
              🏆 {playerMap[currentResult.winnerId]} wins
              {currentResult.beansAwarded > 1 ? ` (+${currentResult.beansAwarded} beans!)` : ' (+1 bean)'}
            </Text>
          )}
        </View>

        {BEAN_FIELDS.map((field) => (
          <View key={field.key} style={styles.beanSection}>
            <Text style={styles.beanLabel}>{field.label}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {game.playerIds.map((pid) => (
                <Chip
                  key={pid}
                  label={playerMap[pid] || 'Unknown'}
                  selected={hole.beans[field.key] === pid}
                  onPress={() => setBean(field.key, pid)}
                  color={colors.accent}
                  compact
                />
              ))}
            </ScrollView>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <PrimaryButton
          title="Prev"
          variant="outline"
          onPress={() => stepHole(-1)}
          disabled={holeIndex === 0}
          style={styles.footerBtn}
        />
        {isEditMode ? (
          <PrimaryButton
            title="Next"
            onPress={() => stepHole(1)}
            disabled={isLastHole}
            style={styles.footerBtn}
          />
        ) : isLastHole ? (
          <PrimaryButton title="Finish Game" onPress={handleFinish} style={styles.footerBtn} />
        ) : (
          <PrimaryButton
            title="Next"
            onPress={() => stepHole(1)}
            style={styles.footerBtn}
          />
        )}
      </View>

      {isEditMode && (
        <PrimaryButton title="Save Changes" onPress={saveChanges} style={styles.saveBtn} />
      )}

      <ConfirmDialog
        visible={showIncompleteConfirm}
        title="Some holes are incomplete"
        message="Not every hole has a score for all players. Finish anyway?"
        confirmLabel="Finish Game"
        cancelLabel="Keep Playing"
        destructive
        onCancel={() => setShowIncompleteConfirm(false)}
        onConfirm={finishGame}
      />
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
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: spacing.xs,
  },
  heading: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  subheading: {
    marginLeft: spacing.xs,
    fontSize: 13,
    color: colors.textMuted,
  },
  holeStrip: {
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    maxHeight: 36,
  },
  holeDot: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  holeDotActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  holeDotDone: {
    borderColor: colors.accent,
  },
  holeDotText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
  },
  holeDotTextActive: {
    color: colors.background,
  },
  body: {
    flex: 1,
    justifyContent: 'space-evenly',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  resultBanner: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  resultTextMuted: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
  resultTextWin: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  beanSection: {},
  beanLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 0.3,
    marginBottom: spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    paddingVertical: spacing.xs,
  },
  footerBtn: {
    flex: 1,
    marginHorizontal: spacing.xs,
    minHeight: 44,
    paddingVertical: spacing.sm,
  },
  saveBtn: {
    minHeight: 40,
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
  },
});
