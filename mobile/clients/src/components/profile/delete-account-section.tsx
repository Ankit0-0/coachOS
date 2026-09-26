import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { LegalLinks } from '@/components/legal-links';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Section } from '@/components/ui/section';
import { Radii, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { useTheme } from '@/hooks/use-theme';
import { describeError } from '@/lib/api-errors';

/**
 * Profile → Delete account. Both stores require that an account made in the
 * app can be deleted in the app. Two steps, stated plainly, and inline rather
 * than an Alert (a no-op on web).
 */
export function DeleteAccountSection({ consequence }: { consequence: string }) {
  const theme = useTheme();
  const { deleteAccount } = useAuth();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await deleteAccount();
      // Signed out: the root layout takes it from here.
    } catch (caught) {
      setError(describeError(caught));
      setIsDeleting(false);
    }
  };

  return (
    <Section title="Privacy">
      <Card style={styles.card}>
        <LegalLinks />
        {isConfirming ? (
          <View style={styles.confirm}>
            <ThemedText type="smallBold">Delete your account for good?</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {consequence} This can’t be undone.
            </ThemedText>
            {error ? (
              <View style={[styles.error, { backgroundColor: theme.dangerSoft }]}>
                <ThemedText type="small" themeColor="danger">
                  {error}
                </ThemedText>
              </View>
            ) : null}
            <View style={styles.actions}>
              <View style={styles.action}>
                <Button
                  label="Keep account"
                  variant="secondary"
                  onPress={() => setIsConfirming(false)}
                  disabled={isDeleting}
                  fullWidth
                />
              </View>
              <View style={styles.action}>
                <Button label="Delete" variant="danger" onPress={() => void handleDelete()} loading={isDeleting} fullWidth />
              </View>
            </View>
          </View>
        ) : (
          <Button label="Delete account" variant="ghost" onPress={() => setIsConfirming(true)} fullWidth />
        )}
      </Card>
    </Section>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
  },
  confirm: {
    gap: Spacing.two,
  },
  error: {
    borderRadius: Radii.sm,
    padding: Spacing.three,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  action: {
    flex: 1,
  },
});
