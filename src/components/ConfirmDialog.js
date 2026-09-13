import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../theme';

export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={styles.actions}>
            <Pressable onPress={onCancel} style={[styles.btn, styles.cancelBtn]}>
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              style={[styles.btn, destructive ? styles.destructiveBtn : styles.confirmBtn]}
            >
              <Text style={destructive ? styles.destructiveText : styles.confirmText}>
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: 15,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  btn: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  cancelBtn: {
    backgroundColor: colors.surfaceAlt,
  },
  cancelText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 16,
  },
  confirmBtn: {
    backgroundColor: colors.primary,
  },
  confirmText: {
    color: colors.background,
    fontWeight: '700',
    fontSize: 16,
  },
  destructiveBtn: {
    backgroundColor: colors.danger,
  },
  destructiveText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 16,
  },
});
