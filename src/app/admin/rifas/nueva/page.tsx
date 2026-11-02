import AdminShell from "@/components/admin/AdminShell";
import RaffleWizard from "@/components/admin/RaffleWizard";
import { requireAdmin } from "@/lib/auth";

export default async function NewRafflePage() {
  await requireAdmin();
  return (
    <AdminShell title="Nueva rifa">
      <RaffleWizard />
    </AdminShell>
  );
}
