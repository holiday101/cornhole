import { Platform, Pressable, View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import CoinIcon from './CoinIcon';
import { colors, radius } from '../theme';

const SIZE = 88;
const CENTER = SIZE / 2;
const RING_WIDTH = 9;
const OUTER_R = SIZE / 2 - RING_WIDTH / 2 - 1;
const INNER_R = SIZE / 2 - RING_WIDTH - 6;
const RING_SEGMENTS = 18;
const RING_CIRCUMFERENCE = 2 * Math.PI * OUTER_R;
const RING_DASH = RING_CIRCUMFERENCE / RING_SEGMENTS / 2;

const INNER_DISC = {
  positive: '#1E6B37',
  negative: '#8C2E24',
};

// A round, glossy casino-chip toggle: colored face with a checkered white/accent
// edge ring when in play, a flat dashed "empty slot" outline when not. The coin's
// icon and +/- badge stay visible either way, so what it is (and positive vs.
// negative) reads at a glance regardless of selection.
export default function PokerChip({ coinKey, label, positive, selected, onPress }) {
  const accentColor = positive ? colors.primary : colors.danger;
  const innerColor = INNER_DISC[positive ? 'positive' : 'negative'];

  return (
    <Pressable onPress={onPress} style={styles.wrap} hitSlop={6}>
      <View style={styles.chipBox}>
        {selected ? (
          <Svg width={SIZE} height={SIZE} style={styles.svg}>
            <Circle
              cx={CENTER}
              cy={CENTER}
              r={OUTER_R}
              fill={accentColor}
              stroke={colors.white}
              strokeWidth={RING_WIDTH}
            />
            <Circle
              cx={CENTER}
              cy={CENTER}
              r={OUTER_R}
              fill="none"
              stroke={accentColor}
              strokeWidth={RING_WIDTH}
              strokeDasharray={`${RING_DASH} ${RING_DASH}`}
            />
            <Circle
              cx={CENTER}
              cy={CENTER}
              r={INNER_R}
              fill={innerColor}
              stroke={colors.white}
              strokeWidth={2}
            />
          </Svg>
        ) : (
          <View style={[styles.svg, styles.chipOff]}>
            <View style={styles.innerOff} />
          </View>
        )}

        <View style={styles.content} pointerEvents="none">
          <CoinIcon
            coinKey={coinKey}
            size={26}
            color={selected ? colors.white : colors.textMuted}
            background={selected ? innerColor : colors.surface}
          />
          <Text style={[styles.label, selected ? styles.labelOn : styles.labelOff]} numberOfLines={2}>
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
  chipBox: {
    width: SIZE,
    height: SIZE,
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
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  chipOff: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 3,
    borderColor: colors.border,
    borderStyle: 'dashed',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { boxShadow: 'none' },
      default: { shadowOpacity: 0, elevation: 0 },
    }),
  },
  innerOff: {
    width: INNER_R * 2,
    height: INNER_R * 2,
    borderRadius: INNER_R,
    borderWidth: 1,
    borderColor: colors.border,
  },
  content: {
    width: INNER_R * 2 - 6,
    height: INNER_R * 2 - 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  label: {
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 10.5,
    marginTop: 3,
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
