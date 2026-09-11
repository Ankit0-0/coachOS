import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { Spacing } from '@/constants/theme';
import type { CoachApprovalStatus } from '@/lib/api';

type PendingApprovalStateProps = {
  status: CoachApprovalStatus | null;
};

/**
 * Stands in for a whole screen while a coach's account is waiting on (or has
 * been refused) admin approval. The backend rejects these actions with 423
 * regardless, so the point here is to say why rather than to let someone fill
 * in a form that cannot succeed.
 */
export function PendingApprovalState({ status }: PendingApprovalStateProps) {
  const router = useRouter();
  const isRejected = status === 'REJECTED';

  return (
    <ScreenScaffold includeBottomTabInset>
      <View style={styles.header}>
        <Pill label={isRejected ? 'Not approved' : 'Pending approval'} />
        <ThemedText type="display">
          {isRejected ? 'Your account wasn’t approved' : 'Your account is pending admin approval'}
        </ThemedText>
      </View>

      <Card style={styles.panel}>
        <ThemedText type="small" themeColor="textSecondary">
          {isRejected
            ? 'An admin reviewed your account and didn’t approve it. If you think that’s a mistake, reply to your sign-up email and someone will take another look.'
            : 'An admin reviews every new coach account before it goes live. You’ll be able to invite clients, build plans, and assign them as soon as yours is approved.'}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          In the meantime you can fill in your profile, so it’s ready the moment you’re cleared.
        </ThemedText>
        <Button label="Go to your profile" variant="secondary" onPress={() => router.push('/profile')} fullWidth />
      </Card>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  panel: {
    gap: Spacing.three,
  },
});
