import { RequireApproval } from '@/components/require-approval';
import { ClientPhotosScreen } from '@/pages/client-photos';

export default function ClientPhotosRoute() {
  return (
    <RequireApproval>
      <ClientPhotosScreen />
    </RequireApproval>
  );
}
