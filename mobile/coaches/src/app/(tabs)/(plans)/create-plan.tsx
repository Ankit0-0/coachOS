import { RequireApproval } from '@/components/require-approval';
import { CreatePlanScreen } from '@/pages/create-plan';

export default function CreatePlanScreenRoute() {
  return (
    <RequireApproval>
      <CreatePlanScreen />
    </RequireApproval>
  );
}
