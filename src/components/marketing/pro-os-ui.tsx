import type { ReactNode } from "react";
import { Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export const proPageClass =
  "relative flex min-h-full flex-1 flex-col scroll-smooth bg-[#070b14] text-slate-100 [color-scheme:dark]";

export const proWrap = "mx-auto w-full max-w-6xl px-4 sm:px-6";

export const proCtaClass =
  "inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 via-sky-500 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_28px_rgba(56,189,248,0.28)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300";

export const proGhostClass =
  "inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-[#121a2e] px-5 py-2.5 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-[#1a2438] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300";

export function ProLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 shadow-[0_0_16px_rgba(56,189,248,0.4)]">
        <svg viewBox="0 0 24 24" className="size-5 text-white" fill="none" aria-hidden="true">
          <path d="M12 3.2 4.2 7.4 12 11.6l7.8-4.2L12 3.2Z" fill="currentColor" opacity="0.95" />
          <path d="M4.2 12.2 12 16.4l7.8-4.2" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          <path d="M4.2 16.2 12 20.4l7.8-4.2" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-sm font-bold tracking-wide text-white">TCG-Pro OS</span>
        {compact ? null : (
          <span className="hidden text-[10px] font-medium tracking-[0.16em] text-slate-400 sm:block">
            SMART RETAIL SYSTEM
          </span>
        )}
      </span>
    </span>
  );
}

export function SectionHeading({
  kicker,
  title,
  subtitle,
}: {
  kicker: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <p className="text-[11px] font-semibold tracking-[0.22em] text-cyan-300">{kicker}</p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-slate-400 sm:text-base">{subtitle}</p>
    </div>
  );
}

export function Bullet({
  tone,
  children,
}: {
  tone: "bad" | "good";
  children: ReactNode;
}) {
  const good = tone === "good";
  return (
    <li className="flex gap-3 text-sm leading-6 text-slate-300">
      <span
        className={cn(
          "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full",
          good ? "bg-emerald-400/15 text-emerald-300" : "bg-rose-500/15 text-rose-300",
        )}
      >
        {good ? <Check className="size-3" aria-hidden="true" /> : <span className="text-xs font-bold">×</span>}
      </span>
      <span>{children}</span>
    </li>
  );
}

export function HeroBadge({ children }: { children: ReactNode }) {
  return (
    <p className="inline-flex max-w-full items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1.5 text-xs text-cyan-50 sm:px-4 sm:text-sm">
      <Sparkles className="size-3.5 shrink-0 text-cyan-300" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
