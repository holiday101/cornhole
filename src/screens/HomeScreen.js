import { View, Text, Pressable, StyleSheet } from 'react-native';
import Screen from '../components/Screen';
import PrimaryButton from '../components/PrimaryButton';
import { colors, spacing, typography } from '../theme';
import { useAuth } from '../auth/AuthContext';

export default function HomeScreen({ navigation }) {
  const { user, logout } = useAuth();

  return (
    <Screen style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.emoji}>⛳️</Text>
        <Text style={typography.title}>Cornhole Golf</Text>
        <Text style={styles.subtitle}>Track rounds, scores, and side-bet beans</Text>
        {user ? <Text style={styles.greeting}>Signed in as {user.name}</Text> : null}
      </View>

      <View style={styles.actions}>
        <PrimaryButton title="Start New Game" onPress={() => navigation.navigate('NewGame')} />
        <PrimaryButton
          title="Courses"
          variant="outline"
          onPress={() => navigation.navigate('Courses')}
          style={styles.spaced}
        />
        <PrimaryButton
          title="People"
          variant="outline"
          onPress={() => navigation.navigate('Friends')}
          style={styles.spaced}
        />
        <PrimaryButton
          title="Game History"
          variant="outline"
          onPress={() => navigation.navigate('History')}
          style={styles.spaced}
        />
        <PrimaryButton
          title="Leaderboard"
          variant="outline"
          onPress={() => navigation.navigate('Leaderboard')}
          style={styles.spaced}
        />
        {user ? (
          <PrimaryButton
            title="My Stats"
            variant="outline"
            onPress={() =>
              navigation.navigate('PlayerStats', { playerId: user.id, playerName: user.name })
            }
            style={styles.spaced}
          />
        ) : null}
        {user && user.role === 'admin' ? (
          <>
            <PrimaryButton
              title="Manage Users"
              variant="outline"
              onPress={() => navigation.navigate('AdminUsers')}
              style={styles.spaced}
            />
            <PrimaryButton
              title="Manage Games"
              variant="outline"
              onPress={() => navigation.navigate('AdminGames')}
              style={styles.spaced}
            />
          </>
        ) : null}
        <Pressable onPress={logout} style={styles.logoutRow}>
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'space-between',
    paddingVertical: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  emoji: {
    fontSize: 56,
    marginBottom: spacing.md,
  },
  subtitle: {
    marginTop: spacing.sm,
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
  },
  greeting: {
    marginTop: spacing.md,
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  actions: {
    marginBottom: spacing.lg,
  },
  spaced: {
    marginTop: spacing.md,
  },
  logoutRow: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  logoutText: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: '600',
  },
});
