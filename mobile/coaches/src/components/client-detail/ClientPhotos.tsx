import { Image, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Section } from '@/components/ui/section';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { longDateLabel } from '@/lib/dates';
import type { CheckIn, WeightEntry } from '@/lib/api';

type ClientPhoto = {
  id: string;
  /** A signed URL from the API, good for about an hour. */
  url: string;
  date: string;
  kind: 'Progress' | 'Meal';
};

/**
 * Flattens the client's photos out of the two records that can carry them.
 * Newest first, so the most recent check-in is the first thing a coach sees.
 */
function collectPhotos(weights: WeightEntry[], checkIns: CheckIn[]): ClientPhoto[] {
  const photos: ClientPhoto[] = [];

  for (const entry of weights) {
    if (entry.photoUrl) {
      photos.push({ id: `weight-${entry.id}`, url: entry.photoUrl, date: entry.date, kind: 'Progress' });
    }
  }

  for (const checkIn of checkIns) {
    for (const [itemId, url] of Object.entries(checkIn.photoUrls ?? {})) {
      photos.push({ id: `checkin-${checkIn.id}-${itemId}`, url, date: checkIn.date, kind: 'Meal' });
    }
  }

  return photos.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Read-only. A coach never uploads against a client's own records, so there is
 * deliberately no picker here — only what the client sent.
 */
export function ClientPhotos({ weights, checkIns }: { weights: WeightEntry[]; checkIns: CheckIn[] }) {
  const theme = useTheme();
  const photos = collectPhotos(weights, checkIns);

  return (
    <Section title="Photos">
      {photos.length === 0 ? (
        <Card>
          <ThemedText type="small" themeColor="textSecondary">
            Nothing yet. Progress and meal photos your client adds show up here.
          </ThemedText>
        </Card>
      ) : (
        <Card>
          <View style={styles.grid}>
            {photos.map((photo) => (
              <View key={photo.id} style={styles.item}>
                <Image
                  source={{ uri: photo.url }}
                  accessibilityLabel={`${photo.kind} photo from ${longDateLabel(photo.date)}`}
                  style={[styles.image, { backgroundColor: theme.surfaceSunken, borderColor: theme.border }]}
                />
                <ThemedText type="meta">{longDateLabel(photo.date)}</ThemedText>
                <ThemedText type="meta" themeColor="textMuted">
                  {photo.kind}
                </ThemedText>
              </View>
            ))}
          </View>
        </Card>
      )}
    </Section>
  );
}

const styles = StyleSheet.create({
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
