"use client";

import { useState } from "react";
import { LayoutGrid } from "lucide-react";
import {
  ROI_DEFAULT_EVENTS,
  ROI_DEFAULT_REVENUE,
  ROI_EVENTS_MAX,
  ROI_REVENUE_MAX,
  ROI_REVENUE_STEP,
  estimateProOsRoi,
  formatHkd,
} from "@/lib/pro-os-roi";

export function ProOsRoiPanel() {
  const [revenue, setRevenue] = useState(ROI_DEFAULT_REVENUE);
  const [events, setEvents] = useState(ROI_DEFAULT_EVENTS);
  const estimate = estimateProOsRoi(revenue, events);

  return (
    <div className="rounded-[28px] border border-white/10 bg-[#0c1424] p-5 sm:p-7">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-cyan-400/10 text-cyan-300">
          <LayoutGrid className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-lg font-semibold text-white">門市效益與省時互動試算器</h3>
          <p className="mt-1 text-sm text-slate-400">滑動下方數據，估算您的卡店每月可節省的時間與新增收入</p>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)] lg:items-center">
        <div className="space-y-7">
          <label className="block">
            <span className="flex items-center justify-between gap-3 text-sm">
              <span className="text-slate-300">目前門市每月營業額 (HKD):</span>
              <span className="font-semibold text-cyan-300">{formatHkd(revenue)}</span>
            </span>
            <input
              type="range"
              min={0}
              max={ROI_REVENUE_MAX}
              step={ROI_REVENUE_STEP}
              value={revenue}
              aria-valuemin={0}
              aria-valuemax={ROI_REVENUE_MAX}
              aria-valuenow={revenue}
              aria-valuetext={formatHkd(revenue)}
              onChange={(event) => setRevenue(Number(event.target.value))}
              className="mt-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-cyan-400"
            />
          </label>
          <label className="block">
            <span className="flex items-center justify-between gap-3 text-sm">
              <span className="text-slate-300">每月舉辦比賽場數:</span>
              <span className="font-semibold text-amber-300">{events} 場</span>
            </span>
            <input
              type="range"
              min={0}
              max={ROI_EVENTS_MAX}
              step={1}
              value={events}
              aria-valuemin={0}
              aria-valuemax={ROI_EVENTS_MAX}
              aria-valuenow={events}
              aria-valuetext={`${events} 場`}
              onChange={(event) => setEvents(Number(event.target.value))}
              className="mt-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-amber-400"
            />
          </label>
        </div>

        <div className="rounded-2xl border border-white/8 bg-[#10192c] p-5">
          <p className="text-sm font-medium text-slate-200">預計每月營運回報</p>
          <dl className="mt-5 space-y-4">
            <div className="flex items-end justify-between gap-4">
              <dt className="text-sm text-slate-400">每月節省對數及比賽處理時間:</dt>
              <dd className="shrink-0 text-lg font-semibold text-cyan-300">約 {estimate.hoursSaved} 小時</dd>
            </div>
            <div className="flex items-end justify-between gap-4">
              <dt className="text-sm text-slate-400">預計新增線上自動網店營業額:</dt>
              <dd className="shrink-0 text-lg font-semibold text-emerald-300">
                + {formatHkd(estimate.onlineSalesHkd)}
              </dd>
            </div>
          </dl>
          <p className="mt-5 text-[11px] leading-5 text-slate-500">
            * 試算結果基於類似香港 TCG 專賣店採用 TCG-Pro OS 後的平均營運數據推算。
          </p>
        </div>
      </div>
    </div>
  );
}
