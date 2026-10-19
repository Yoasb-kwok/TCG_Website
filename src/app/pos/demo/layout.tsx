import { DemoChrome } from "@/components/demo/demo-chrome";
import { demoTrialWhatsAppHref } from "@/lib/demo-shop";
import { resolveWhatsAppHref } from "@/lib/whatsapp";

export const metadata = {
  title: "示範收銀",
  robots: { index: false, follow: false },
};

export default function DemoPosLayout({ children }: { children: React.ReactNode }) {
  const trialHref = demoTrialWhatsAppHref(resolveWhatsAppHref());
  return (
    <div className="flex h-dvh min-h-0 flex-col bg-background">
      <DemoChrome trialHref={trialHref} />
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
