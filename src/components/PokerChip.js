import { Platform, Pressable, View, Text, StyleSheet } from 'react-native';
import { colors, radius } from '../theme';

const SIZE = 76;
const SPOT_SIZE = 9;
const SPOT_COUNT = 8;
const SPOT_RADIUS = SIZE / 2 - SPOT_SIZE / 2 - 3;
const CENTER = SIZE / 2;

// The classic 8-spot ring printed around a casino chip's edge -- a generic,
// non-proprietary chip motif (not tied to any specific product's artwork).
const SPOT_OFFSETS = Array.from({ length: SPOT_COUNT }, (_, i) => {
  const angle = (i / SPOT_COUNT) * 2 * Math.PI - Math.PI / 2;
  return {
    left: CENTER + SPOT_RADIUS * Math.cos(angle) - SPOT_SIZE / 2,
    top: CENTER + SPOT_RADIUS * Math.sin(angle) - SPOT_SIZE / 2,
  };
});

const INNER_DISC = {
  positive: '#1E6B37',
  negative: '#8C2E24',
};

// A round, glossy casino-chip toggle: colored face + white edge spots when in play,
// a flat dashed "empty slot" outline when not. The +/- badge stays at full opacity
// either way, so positive vs. negative reads at a glance regardless of selection.
export default function PokerChip({ label, positive, selected, onPress }) {
  const accentColor = positive ? colors.primary : colors.danger;

  return (
    <Pressable onPress={onPress} style={styles.wrap} hitSlop={6}>
      <View style={[styles.chip, selected ? { backgroundColor: accentColor } : styles.chipOff]}>
        {selected &&
          SPOT_OFFSETS.map((pos, i) => <View key={i} style={[styles.spot, pos]} />)}
        <View
          style={[
            styles.inner,
            selected
              ? { backgroundColor: INNER_DISC[positive ? 'positive' : 'negative'], borderColor: colors.white }
              : { borderColor: colors.border },
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
  chip: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 3,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { boxShadow: '0 2px 3px rgba(0, 0, 0, 0.35)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 3,
        elevation: 4,
      },
    }),
  },
  chipOff: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderStyle: 'dashed',
    ...Platform.select({
      web: { boxShadow: 'none' },
      default: { shadowOpacity: 0, elevation: 0 },
    }),
  },
  spot: {
    position: 'absolute',
    width: SPOT_SIZE,
    height: SPOT_SIZE,
    borderRadius: SPOT_SIZE / 2,
    backgroundColor: colors.white,
  },
  inner: {
    width: SIZE - 22,
    height: SIZE - 22,
    borderRadius: (SIZE - 22) / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 11.5,
  },
  labelOn: {
    color: colors.white,
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
