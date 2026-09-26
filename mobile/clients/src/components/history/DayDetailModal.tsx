import { SymbolView } from 'expo-symbols';
import { useEffect, useState, type ComponentProps } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { InsetPanel, Row } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { Chip } from '@/components/ui/pill';
import { HitTarget, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDateKey, longDateLabel, weekdayLabel } from '@/lib/dates';
import { buildDaySections, type DayItem, type DaySection } from '@/lib/day-detail';
import { ProgressBar, type ThemeColor } from '@coachos/theme';

type SymbolName = ComponentProps<typeof SymbolView>['name'];
type SectionInputs = Parameters<typeof buildDaySections>;

/** Fetches one date's schedule and check-ins. Must be a stable reference. */
export type DayDetailLoader = (date: string) => Promise<{ schedule: SectionInputs[0]; checkIns: SectionInputs[1] }>;

type DayDetailModalProps = {
  /** YYYY-MM-DD; null when closed. */
  date: string | null;
  onClose: () => void;
  load: DayDetailLoader;
};

type Result = { key: string; sections: DaySection[] } | { key: string; failed: true };

const DONE_ICON: SymbolName = { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' };
const PARTIAL_ICON: SymbolName = { ios: 'circle.lefthalf.filled', android: 'timelapse', web: 'timelapse' };
const TODO_ICON: SymbolName = { ios: 'circle', android: 'radio_button_unchecked', web: 'radio_button_unchecked' };

/** A past day from the history calendar: what was scheduled and what got logged. Read-only. */
export function DayDetailModal({ date, onClose, load }: DayDetailModalProps) {
  const theme = useTheme();
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [photo, setPhoto] = useState<{ key: string; url: string } | null>(null);
  const key = `${date}#${attempt}`;
  const isFuture = date !== null && date > formatDateKey(new Date());

  useEffect(() => {
    if (!date || isFuture) return;
    let active = true;
    load(date)
      .then(({ schedule, checkIns }) => {
        if (active) setResult({ key, sections: buildDaySections(schedule, checkIns) });
      })
      .catch(() => {
        if (active) setResult({ key, failed: true });
      });
    return () => {
      active = false;
    };
  }, [date, isFuture, key, load]);

  // Keyed by date, so a slow response for one day never shows under another.
  const current = result?.key === key ? result : null;
  const openPhoto = photo?.key === key ? photo.url : null;
  const title = date ? `${weekdayLabel(date)}, ${longDateLabel(date)}` : '';

  let body;
  if (isFuture) {
    body = (
      <ThemedText type="small" themeColor="textSecondary">
        Not yet — this day hasn&apos;t happened.
      </ThemedText>
    );
  } else if (openPhoto) {
    body = (
      <View style={styles.block}>
        <Image
          source={{ uri: openPhoto }}
          style={[styles.fullPhoto, { backgroundColor: theme.surfaceInset }]}
          resizeMode="contain"
          accessibilityLabel="Meal photo"
        />
        <Button label="Back to the day" variant="secondary" onPress={() => setPhoto(null)} />
      </View>
    );
  } else if (!current) {
    body = <ActivityIndicator color={theme.textSecondary} />;
  } else if ('failed' in current) {
    body = (
      <View style={styles.block}>
        <ThemedText type="small" themeColor="textSecondary">
          This day didn&apos;t load. Check your connection and try again.
        </ThemedText>
        <Button label="Try again" variant="secondary" onPress={() => setAttempt((count) => count + 1)} />
      </View>
    );
  } else if (current.sections.length === 0) {
    body = (
      <ThemedText type="small" themeColor="textSecondary">
        No plan was assigned on this date.
      </ThemedText>
    );
  } else {
    body = current.sections.map((section) => (
      <DaySectionView key={section.type} section={section} onOpenPhoto={(url) => setPhoto({ key, url })} />
    ));
  }

  return (
    <Modal visible={date !== null} onClose={onClose} title={title}>
      {body}
    </Modal>
  );
}

function DaySectionView({ section, onOpenPhoto }: { section: DaySection; onOpenPhoto: (url: string) => void }) {
  const isWorkout = section.type === 'WORKOUT';
  return (
    <View style={styles.block}>
      <View style={styles.sectionHeader}>
        <Chip label={isWorkout ? 'Workout' : 'Diet'} tone={isWorkout ? 'green' : 'terracotta'} />
        <ThemedText type="meta" numberOfLines={1} style={styles.planTitle}>
          {section.planTitle}
        </ThemedText>
      </View>
      <ThemedText type="heading">{section.cycleLabel}</ThemedText>

      {section.isRestDay ? (
        <ThemedText type="small" themeColor="textSecondary">
          Rest day. Nothing was scheduled, so there was nothing to log.
        </ThemedText>
      ) : (
        <>
          <ProgressBar
            value={section.percent / 100}
            color={isWorkout ? 'chartWorkout' : 'chartDiet'}
            label={`${section.completed} of ${section.total} ${isWorkout ? 'sets' : 'meals'} done`}
            detail={`${section.percent}%`}
          />
          {section.logged ? null : (
            <ThemedText type="small" themeColor="textSecondary">
              Nothing logged this day.
            </ThemedText>
          )}
          {section.items.length > 0 ? (
            <InsetPanel>
              {section.items.map((item) => (
                <ItemRow key={item.id} item={item} isWorkout={isWorkout} onOpenPhoto={onOpenPhoto} />
              ))}
            </InsetPanel>
          ) : null}
        </>
      )}

      {section.notes ? (
        <View style={styles.note}>
          <ThemedText type="label" themeColor="textSecondary">
            Note
          </ThemedText>
          <ThemedText type="small">{section.notes}</ThemedText>
        </View>
      ) : null}
    </View>
  );
}

function ItemRow({
  item,
  isWorkout,
  onOpenPhoto,
}: {
  item: DayItem;
  isWorkout: boolean;
  onOpenPhoto: (url: string) => void;
}) {
  const theme = useTheme();
  const status = item.done >= item.total ? 'done' : item.done > 0 ? 'partial' : 'todo';
  const color: ThemeColor = status === 'done' ? 'success' : status === 'partial' ? 'partial' : 'textMuted';
  const icon = status === 'done' ? DONE_ICON : status === 'partial' ? PARTIAL_ICON : TODO_ICON;
  const progress = isWorkout
    ? `${item.done} of ${item.total} ${item.total === 1 ? 'set' : 'sets'} done`
    : item.done > 0
      ? 'Done'
      : 'Not done';
  const photoUrl = item.photoUrl;

  return (
    <Row chevron={false}>
      <SymbolView name={icon} size={20} tintColor={theme[color]} />
      <View style={styles.itemText}>
        <ThemedText type="smallBold">{item.name}</ThemedText>
        <ThemedText type="meta">{[item.detail, progress].filter(Boolean).join(' · ')}</ThemedText>
      </View>
      {photoUrl ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open the photo of ${item.name}`}
          onPress={() => onOpenPhoto(photoUrl)}>
          <Image source={{ uri: photoUrl }} style={[styles.thumb, { backgroundColor: theme.surfaceInset }]} />
        </Pressable>
      ) : null}
    </Row>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: Spacing.twoHalf,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  planTitle: {
    flex: 1,
  },
  itemText: {
    flex: 1,
    gap: Spacing.half,
  },
  thumb: {
    width: HitTarget,
    height: HitTarget,
    borderRadius: Radii.sm,
  },
  fullPhoto: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: Radii.md,
  },
  note: {
    gap: Spacing.one,
  },
});
