import { useState } from 'react';
import { Text, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import Screen from '../components/Screen';
import PrimaryButton from '../components/PrimaryButton';
import TextField from '../components/TextField';
import { colors, spacing, typography } from '../theme';
import { updateUser } from '../api/admin';
import { ApiError } from '../api/client';

export default function AdminUserEditScreen({ route, navigation }) {
  const { userId, userName, userEmail } = route.params;
  const [name, setName] = useState(userName);
  const [email, setEmail] = useState(userEmail);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName || !trimmedEmail) {
      setError('Name and email are both required.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await updateUser(userId, { name: trimmedName, email: trimmedEmail });
      navigation.goBack();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save changes.');
      setSaving(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Text style={[typography.title, styles.title]}>Edit Person</Text>
        <Text style={styles.hint}>
          Fix a typo'd name or email. If this account hasn't been claimed yet, updating the email
          changes who can sign up and claim it.
        </Text>

        <TextField label="NAME" placeholder="Name" value={name} onChangeText={setName} />
        <TextField
          label="EMAIL"
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <PrimaryButton
          title={saving ? 'Saving…' : 'Save'}
          onPress={handleSave}
          disabled={saving}
          style={styles.saveBtn}
        />
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    fontSize: 24,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    marginTop: spacing.sm,
  },
  saveBtn: {
    marginTop: spacing.md,
  },
});
