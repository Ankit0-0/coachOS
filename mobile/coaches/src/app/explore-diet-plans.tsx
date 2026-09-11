import { RequireApproval } from '@/components/require-approval';
import { ExploreDietPlansScreen } from '@/pages/explore-diet-plans';

export default function ExploreDietPlansScreenRoute() {
  return (
    <RequireApproval>
      <ExploreDietPlansScreen />
    </RequireApproval>
  );
}
