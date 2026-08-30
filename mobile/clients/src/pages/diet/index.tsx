import { useState } from 'react';
import { Image, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { DetailHeader } from '@/components/detail-header';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  dietDetails,
  getDietComment,
  getDietMealStatusItems,
  setDietComment,
  updateDietMealStatus,
} from '@/utils/dashboard-data';

export function DietDetailsScreen() {
  const theme = useTheme();
  const [meals, setMeals] = useState(() => getDietMealStatusItems());
  const [comment, setCommentState] = useState(() => getDietComment());

  const handleToggleMeal = (id: string) => {
    setMeals((current) => {
      const next = current.map((meal) =>
        meal.id === id ? { ...meal, checked: !meal.checked } : meal,
      );

      const updatedMeal = next.find((meal) => meal.id === id);
      if (updatedMeal) {
        updateDietMealStatus(id, { checked: updatedMeal.checked });
      }

      return next;
    });
  };

  const handlePhotoPick = (id: string) => {
    const mockImageUri = 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=900&q=80';

    setMeals((current) => {
      const next = current.map((meal) =>
        meal.id === id ? { ...meal, imageUri: mockImageUri } : meal,
      );

      updateDietMealStatus(id, { imageUri: mockImageUri });
      return next;
    });
  };

  const handleCommentChange = (value: string) => {
    setCommentState(value);
    setDietComment(value);
  };

  return (
    <ScreenScaffold>
      <DetailHeader title="Diet" subtitle={dietDetails.title} />

      <ThemedView type="backgroundElement" style={[styles.summary, { borderColor: theme.border }]}>
        <ThemedText type="smallBold" style={{ color: theme.warning }}>
          {dietDetails.calories}
        </ThemedText>
        <ThemedText>{dietDetails.focus}</ThemedText>
      </ThemedView>

      <View style={styles.list}>
        {meals.map((meal) => (
          <ThemedView key={meal.id} type="backgroundElement" style={[styles.row, { borderColor: theme.border }]}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: meal.checked }}
              onPress={() => handleToggleMeal(meal.id)}
              style={[styles.checkbox, meal.checked && styles.checkboxChecked]}>
              {meal.checked ? <ThemedText style={styles.checkText}>✓</ThemedText> : null}
            </Pressable>

            <View style={styles.mealContent}>
              <View style={styles.mealHeaderRow}>
                <ThemedText style={styles.rowText}>{meal.meal}</ThemedText>

                <Pressable onPress={() => handlePhotoPick(meal.id)} style={styles.photoButton}>
                  <ThemedText type="smallBold" style={styles.photoButtonText}>
                    {meal.imageUri ? 'Change photo' : 'Add photo'}
                  </ThemedText>
                </Pressable>
              </View>

              {meal.imageUri ? (
                <Image source={{ uri: meal.imageUri }} style={styles.thumbnail} />
              ) : null}
            </View>
          </ThemedView>
        ))}
      </View>

      <ThemedView type="backgroundElement" style={[styles.commentCard, { borderColor: theme.border }]}>
        <ThemedText type="smallBold">Comment</ThemedText>
        <TextInput
          value={comment}
          onChangeText={handleCommentChange}
          placeholder="How was today's diet?"
          multiline
          numberOfLines={4}
          style={[styles.textInput, { color: theme.text, borderColor: theme.border }]} 
          placeholderTextColor={theme.textSecondary}
        />
      </ThemedView>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  summary: {
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  list: {
    gap: Spacing.two,
  },
  row: {
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#8FA3B7',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#3A7BFF',
    borderColor: '#3A7BFF',
  },
  checkText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  mealContent: {
    flex: 1,
    gap: Spacing.one,
  },
  mealHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  rowText: {
    flex: 1,
    lineHeight: 20,
  },
  photoButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(58, 123, 255, 0.12)',
    alignSelf: 'flex-end',
  },
  photoButtonText: {
    color: '#3A7BFF',
    fontSize: 11,
  },
  thumbnail: {
    width: '100%',
    height: 90,
    borderRadius: Spacing.two,
    backgroundColor: '#E5E7EB',
  },
  commentCard: {
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    marginTop: Spacing.three,
    gap: Spacing.one,
  },
  textInput: {
    minHeight: 96,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.two,
    padding: Spacing.two,
    textAlignVertical: 'top',
  },
});
