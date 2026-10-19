import { DemoAdminSidebar } from "@/components/demo/demo-admin-sidebar";
import { DemoChrome } from "@/components/demo/demo-chrome";
import { demoTrialWhatsAppHref } from "@/lib/demo-shop";
import { resolveWhatsAppHref } from "@/lib/whatsapp";

export const metadata = {
  title: "示範後台",
  robots: { index: false, follow: false },
};

export default function DemoAdminLayout({ children }: { children: React.ReactNode }) {
  const trialHref = demoTrialWhatsAppHref(resolveWhatsAppHref());
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <DemoChrome trialHref={trialHref} />
      <div className="flex min-h-0 flex-1">
        <DemoAdminSidebar />
        <div className="min-w-0 flex-1 overflow-auto">{children}</div>
      </div>
    </div>
  );
}
