import { notFound } from "next/navigation";
import { DemoPosDesk } from "@/components/demo/demo-pos-desk";
import { DEMO_POS_DESKS, isDemoPosDesk } from "@/lib/demo-paths";

interface PageProps {
  params: Promise<{ desk: string }>;
}

export function generateStaticParams() {
  return DEMO_POS_DESKS.map((desk) => ({ desk }));
}

export default async function DemoPosDeskPage({ params }: PageProps) {
  const { desk } = await params;
  if (!isDemoPosDesk(desk)) notFound();
  return <DemoPosDesk desk={desk} />;
}
