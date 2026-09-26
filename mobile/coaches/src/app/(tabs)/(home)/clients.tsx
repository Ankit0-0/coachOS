import { RequireApproval } from '@/components/require-approval';
import { ClientsScreen } from '@/pages/clients';

export default function ClientsScreenRoute() {
  return (
    <RequireApproval>
      <ClientsScreen />
    </RequireApproval>
  );
}
