import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import Screen from '../components/Screen';
import TextField from '../components/TextField';
import PrimaryButton from '../components/PrimaryButton';
import { colors, spacing, typography } from '../theme';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupScreen({ navigation }) {
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('');

  const validate = () => {
    if (!name.trim()) return 'Enter your name.';
    if (!EMAIL_RE.test(email.trim())) return 'Enter a valid email address.';
    if (password.length < 8) return 'Password must be at least 8 characters.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    return '';
  };

  const handleSignup = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const result = await signup({ email: email.trim(), password, name: name.trim() });
      if (result && result.pendingVerification) {
        setPendingVerificationEmail(result.email);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (pendingVerificationEmail) {
    return (
      <Screen>
        <View style={styles.content}>
          <Text style={[typography.title, styles.title]}>Check your email</Text>
          <Text style={styles.subtitle}>
            Someone already added {pendingVerificationEmail} to the app. We sent a verification
            link there — tap it to finish setting up your account, then come back and log in.
          </Text>
          <Pressable onPress={() => navigation.navigate('Login')} style={styles.linkRow}>
            <Text style={styles.linkText}>
              <Text style={styles.linkTextBold}>Back to log in</Text>
            </Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <Text style={[typography.title, styles.title]}>Create Account</Text>
          <Text style={styles.subtitle}>Your history follows you across every game.</Text>

          <TextField label="NAME" value={name} onChangeText={setName} autoComplete="name" style={styles.field} />
          <TextField
            label="EMAIL"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            style={styles.field}
          />
          <TextField
            label="PASSWORD"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            style={styles.field}
          />
          <TextField
            label="CONFIRM PASSWORD"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            style={styles.field}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <PrimaryButton
            title={submitting ? 'Creating account…' : 'Create Account'}
            onPress={handleSignup}
            disabled={submitting}
            style={styles.submitBtn}
          />

          <Pressable onPress={() => navigation.navigate('Login')} style={styles.linkRow}>
            <Text style={styles.linkText}>Already have an account? <Text style={styles.linkTextBold}>Log in</Text></Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 15,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  field: {
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  submitBtn: {
    marginTop: spacing.sm,
  },
  linkRow: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  linkText: {
    color: colors.textMuted,
    fontSize: 15,
  },
  linkTextBold: {
    color: colors.primary,
    fontWeight: '700',
  },
});
