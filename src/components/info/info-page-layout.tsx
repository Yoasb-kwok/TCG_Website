import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface InfoPageLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function InfoPageLayout({ title, subtitle, children }: InfoPageLayoutProps) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 lg:px-6">
      <nav className="mb-6 flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          首頁
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground/80">{title}</span>
      </nav>

      <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
      {subtitle && <p className="mt-3 text-muted-foreground">{subtitle}</p>}

      <div className="mt-10 space-y-8">{children}</div>
    </div>
  );
}

interface InfoSectionProps {
  title: string;
  children: React.ReactNode;
}

export function InfoSection({ title, children }: InfoSectionProps) {
  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}
