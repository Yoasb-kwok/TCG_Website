import type { ReactNode } from "react";
import Link from "next/link";

export function AdminPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 max-w-3xl">
        <h1 className="text-[40px] font-bold leading-[1.3] text-trtcg-ink">{title}</h1>
        {description ? (
          <p className="mt-3 text-[16px] leading-[1.65] text-trtcg-muted">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function AdminMetric({
  label,
  value,
  tone = "surface",
  href,
  stack = "label",
}: {
  label: string;
  value: ReactNode;
  tone?: "surface" | "lavender" | "peach" | "lime";
  href?: string;
  /** Overview puts the caption above the figure. List summaries put the figure first. */
  stack?: "label" | "value";
}) {
  const toneClass = {
    surface: "bg-white",
    lavender: "bg-trtcg-lavender",
    peach: "bg-trtcg-peach",
    lime: "bg-trtcg-lime",
  }[tone];
  const className = `flex min-h-[102px] flex-col justify-between rounded-3xl p-6 ${toneClass}`;
  const figure = (
    <p
      className={
        stack === "value"
          ? "text-[28px] font-bold leading-[1.2] text-trtcg-ink"
          : "text-[40px] font-bold leading-[1.3] text-trtcg-ink"
      }
    >
      {value}
    </p>
  );
  const caption = <p className="text-[13px] leading-[1.6] text-trtcg-muted">{label}</p>;
  const body = (
    <>
      {stack === "value" ? figure : caption}
      {stack === "value" ? caption : figure}
    </>
  );
  if (href) {
    return (
      <Link href={href} className={className}>
        {body}
      </Link>
    );
  }
  return <div className={className}>{body}</div>;
}

export const adminCardClass = "rounded-3xl bg-white p-6 text-trtcg-ink";
export const adminTableClass = "overflow-x-auto rounded-3xl bg-white";
