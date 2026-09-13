import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../theme';

export default function ScoreStepper({ label, value, onIncrement, onDecrement }) {
  const hasValue = value !== undefined && value !== null && value !== '';

  return (
    <View style={styles.row}>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.stepper}>
        <Pressable onPress={onDecrement} style={styles.btn} hitSlop={8}>
          <Text style={styles.btnText}>−</Text>
        </Pressable>
        <Text style={styles.value}>{hasValue ? value : '–'}</Text>
        <Pressable onPress={onIncrement} style={styles.btn} hitSlop={8}>
          <Text style={styles.btnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  value: {
    minWidth: 28,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
});
