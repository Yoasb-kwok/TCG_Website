"use client";

import { useParams } from "next/navigation";
import { AccountDetail } from "@/components/admin/account-detail";

export default function AdminAccountDetailPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : "";
  if (!id) return null;
  return <AccountDetail userId={id} />;
}
