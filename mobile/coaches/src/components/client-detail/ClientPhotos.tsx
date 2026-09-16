import { Image, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Section } from '@/components/ui/section';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { shortDateLabel } from '@/lib/dates';
import type { CheckIn, DietContent, Plan, WeightEntry } from '@/lib/api';

type Photo = {
  id: string;
  /** A signed URL from the API, good for about an hour. */
  url: string;
  date: string;
  /** First caption line: the weight for a physique update, the meal for a meal photo. */
  title: string;
  accessibilityLabel: string;
};

type ClientPhotosProps = {
  weights: WeightEntry[];
  checkIns: CheckIn[];
  /**
   * Every plan the client has been assigned, keyed by assignment id. A meal
   * photo is stored under the meal's id, and the meal's label lives in the plan
   * that check-in was logged against — which may be an older plan than today's.
   */
  planByAssignmentId: Map<string, Plan>;
  /** How far back `weights` reaches, for the physique empty state. */
  weightLookbackDays: number;
  /** The month `checkIns` covers (it follows the calendar), e.g. "September 2026". */
  monthLabel: string;
};

const newestFirst = (a: Photo, b: Photo) => b.date.localeCompare(a.date);

function physiquePhotos(weights: WeightEntry[]): Photo[] {
  return weights
    .filter((entry) => entry.photoUrl)
    .map((entry) => {
      const day = shortDateLabel(entry.date);
      return {
        id: `weight-${entry.id}`,
        url: entry.photoUrl as string,
        date: entry.date,
        title: `${entry.weightKg} kg`,
        accessibilityLabel: `Physique update from ${day}, ${entry.weightKg} kilograms`,
      };
    })
    .sort(newestFirst);
}

/** The label of a meal in a diet plan, e.g. "Breakfast", or null if it can't be found. */
function mealLabel(plan: Plan | undefined, mealId: string): string | null {
  if (!plan || plan.type !== 'DIET') return null;
  // Any day of the cycle may own the id, and a photo outlives the day it was
  // taken on, so the whole plan is searched rather than one day of it.
  for (const day of (plan.content as DietContent).days ?? []) {
    const match = day.meals.find((meal) => meal.id === mealId);
    if (match) return match.label;
  }
  return null;
}

function mealPhotos(checkIns: CheckIn[], planByAssignmentId: Map<string, Plan>): Photo[] {
  const photos: Photo[] = [];
  for (const checkIn of checkIns) {
    const plan = planByAssignmentId.get(checkIn.assignmentId);
    for (const [mealId, url] of Object.entries(checkIn.photoUrls ?? {})) {
      // A meal edited out of the plan since keeps its photo, just not its name.
      const label = mealLabel(plan, mealId) ?? 'Meal';
      const day = shortDateLabel(checkIn.date);
      photos.push({
        id: `checkin-${checkIn.id}-${mealId}`,
        url,
        date: checkIn.date,
        title: label,
        accessibilityLabel: `${label}, ${day}`,
      });
    }
  }
  return photos.sort(newestFirst);
}

function PhotoGroup({ title, emptyMessage, photos }: { title: string; emptyMessage: string; photos: Photo[] }) {
  const theme = useTheme();

  return (
    <View style={styles.group}>
      <View style={styles.groupHeader}>
        <ThemedText type="smallBold">{title}</ThemedText>
        <ThemedText type="meta">{photos.length}</ThemedText>
      </View>

      {photos.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          {emptyMessage}
        </ThemedText>
      ) : (
        <View style={styles.grid}>
          {photos.map((photo) => (
            <View key={photo.id} style={styles.item}>
              <Image
                source={{ uri: photo.url }}
                accessibilityLabel={photo.accessibilityLabel}
                style={[styles.image, { backgroundColor: theme.surfaceSunken, borderColor: theme.border }]}
              />
              <ThemedText type="small" numberOfLines={1}>
                {photo.title}
              </ThemedText>
              <ThemedText type="meta">{shortDateLabel(photo.date)}</ThemedText>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/**
 * Read-only. A coach never uploads against a client's own records, so there is
 * deliberately no picker here — only what the client sent. Physique updates and
 * meal photos are kept apart because they answer different questions.
 */
export function ClientPhotos({ weights, checkIns, planByAssignmentId, weightLookbackDays, monthLabel }: ClientPhotosProps) {
  const theme = useTheme();

  return (
    <Section title="Photos">
      <Card style={styles.card}>
        <PhotoGroup
          title="Physique updates"
          emptyMessage={`No physique photos in the last ${weightLookbackDays} days.`}
          photos={physiquePhotos(weights)}
        />
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <PhotoGroup
          title="Meal photos"
          emptyMessage={`No meal photos in ${monthLabel}.`}
          photos={mealPhotos(checkIns, planByAssignmentId)}
        />
      </Card>
    </Section>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.four,
  },
  group: {
    gap: Spacing.three,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  item: {
    width: 104,
    gap: Spacing.half,
  },
  image: {
    width: 104,
    height: 128,
    borderRadius: Radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
