import { RequireApproval } from '@/components/require-approval';
import { ExploreWorkoutPlansScreen } from '@/pages/explore-workout-plans';

export default function ExploreWorkoutPlansScreenRoute() {
  return (
    <RequireApproval>
      <ExploreWorkoutPlansScreen />
    </RequireApproval>
  );
}
