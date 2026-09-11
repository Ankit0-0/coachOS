import { RequireApproval } from '@/components/require-approval';
import { HomeScreen } from '@/pages/home';

export default function HomeScreenRoute() {
  return (
    <RequireApproval>
      <HomeScreen />
    </RequireApproval>
  );
}
