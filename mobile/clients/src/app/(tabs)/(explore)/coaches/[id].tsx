import { useLocalSearchParams } from 'expo-router';

import { CoachProfileScreen } from '@/pages/coach-profile';

export default function CoachProfileRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CoachProfileScreen coachId={id} />;
}
