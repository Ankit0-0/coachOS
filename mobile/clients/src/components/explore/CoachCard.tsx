import { Pressable, StyleSheet, View } from 'react-native';

import { CLIENTS_ICON, EXPERIENCE_ICON, StatChip } from '@/components/explore/StatChip';
import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Chip, Pill } from '@/components/ui/pill';
import { Spacing } from '@/constants/theme';
import type { DirectoryCoach } from '@/lib/api';
import { clientCountLabel, experienceLabel, relationshipPill } from '@/lib/explore';

/** More than this and the badges wrap into a second line that pushes the stats out of a scan. */
const MAX_SPECIALTY_BADGES = 3;

type CoachCardProps = {
  coach: DirectoryCoach;
  onPress: () => void;
};

/**
 * A coach as a scannable profile: who (photo, name, the opening of their bio),
 * what they coach (specialty badges), and why to trust them (stat chips). Each
 * row appears only when there's something real to put in it.
 */
export function CoachCard({ coach, onPress }: CoachCardProps) {
  const relationship = relationshipPill(coach.relationship);
  const experience = experienceLabel(coach.yearsExperience);
  const clients = clientCountLabel(coach);
  const badges = coach.specialties.slice(0, MAX_SPECIALTY_BADGES);
  const hiddenBadges = coach.specialties.length - badges.length;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View ${coach.name}'s profile`}
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}>
      <Card style={styles.card}>
        <View style={styles.identity}>
          <Avatar name={coach.name} size="md" imageUrl={coach.avatarUrl} />
          <View style={styles.identityCopy}>
            <View style={styles.nameRow}>
              <ThemedText type="heading" numberOfLines={1} style={styles.name}>
                {coach.name}
              </ThemedText>
              {relationship ? <Pill label={relationship.label} tone={relationship.tone} /> : null}
            </View>
            {/* There's no headline field, so the bio's opening stands in for one. */}
            {coach.bio ? (
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                {coach.bio}
              </ThemedText>
            ) : null}
          </View>
        </View>

        {badges.length > 0 ? (
          <View style={styles.wrapRow}>
            {badges.map((specialty) => (
              <Chip key={specialty} label={specialty} tone="green" />
            ))}
            {hiddenBadges > 0 ? <Chip label={`+${hiddenBadges}`} tone="neutral" /> : null}
          </View>
        ) : null}

        {experience || clients ? (
          <View style={styles.wrapRow}>
            {experience ? <StatChip icon={EXPERIENCE_ICON} label={experience} /> : null}
            {clients ? <StatChip icon={CLIENTS_ICON} label={clients} /> : null}
          </View>
        ) : null}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  identityCopy: {
    flex: 1,
    gap: Spacing.one,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  name: {
    flexShrink: 1,
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.85,
  },
});
