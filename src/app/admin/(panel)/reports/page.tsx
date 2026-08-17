import { ReportsManager } from "@/components/admin/reports-manager";

export default function ReportsPage() {
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">收益報告</h1>
      <ReportsManager />
    </div>
  );
}
