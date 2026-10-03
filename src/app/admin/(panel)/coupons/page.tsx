import { CouponsManager } from "@/components/admin/coupons-manager";

export default function CouponsPage() {
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">優惠券管理</h1>
      <CouponsManager />
    </div>
  );
}
