import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { TaxonomyProvider } from "@/providers/taxonomy-provider";

export default function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TaxonomyProvider>
      <div className="flex min-h-screen flex-col bg-background text-foreground md:flex-row">
        <AdminSidebar />
        <div className="min-w-0 flex-1 overflow-auto">{children}</div>
      </div>
    </TaxonomyProvider>
  );
}
