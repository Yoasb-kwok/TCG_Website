import type { Metadata } from "next";
import { ProOsLanding } from "@/components/marketing/pro-os-landing";

export const metadata: Metadata = {
  title: { absolute: "TCG-Pro OS SMART RETAIL SYSTEM" },
  description:
    "專為香港 TCG 卡店而設的智慧網店與 POS 營運系統。24 小時網店、門市收銀、寄賣庫存同步同瑞士輪電子計分。免費試用 30 天，無需信用卡。",
};

export default function DemoLandingPage() {
  return <ProOsLanding />;
}
