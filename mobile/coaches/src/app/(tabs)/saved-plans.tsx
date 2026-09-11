import { RequireApproval } from '@/components/require-approval';
import { SavedPlansScreen } from '@/pages/saved-plans';

export default function SavedPlansScreenRoute() {
  return (
    <RequireApproval>
      <SavedPlansScreen />
    </RequireApproval>
  );
}
