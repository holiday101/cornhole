import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import Screen from '../components/Screen';
import PrimaryButton from '../components/PrimaryButton';
import Chip from '../components/Chip';
import TextField from '../components/TextField';
import ConfirmDialog from '../components/ConfirmDialog';
import { colors, spacing, typography } from '../theme';
import { useAuth } from '../auth/AuthContext';
import { getCourse, createCourse, updateCourse, deleteCourse } from '../api/courses';
import { ApiError } from '../api/client';

function defaultPars(holesCount, existing) {
  const next = {};
  for (let n = 1; n <= holesCount; n++) {
    next[n] = existing && existing[n] !== undefined ? existing[n] : '3';
  }
  return next;
}

export default function CourseEditScreen({ route, navigation }) {
  const { courseId } = route.params || {};
  const isNew = !courseId;
  const { user } = useAuth();

  const [loading, setLoading] = useState(!isNew);
  const [name, setName] = useState('');
  const [holesCount, setHolesCount] = useState(9);
  const [pars, setPars] = useState(() => defaultPars(9));
  const [createdByUserId, setCreatedByUserId] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: isNew ? 'New Course' : 'Edit Course' });
  }, [isNew]);

  useEffect(() => {
    if (isNew) return;
    getCourse(courseId)
      .then(({ course }) => {
        setName(course.name);
        setHolesCount(course.holesCount);
        const existing = {};
        course.holes.forEach((h) => (existing[h.number] = String(h.par)));
        setPars(defaultPars(course.holesCount, existing));
        setCreatedByUserId(course.createdByUserId);
      })
      .catch(() => setError('Could not load this course.'))
      .finally(() => setLoading(false));
  }, [courseId, isNew]);

  const canEdit = isNew || createdByUserId === user.id;

  const changeHolesCount = (n) => {
    setHolesCount(n);
    setPars((prev) => defaultPars(n, prev));
  };

  const setPar = (holeNumber, value) => {
    setPars((prev) => ({ ...prev, [holeNumber]: value }));
  };

  const handleSave = async () => {
    setError('');
    if (!name.trim()) {
      setError('Enter a course name.');
      return;
    }
    const holes = [];
    for (let n = 1; n <= holesCount; n++) {
      const par = Number(pars[n]);
      if (!Number.isInteger(par) || par < 1 || par > 15) {
        setError(`Hole ${n} needs a par between 1 and 15.`);
        return;
      }
      holes.push({ number: n, par });
    }

    setSubmitting(true);
    try {
      if (isNew) {
        await createCourse({ name: name.trim(), holesCount, holes });
      } else {
        await updateCourse(courseId, { name: name.trim(), holesCount, holes });
      }
      navigation.goBack();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save this course.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setShowDeleteConfirm(false);
    try {
      await deleteCourse(courseId);
      navigation.goBack();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not delete this course.');
    }
  };

  if (loading) {
    return (
      <Screen>
        <Text style={styles.loadingText}>Loading…</Text>
      </Screen>
    );
  }

  const frontNine = Array.from({ length: Math.min(9, holesCount) }, (_, i) => i + 1);
  const backNine = holesCount > 9 ? Array.from({ length: holesCount - 9 }, (_, i) => i + 10) : [];

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {!canEdit && (
          <Text style={styles.readonlyBanner}>Only the creator can edit this course.</Text>
        )}

        <TextField
          label="COURSE NAME"
          value={name}
          onChangeText={setName}
          editable={canEdit}
          style={styles.field}
        />

        <Text style={typography.label}>HOLES</Text>
        <View style={styles.holesRow}>
          {[9, 18].map((n) => (
            <Chip
              key={n}
              label={`${n} holes`}
              selected={holesCount === n}
              onPress={() => canEdit && changeHolesCount(n)}
              disabled={!canEdit}
            />
          ))}
        </View>

        <Text style={[typography.label, styles.parLabel]}>FRONT NINE — PAR</Text>
        <View style={styles.parGrid}>
          {frontNine.map((n) => (
            <TextField
              key={n}
              label={`Hole ${n}`}
              value={pars[n]}
              onChangeText={(v) => setPar(n, v)}
              keyboardType="number-pad"
              editable={canEdit}
              style={styles.parField}
            />
          ))}
        </View>

        {backNine.length > 0 && (
          <>
            <Text style={[typography.label, styles.parLabel]}>BACK NINE — PAR</Text>
            <View style={styles.parGrid}>
              {backNine.map((n) => (
                <TextField
                  key={n}
                  label={`Hole ${n}`}
                  value={pars[n]}
                  onChangeText={(v) => setPar(n, v)}
                  keyboardType="number-pad"
                  editable={canEdit}
                  style={styles.parField}
                />
              ))}
            </View>
          </>
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {canEdit && (
          <PrimaryButton
            title={submitting ? 'Saving…' : 'Save Course'}
            onPress={handleSave}
            disabled={submitting}
            style={styles.saveBtn}
          />
        )}

        {canEdit && !isNew && (
          <PrimaryButton
            title="Delete Course"
            variant="danger"
            onPress={() => setShowDeleteConfirm(true)}
            style={styles.deleteBtn}
          />
        )}
      </ScrollView>

      <ConfirmDialog
        visible={showDeleteConfirm}
        title="Delete this course?"
        message="This can't be undone. Games already played won't be affected."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  loadingText: {
    color: colors.textMuted,
    fontSize: 16,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  content: {
    paddingVertical: spacing.md,
    paddingBottom: spacing.xl,
  },
  readonlyBanner: {
    color: colors.accent,
    fontSize: 14,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  field: {
    marginBottom: spacing.lg,
  },
  holesRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  parLabel: {
    marginBottom: spacing.sm,
  },
  parGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
  },
  parField: {
    width: '31%',
    marginRight: '3.5%',
    marginBottom: spacing.sm,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  saveBtn: {
    marginTop: spacing.md,
  },
  deleteBtn: {
    marginTop: spacing.md,
  },
});
