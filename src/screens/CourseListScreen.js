import { useCallback, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Screen from '../components/Screen';
import PrimaryButton from '../components/PrimaryButton';
import { colors, radius, spacing, typography } from '../theme';
import { getCourses } from '../api/courses';

export default function CourseListScreen({ navigation }) {
  const [courses, setCourses] = useState(null);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getCourses()
        .then(({ courses: list }) => {
          if (!cancelled) setCourses(list);
        })
        .catch(() => {
          if (!cancelled) setError('Could not load courses.');
        });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  return (
    <Screen>
      <PrimaryButton
        title="New Course"
        onPress={() => navigation.navigate('CourseEdit', {})}
        style={styles.newBtn}
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {courses && courses.length === 0 && (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No courses yet. Add one to save par for each hole.</Text>
        </View>
      )}

      <FlatList
        data={courses || []}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => navigation.navigate('CourseEdit', { courseId: item.id })}
          >
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardSubtitle}>{item.holesCount} holes</Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  newBtn: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.danger,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  emptyBox: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 15,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardTitle: {
    ...typography.body,
    fontWeight: '700',
  },
  cardSubtitle: {
    color: colors.textMuted,
    marginTop: spacing.xs,
    fontSize: 13,
  },
});
