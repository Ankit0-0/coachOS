import { RequireApproval } from '@/components/require-approval';
import { DietPlansScreen } from '@/pages/diet-plans';

export default function DietPlansScreenRoute() {
  return (
    <RequireApproval>
      <DietPlansScreen />
    </RequireApproval>
  );
}
