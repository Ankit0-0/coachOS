import { useLocalSearchParams } from 'expo-router';

import { ClientDetailScreen } from '@/pages/client-detail';

export default function ClientDetailRoute() {
  const { id, name, email } = useLocalSearchParams<{ id: string; name: string; email: string }>();
  return <ClientDetailScreen clientId={id} name={name} email={email} />;
}
