import { RequireApproval } from '@/components/require-approval';
import { CreatePlanScreen } from '@/pages/create-plan';

/**
 * The plan editor, opened from a client's page ("Customise" / "Edit plan").
 * The same screen as Plans → create-plan, but in this tab's stack, so saving
 * goes back to the client rather than to the Plans tab.
 */
export default function EditPlanRoute() {
  return (
    <RequireApproval>
      <CreatePlanScreen />
    </RequireApproval>
  );
}
