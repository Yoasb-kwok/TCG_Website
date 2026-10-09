"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

export type TrendPoint = {
  label: string;
  caption?: string;
  volume: number;
  amount: number;
};

function niceMax(value: number) {
  if (value <= 1) return 1;
  const exp = 10 ** Math.floor(Math.log10(value));
  const fraction = value / exp;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return nice * exp;
}

function formatTick(value: number) {
  if (Math.abs(value) >= 10000) {
    const compact = value / 1000;
    const text = Number.isInteger(compact) ? String(compact) : compact.toFixed(1);
    return `${text}k`;
  }
  if (Number.isInteger(value)) return new Intl.NumberFormat("zh-HK").format(value);
  return value.toFixed(1);
}

export function TrendChartCard({
  title,
  description,
  points,
  volumeLabel,
  amountLabel,
  emptyLabel,
  className,
}: {
  title: string;
  description: string;
  points: TrendPoint[];
  volumeLabel: string;
  amountLabel: string;
  emptyLabel: string;
  className?: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const volumeSum = points.reduce((sum, point) => sum + point.volume, 0);
  const amountSum = points.reduce((sum, point) => sum + point.amount, 0);
  const maxVolume = niceMax(Math.max(0, ...points.map((point) => point.volume)));
  const maxAmount = niceMax(Math.max(0, ...points.map((point) => point.amount)));
  const selected = hovered ?? pinned ?? Math.max(0, points.length - 1);
  const selectedPoint = points[selected];
  const quiet = points.length > 0 && points.every((point) => point.volume === 0 && point.amount === 0);
  const ticks = [1, 0.5, 0];
  const linePoints = points
    .map((point, index) => {
      const x = index + 0.5;
      const y = 100 - (point.amount / maxAmount) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <section className={cn("rounded-xl border border-border bg-card p-4 sm:p-5", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-bold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {points.length > 0 && (
          <p className="text-sm font-bold tabular-nums">
            {volumeLabel} {new Intl.NumberFormat("zh-HK").format(volumeSum)}
            <span className="mx-1.5 text-muted-foreground">·</span>
            {amountLabel} {formatPrice(amountSum)}
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs font-bold text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-pink-500" />
          {volumeLabel}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded bg-violet-600 dark:bg-violet-300" />
          {amountLabel}
        </span>
      </div>

      {points.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <>
          <div className="mt-4 flex gap-2">
            <div className="relative h-40 w-9 shrink-0">
              {ticks.map((ratio) => (
                <span
                  key={ratio}
                  className="absolute right-0 -translate-y-1/2 text-[11px] tabular-nums text-muted-foreground"
                  style={{ top: `${(1 - ratio) * 100}%` }}
                >
                  {formatTick(maxVolume * ratio)}
                </span>
              ))}
            </div>
            <div className="relative h-40 min-w-0 flex-1" onMouseLeave={() => setHovered(null)}>
              <div className="absolute inset-0 flex">
                {points.map((point, index) => (
                  <div
                    key={`${point.label}-bg`}
                    className={cn("flex-1", index === selected && "rounded-sm bg-foreground/5")}
                  />
                ))}
              </div>
              {ticks.map((ratio) => (
                <div
                  key={ratio}
                  className="pointer-events-none absolute right-0 left-0 border-t border-border"
                  style={{ top: `${(1 - ratio) * 100}%` }}
                />
              ))}
              <div className="absolute inset-0 flex items-end">
                {points.map((point, index) => (
                  <div key={`${point.label}-bar`} className="flex h-full flex-1 items-end px-0.5 sm:px-1">
                    <div
                      className={cn(
                        "w-full rounded-t-sm bg-pink-500",
                        index === selected ? "bg-pink-400" : "opacity-80",
                      )}
                      style={{
                        height:
                          point.volume <= 0
                            ? 0
                            : `max(3px, ${(point.volume / maxVolume) * 100}%)`,
                      }}
                    />
                  </div>
                ))}
              </div>
              <svg
                className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
                viewBox={`0 0 ${points.length} 100`}
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <polyline
                  points={linePoints}
                  fill="none"
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  className="stroke-violet-600 dark:stroke-violet-300"
                />
              </svg>
              {points.map((point, index) => (
                <span
                  key={`${point.label}-dot`}
                  className={cn(
                    "pointer-events-none absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600 ring-2 ring-card dark:bg-violet-300",
                    index === selected && "h-2.5 w-2.5",
                  )}
                  style={{
                    left: `${((index + 0.5) / points.length) * 100}%`,
                    top: `${100 - (point.amount / maxAmount) * 100}%`,
                  }}
                />
              ))}
              <div className="absolute inset-0 flex">
                {points.map((point, index) => (
                  <button
                    key={`${point.label}-hit`}
                    type="button"
                    className="h-full flex-1"
                    aria-label={`${point.caption ?? point.label}，${volumeLabel} ${point.volume}，${amountLabel} ${formatPrice(point.amount)}`}
                    aria-pressed={index === pinned}
                    onMouseEnter={() => setHovered(index)}
                    onFocus={() => setPinned(index)}
                    onClick={() => setPinned(index)}
                  />
                ))}
              </div>
            </div>
            <div className="relative h-40 w-12 shrink-0">
              {ticks.map((ratio) => (
                <span
                  key={ratio}
                  className="absolute left-0 -translate-y-1/2 text-[11px] tabular-nums text-muted-foreground"
                  style={{ top: `${(1 - ratio) * 100}%` }}
                >
                  {formatTick(maxAmount * ratio)}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-2 mr-14 ml-11 flex">
            {points.map((point, index) => {
              const dense = points.length > 8;
              const show =
                !dense || index % 2 === 0 || index === points.length - 1 || point.label.includes("月");
              return (
                <span
                  key={`${point.label}-axis`}
                  className={cn(
                    "flex-1 text-center text-[10px] tabular-nums text-muted-foreground",
                    index === selected && "font-bold text-foreground",
                  )}
                >
                  {show ? point.label : ""}
                </span>
              );
            })}
          </div>
          <p className="mt-3 min-h-5 text-sm">
            {selectedPoint ? (
              <>
                <span className="font-bold">{selectedPoint.caption ?? selectedPoint.label}</span>
                <span className="text-muted-foreground">
                  {" "}
                  · {volumeLabel} {selectedPoint.volume} · {amountLabel} {formatPrice(selectedPoint.amount)}
                </span>
              </>
            ) : null}
          </p>
          {quiet && <p className="mt-1 text-sm text-muted-foreground">{emptyLabel}</p>}
        </>
      )}
    </section>
  );
}

export function PnlCompareChart({
  periodLabel,
  revenue,
  cogs,
  expenses,
  netProfit,
  className,
}: {
  periodLabel: string;
  revenue: number;
  cogs: number;
  expenses: number;
  netProfit: number;
  className?: string;
}) {
  const rows = [
    { label: "營業額", value: revenue, bar: "bg-pink-500" },
    { label: "銷貨成本", value: cogs, bar: "bg-amber-400" },
    { label: "開支", value: expenses, bar: "bg-violet-400" },
    { label: "純利", value: netProfit, bar: netProfit < 0 ? "bg-red-400" : "bg-emerald-400" },
  ];
  const max = Math.max(1, ...rows.map((row) => Math.abs(row.value)));

  return (
    <section className={cn("rounded-xl border border-border bg-card p-4 sm:p-5", className)}>
      <h2 className="font-bold">本期損益</h2>
      <p className="mt-1 text-sm text-muted-foreground">跟所選時期「{periodLabel}」對照上面的數字。</p>
      <div className="mt-5 space-y-4">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-bold">{row.label}</span>
              <span className={cn("tabular-nums", row.value < 0 && "text-red-400")}>{formatPrice(row.value)}</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full", row.bar)}
                style={{ width: `${(Math.abs(row.value) / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
