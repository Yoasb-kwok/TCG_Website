import { cn } from "@/lib/utils";

/** Page title on frame 102:2 is 38px. Subtitle is 16px. */
export const posTitle = "text-[38px] font-bold leading-none tracking-tight text-trtcg-ink";
export const posSub = "mt-1 text-[16px] leading-6 text-trtcg-muted";
/** 40px under the 96px header, 64px side inset, 24px between blocks. */
export const posPage = "flex h-full min-h-0 flex-col gap-6 overflow-auto px-4 pt-10 pb-10 lg:px-16";
export const posCard =
  "rounded-[20px] border border-[rgba(222,214,203,0.7)] bg-trtcg-surface shadow-[0_10px_14px_rgba(74,44,22,0.1)]";
export const posInput =
  "h-12 w-full rounded-[12px] border border-trtcg-input-border bg-trtcg-surface px-3.5 text-[15px] text-trtcg-ink outline-none placeholder:text-trtcg-muted focus:border-trtcg-ink";
const posBtn =
  "inline-flex h-12 items-center justify-center rounded-[14px] px-[18px] text-[15px] font-bold shadow-[0_5px_8px_rgba(74,44,22,0.08)] disabled:cursor-not-allowed";
export const posBlackBtn = `${posBtn} bg-trtcg-header text-white disabled:opacity-40`;
export const posPinkBtn = `${posBtn} bg-[var(--pos-accent,#e84e9e)] text-white hover:brightness-95 disabled:bg-trtcg-disabled disabled:text-trtcg-disabled-fg disabled:shadow-none`;
export const posLavenderBtn = `${posBtn} bg-trtcg-lavender text-trtcg-ink disabled:opacity-40`;
export const posGhostBtn = `${posBtn} border border-trtcg-input-border bg-trtcg-surface text-trtcg-ink disabled:opacity-40`;
/** Page-level black action on the title row (Figma width 190). */
export const posAction = `${posBlackBtn} w-[190px] shrink-0 border-0`;
export const posLabel = "text-[13px] font-bold text-trtcg-ink";
export const posMetric = "rounded-[20px] p-5";

export const POS_PASTELS = ["var(--trtcg-lavender)", "var(--trtcg-peach)", "var(--trtcg-lime)"] as const;

/** Figma chip names for the product types the cashier already filters on. */
export const POS_KIND_LABEL: Record<string, string> = {
  SINGLE: "單卡",
  SEALED_BOX: "卡盒",
  BOOSTER_PACK: "補充包",
  ACCESSORY: "週邊",
  GIFT_BOX: "禮盒",
};

export function posKindLabel(value: string, fallback: string) {
  return POS_KIND_LABEL[value] ?? fallback;
}

export function posChip(active: boolean) {
  return cn(
    "inline-flex h-9 items-center rounded-full px-3.5 text-[14px]",
    active ? "bg-trtcg-header font-bold text-white" : "border border-trtcg-input-border bg-trtcg-surface text-trtcg-ink",
  );
}

export function posPastel(index: number) {
  return POS_PASTELS[index % POS_PASTELS.length];
}

export function posSelectClass() {
  return cn(posInput, "h-9 w-auto rounded-full px-3.5");
}

const hktDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Hong_Kong" });
const hktTime = new Intl.DateTimeFormat("zh-HK", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Hong_Kong",
});
const hktDay = new Intl.DateTimeFormat("zh-HK", {
  month: "numeric",
  day: "numeric",
  timeZone: "Asia/Hong_Kong",
});

export function posWhen(iso: string, now = new Date()) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const day = hktDate.format(date);
  const today = hktDate.format(now);
  const yesterday = hktDate.format(new Date(now.getTime() - 86_400_000));
  const time = hktTime.format(date);
  if (day === today) return `今天 ${time}`;
  if (day === yesterday) return `昨天 ${time}`;
  return `${hktDay.format(date)} ${time}`;
}

export function posIsToday(iso: string, now = new Date()) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  return hktDate.format(date) === hktDate.format(now);
}

export function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
