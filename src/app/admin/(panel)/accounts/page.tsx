import { AccountsManager } from "@/components/admin/accounts-manager";

export default function AccountsPage() {
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">帳戶管理</h1>
      <AccountsManager />
    </div>
  );
}
