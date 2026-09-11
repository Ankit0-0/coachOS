import { RequireApproval } from '@/components/require-approval';
import { WorkoutPlansScreen } from '@/pages/workout-plans';

export default function WorkoutPlansScreenRoute() {
  return (
    <RequireApproval>
      <WorkoutPlansScreen />
    </RequireApproval>
  );
}
