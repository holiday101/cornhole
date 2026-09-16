import { useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../theme';

// A pull-down for "who currently has this" -- shows the current owner's name (or
// "Unassigned"), taps open a sheet listing every player plus an Unassigned option.
export default function PlayerDropdown({ value, options, onChange, accentColor = colors.primary }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.id === value);

  const choose = (id) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <>
      <Pressable style={styles.trigger} onPress={() => setOpen(true)}>
        <Text
          style={[styles.triggerText, !selected && styles.triggerPlaceholder]}
          numberOfLines={1}
        >
          {selected ? selected.name : 'Unassigned'}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <ScrollView style={styles.list} bounces={false}>
              <Pressable
                style={[styles.option, value === null && { borderColor: accentColor }]}
                onPress={() => choose(null)}
              >
                <Text style={[styles.optionText, value === null && { color: accentColor }]}>
                  Unassigned
                </Text>
              </Pressable>
              {options.map((o) => (
                <Pressable
                  key={o.id}
                  style={[styles.option, value === o.id && { borderColor: accentColor }]}
                  onPress={() => choose(o.id)}
                >
                  <Text style={[styles.optionText, value === o.id && { color: accentColor }]}>
                    {o.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    minHeight: 40,
    flex: 1,
    marginLeft: spacing.sm,
  },
  triggerText: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  triggerPlaceholder: {
    color: colors.textMuted,
    fontWeight: '500',
  },
  chevron: {
    color: colors.textMuted,
    fontSize: 12,
    marginLeft: spacing.xs,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.sm,
  },
  list: {
    maxHeight: 320,
  },
  option: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: spacing.xs,
  },
  optionText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
});
