import { Pressable, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../theme';

export default function Chip({ label, selected, onPress, disabled, color, compact }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.chip,
        compact && styles.chipCompact,
        selected && { backgroundColor: color || colors.primary, borderColor: color || colors.primary },
        disabled && !selected && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={[styles.text, compact && styles.textCompact, selected && styles.selectedText]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  chipCompact: {
    minHeight: 34,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    marginRight: spacing.xs,
    marginBottom: 0,
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.7,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  textCompact: {
    fontSize: 12,
  },
  selectedText: {
    color: colors.background,
  },
});
