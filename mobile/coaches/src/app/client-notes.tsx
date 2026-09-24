import { RequireApproval } from '@/components/require-approval';
import { ClientNotesScreen } from '@/pages/client-notes';

export default function ClientNotesRoute() {
  return (
    <RequireApproval>
      <ClientNotesScreen />
    </RequireApproval>
  );
}
