import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Section } from '@/components/ui/section';
import { Radii, Spacing } from '@/constants/theme';
import { useDesktopLayout, useTheme } from '@/hooks/use-theme';
import { longDateLabel, shortDateLabel } from '@/lib/dates';
import { useOpenPhotoViewer } from '@/lib/photo-viewer';
import type { CheckIn, DietContent, Plan, WeightEntry } from '@/lib/api';
import type { ViewerPhoto } from '@coachos/theme';

export type Photo = {
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
  /** Newest photos shown per group; the rest sit behind "View all". */
  limit?: number;
  onViewAll?: (group: 'physique' | 'meal') => void;
};

/** Four and a bit of the fifth across a 375pt phone, so the row reads as scrollable. */
const ROW_THUMB_SIZE = 66;
/** Card padding, which the row scrolls out under. */
const CARD_PADDING = Spacing.threeHalf;
const GRID_MIN_COLUMNS = 3;
/** On a wide screen, more columns rather than bigger tiles. */
const GRID_TILE_TARGET = 120;
const GRID_COLUMN_GAP = Spacing.two;

const newestFirst = (a: Photo, b: Photo) => b.date.localeCompare(a.date);

export function physiquePhotos(weights: WeightEntry[]): Photo[] {
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

export function mealPhotos(checkIns: CheckIn[], planByAssignmentId: Map<string, Plan>): Photo[] {
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

function toViewerPhoto(photo: Photo): ViewerPhoto {
  return {
    id: photo.id,
    url: photo.url,
    title: photo.title,
    subtitle: longDateLabel(photo.date),
    accessibilityLabel: photo.accessibilityLabel,
  };
}

/** Square crop with its caption; tapping opens the whole, uncropped photo. */
function Thumbnail({ photo, size, onPress }: { photo: Photo; size: number; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={photo.accessibilityLabel}
      accessibilityHint="Opens the photo full size"
      onPress={onPress}
      style={({ pressed }) => [styles.tile, { width: size }, pressed && styles.pressed]}>
      <Image
        source={{ uri: photo.url }}
        style={[styles.thumb, { width: size, height: size, backgroundColor: theme.surfaceInset, borderColor: theme.border }]}
      />
      <ThemedText type="meta" themeColor="textSecondary" numberOfLines={1}>
        {photo.title}
      </ThemedText>
      <ThemedText type="meta" numberOfLines={1}>
        {shortDateLabel(photo.date)}
      </ThemedText>
    </Pressable>
  );
}

/** One scrolling row of the newest photos; swiping in the viewer covers the whole group. */
function PhotoRow({ photos, limit }: { photos: Photo[]; limit?: number }) {
  const openViewer = useOpenPhotoViewer();
  const isDesktop = useDesktopLayout();
  const shown = limit ? photos.slice(0, limit) : photos;
  return (
    <ScrollView
      horizontal
      // A mouse has no swipe, so the desktop gets a scrollbar to drag.
      showsHorizontalScrollIndicator={isDesktop}
      style={styles.rowBleed}
      contentContainerStyle={styles.rowContent}>
      {shown.map((photo, index) => (
        <Thumbnail
          key={photo.id}
          photo={photo}
          size={ROW_THUMB_SIZE}
          onPress={() => openViewer(photos.map(toViewerPhoto), index)}
        />
      ))}
    </ScrollView>
  );
}

/** Three across on a phone, more on a wide screen; the "View all" screen. */
export function PhotoGrid({ photos }: { photos: Photo[] }) {
  const openViewer = useOpenPhotoViewer();
  const [width, setWidth] = useState(0);
  const columns = Math.max(
    GRID_MIN_COLUMNS,
    Math.floor((width + GRID_COLUMN_GAP) / (GRID_TILE_TARGET + GRID_COLUMN_GAP)),
  );
  const tile = Math.floor((width - GRID_COLUMN_GAP * (columns - 1)) / columns);

  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={styles.grid}>
      {tile > 0
        ? photos.map((photo, index) => (
            <Thumbnail
              key={photo.id}
              photo={photo}
              size={tile}
              onPress={() => openViewer(photos.map(toViewerPhoto), index)}
            />
          ))
        : null}
    </View>
  );
}

function PhotoGroup({
  title,
  emptyMessage,
  photos,
  limit,
  onViewAll,
}: {
  title: string;
  emptyMessage: string;
  photos: Photo[];
  limit?: number;
  onViewAll?: () => void;
}) {
  const hasMore = Boolean(limit && onViewAll && photos.length > limit);
  return (
    <View style={styles.group}>
      <View style={styles.groupHeader}>
        <ThemedText type="smallBold">{title}</ThemedText>
        {hasMore ? (
          <Pressable accessibilityRole="button" onPress={onViewAll} hitSlop={12}>
            <ThemedText type="linkPrimary">View all {photos.length}</ThemedText>
          </Pressable>
        ) : (
          <ThemedText type="meta">{photos.length}</ThemedText>
        )}
      </View>

      {photos.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          {emptyMessage}
        </ThemedText>
      ) : (
        <PhotoRow photos={photos} limit={limit} />
      )}
    </View>
  );
}

/**
 * Read-only. A coach never uploads against a client's own records, so there is
 * deliberately no picker here — only what the client sent. Physique updates and
 * meal photos are kept apart because they answer different questions.
 */
export function ClientPhotos({
  weights,
  checkIns,
  planByAssignmentId,
  weightLookbackDays,
  monthLabel,
  limit,
  onViewAll,
}: ClientPhotosProps) {
  const theme = useTheme();

  return (
    <Section title="Photos">
      <Card style={styles.card}>
        <PhotoGroup
          title="Physique updates"
          emptyMessage={`No physique photos in the last ${weightLookbackDays} days.`}
          photos={physiquePhotos(weights)}
          limit={limit}
          onViewAll={onViewAll ? () => onViewAll('physique') : undefined}
        />
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <PhotoGroup
          title="Meal photos"
          emptyMessage={`No meal photos in ${monthLabel}.`}
          photos={mealPhotos(checkIns, planByAssignmentId)}
          limit={limit}
          onViewAll={onViewAll ? () => onViewAll('meal') : undefined}
        />
      </Card>
    </Section>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
  },
  group: {
    gap: Spacing.twoHalf,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  rowBleed: {
    marginHorizontal: -CARD_PADDING,
  },
  rowContent: {
    gap: Spacing.two,
    paddingHorizontal: CARD_PADDING,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: GRID_COLUMN_GAP,
    rowGap: Spacing.three,
  },
  tile: {
    gap: Spacing.half,
  },
  thumb: {
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});
