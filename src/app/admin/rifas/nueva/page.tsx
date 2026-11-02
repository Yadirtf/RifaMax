import AdminShell from "@/components/admin/AdminShell";
import RaffleForm from "@/components/admin/RaffleForm";
import { requireAdmin } from "@/lib/auth";

export default async function NewRafflePage() {
  await requireAdmin();
  return (
    <AdminShell>
      <h1 className="mb-4 text-2xl font-bold">Nueva rifa</h1>
      <RaffleForm />
    </AdminShell>
  );
}
