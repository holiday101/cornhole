import { useCallback, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Screen from '../components/Screen';
import PrimaryButton from '../components/PrimaryButton';
import Chip from '../components/Chip';
import { colors, radius, spacing, typography } from '../theme';
import { getCourses, addFavorite, removeFavorite } from '../api/courses';
import { useAuth } from '../auth/AuthContext';

export default function CourseListScreen({ navigation }) {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const [courses, setCourses] = useState(null);
  const [error, setError] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

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

  const toggleFavorite = async (course) => {
    setCourses((prev) =>
      prev.map((c) => (c.id === course.id ? { ...c, isFavorite: !c.isFavorite } : c))
    );
    try {
      if (course.isFavorite) {
        await removeFavorite(course.id);
      } else {
        await addFavorite(course.id);
      }
    } catch (e) {
      setCourses((prev) =>
        prev.map((c) => (c.id === course.id ? { ...c, isFavorite: course.isFavorite } : c))
      );
      setError('Could not update that favorite.');
    }
  };

  const visibleCourses = (courses || []).filter((c) => !showFavoritesOnly || c.isFavorite);

  return (
    <Screen>
      {isAdmin && (
        <PrimaryButton
          title="New Course"
          onPress={() => navigation.navigate('CourseEdit', {})}
          style={styles.newBtn}
        />
      )}

      <View style={styles.filterRow}>
        <Chip label="All courses" selected={!showFavoritesOnly} onPress={() => setShowFavoritesOnly(false)} />
        <Chip label="Favorites" selected={showFavoritesOnly} onPress={() => setShowFavoritesOnly(true)} />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {courses && visibleCourses.length === 0 && (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>
            {showFavoritesOnly
              ? 'No favorites yet. Star a course to keep it handy here.'
              : 'No courses yet. Add one to save par for each hole.'}
          </Text>
        </View>
      )}

      <FlatList
        data={visibleCourses}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => navigation.navigate('CourseEdit', { courseId: item.id })}
          >
            <View style={styles.cardMain}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardSubtitle}>{item.holesCount} holes</Text>
            </View>
            <Pressable
              hitSlop={12}
              onPress={() => toggleFavorite(item)}
              style={styles.starBtn}
            >
              <Text style={[styles.star, item.isFavorite && styles.starActive]}>
                {item.isFavorite ? '★' : '☆'}
              </Text>
            </Pressable>
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
  filterRow: {
    flexDirection: 'row',
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardMain: {
    flex: 1,
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
  starBtn: {
    paddingLeft: spacing.md,
  },
  star: {
    fontSize: 26,
    color: colors.textMuted,
  },
  starActive: {
    color: colors.accent,
  },
});
