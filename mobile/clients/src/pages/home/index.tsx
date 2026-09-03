import { Image, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';

import { useRouter } from 'expo-router';

import { PlanCard } from '@/components/plan-card';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { trackingApi } from '@/lib/api';
import { todayKey } from '@/lib/dates';
import { todaysPlanCards } from '@/utils/dashboard-data';

export function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [physiqueImage, setPhysiqueImage] = useState<string | null>(null);
  const [weightValue, setWeightValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const pickPhysiquePhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        allowsEditing: true,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        setPhysiqueImage(result.assets[0].uri);
        setSavedMessage(null);
      }
    } catch {
      // Image picking is not available in this environment.
    }
  };

  const handleSaveUpdate = async () => {
    const kg = Number.parseFloat(weightValue);
    if (!Number.isFinite(kg) || kg <= 0) {
      setSavedMessage('Enter a weight in kg before saving.');
      return;
    }
    try {
      setIsSaving(true);
      await trackingApi.saveWeight({
        date: todayKey(),
        weightKg: kg,
        photoUrl: physiqueImage ?? undefined,
      });
      setWeightValue('');
      setSavedMessage('Saved to today\u2019s update.');
    } catch (error) {
      setSavedMessage(
        error instanceof Error ? error.message : 'Could not save your update. Please try again.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScreenScaffold includeBottomTabInset>
      <View style={styles.header}>
        <ThemedText type="smallBold" themeColor="accent">
          Coach OS
        </ThemedText>
        <ThemedText type="subtitle" style={styles.headline}>
          Ready for today?
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          Your coach has lined up the two things that matter most today: training and food.
        </ThemedText>
      </View>

      <View style={styles.sectionHeader}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          Today
        </ThemedText>
      </View>

      <View style={styles.cards}>
        {todaysPlanCards.map((plan) => (
          <PlanCard key={plan.id} plan={plan} />
        ))}
      </View>

      <ThemedView type="backgroundElement" style={[styles.updateCard, { borderColor: theme.border }]}>
        <ThemedText type="smallBold">Today's update</ThemedText>

        <View style={styles.updateRow}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
            Physique update
          </ThemedText>

          <Pressable
            onPress={pickPhysiquePhoto}
            style={[styles.uploadButton, { borderColor: theme.border }]}>
            <ThemedText type="smallBold" style={styles.uploadButtonText}>
              {physiqueImage ? 'Change image' : 'Upload'}
            </ThemedText>
          </Pressable>
        </View>

        {physiqueImage ? (
          <Image source={{ uri: physiqueImage }} style={styles.previewImage} />
        ) : null}

        <View style={styles.updateRow}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
            Weight update
          </ThemedText>
          <TextInput
            value={weightValue}
            onChangeText={setWeightValue}
            placeholder="Add value"
            keyboardType="decimal-pad"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, styles.weightInput, { color: theme.text, borderColor: theme.border }]}
          />
        </View>

        <View style={styles.saveRow}>
          {savedMessage ? (
            <ThemedText
              type="small"
              themeColor={savedMessage.startsWith('Saved') ? 'success' : 'warning'}
              style={styles.saveMessage}
              numberOfLines={2}>
              {savedMessage}
            </ThemedText>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={handleSaveUpdate}
            disabled={isSaving}
            style={({ pressed }) => [
              styles.saveButton,
              { backgroundColor: theme.accent, opacity: isSaving ? 0.6 : pressed ? 0.8 : 1 },
            ]}>
            <ThemedText type="smallBold" style={styles.saveButtonText}>
              {isSaving ? 'Saving…' : 'Save update'}
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>

      <View style={styles.sectionHeader}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          History
        </ThemedText>
      </View>

      <Pressable onPress={() => router.push('/history')}>
        <ThemedView type="backgroundElement" style={[styles.historyCard, { borderColor: theme.border }]}>
          <View style={styles.historyTopRow}>
            <ThemedText type="smallBold">History</ThemedText>
            <ThemedText type="smallBold" style={{ color: theme.accent }}>
              Open
            </ThemedText>
          </View>
          <ThemedText themeColor="textSecondary">
            View previous weigh-ins, physique updates, and coaching notes.
          </ThemedText>
        </ThemedView>
      </Pressable>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
    paddingTop: Spacing.two,
  },
  headline: {
    fontSize: 34,
    lineHeight: 40,
  },
  updateCard: {
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  updateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.half,
    gap: Spacing.two,
  },
  label: {
    flex: 1,
  },
  uploadButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(58, 123, 255, 0.08)',
  },
  uploadButtonText: {
    color: '#3A7BFF',
    fontSize: 11,
  },
  previewImage: {
    width: '100%',
    height: 110,
    borderRadius: Spacing.two,
    marginTop: -Spacing.half,
    backgroundColor: '#E5E7EB',
  },
  input: {
    minWidth: 110,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    textAlign: 'right',
    fontSize: 12,
    backgroundColor: 'rgba(148, 163, 184, 0.04)',
  },
  weightInput: {
    width: 96,
  },
  saveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.two,
    paddingTop: Spacing.one,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(148, 163, 184, 0.25)',
  },
  saveMessage: {
    flex: 1,
  },
  saveButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
  },
  historyCard: {
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    marginBottom: Spacing.two,
    gap: Spacing.one,
  },
  historyTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeader: {
    marginBottom: Spacing.one,
  },
  cards: {
    gap: Spacing.three,
  },
});
