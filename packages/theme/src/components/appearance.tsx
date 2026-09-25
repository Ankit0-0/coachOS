import { StyleSheet } from 'react-native';

import { useAppearance, type AppearanceMode } from '../provider';
import { Spacing } from '../tokens';
import { SegmentedControl } from './controls';
import { Card, Section } from './surfaces';
import { ThemedText } from './text';

const MODES = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const satisfies readonly { value: AppearanceMode; label: string }[];

/** Profile's System / Light / Dark picker; applies at once and is remembered. */
export function AppearanceSection() {
  const { mode, setMode } = useAppearance();
  return (
    <Section title="Appearance">
      <Card style={styles.card}>
        <ThemedText type="small" themeColor="textSecondary">
          System follows your phone&apos;s setting.
        </ThemedText>
        <SegmentedControl options={MODES} value={mode} onChange={setMode} accessibilityLabel="Appearance" />
      </Card>
    </Section>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.twoHalf,
  },
});
