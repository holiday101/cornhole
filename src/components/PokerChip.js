import { Pressable, View, Text, StyleSheet } from 'react-native';
import { colors, radius } from '../theme';

const SIZE = 74;

const TINTS = {
  positive: 'rgba(63, 191, 99, 0.22)',
  negative: 'rgba(225, 90, 77, 0.22)',
};

// A round, poker-chip-styled toggle: a dashed edge ring (like a chip's stripe) around a
// solid inner ring, a center label, and a small +/- badge that stays legible even when
// the chip is deselected, so positive vs. negative reads at a glance either way.
export default function PokerChip({ label, positive, selected, onPress }) {
  const accentColor = positive ? colors.primary : colors.danger;
  const ringColor = selected ? accentColor : colors.border;

  return (
    <Pressable onPress={onPress} style={styles.wrap} hitSlop={6}>
      <View style={[styles.outer, { borderColor: ringColor }, !selected && styles.outerDim]}>
        <View
          style={[
            styles.inner,
            { borderColor: ringColor },
            selected && { backgroundColor: positive ? TINTS.positive : TINTS.negative },
          ]}
        >
          <Text style={[styles.label, selected ? styles.labelOn : styles.labelOff]} numberOfLines={3}>
            {label}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: accentColor }]}>
          <Text style={styles.badgeText}>{positive ? '+' : '−'}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginBottom: 10,
  },
  outer: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 3,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  outerDim: {
    opacity: 0.45,
  },
  inner: {
    width: SIZE - 16,
    height: SIZE - 16,
    borderRadius: (SIZE - 16) / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  label: {
    fontSize: 10.5,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 12,
  },
  labelOn: {
    color: colors.text,
  },
  labelOff: {
    color: colors.textMuted,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  badgeText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 15,
  },
});
