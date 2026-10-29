import { cn } from "@/lib/utils";

export const posTitle = "text-[32px] font-bold leading-none tracking-tight text-[#171514]";
export const posSub = "mt-1 text-[15px] leading-6 text-[#706c68]";
export const posCard =
  "rounded-[20px] border border-[rgba(222,214,203,0.7)] bg-white shadow-[0_10px_14px_rgba(74,44,22,0.1)]";
export const posInput =
  "h-12 w-full rounded-[12px] border border-[#ded6cb] bg-white px-3.5 text-[15px] text-[#171514] outline-none placeholder:text-[#706c68] focus:border-[#171514]";
export const posBlackBtn =
  "inline-flex h-12 items-center justify-center rounded-[14px] bg-[#090909] px-[18px] text-[15px] font-bold text-white shadow-[0_5px_8px_rgba(74,44,22,0.08)] disabled:cursor-not-allowed disabled:opacity-40";
export const posPinkBtn =
  "inline-flex h-12 items-center justify-center rounded-[14px] bg-[#e84e9e] px-[18px] text-[15px] font-bold text-white shadow-[0_5px_8px_rgba(74,44,22,0.08)] hover:bg-[#d63d8e] disabled:cursor-not-allowed disabled:bg-[#ded6cb] disabled:text-[#706c68] disabled:shadow-none";
export const posLavenderBtn =
  "inline-flex h-12 items-center justify-center rounded-[14px] bg-[#e8dfff] px-[18px] text-[15px] font-bold text-[#171514] shadow-[0_5px_8px_rgba(74,44,22,0.08)] disabled:opacity-40";
export const posGhostBtn =
  "inline-flex h-12 items-center justify-center rounded-[14px] border border-[#ded6cb] bg-white px-[18px] text-[15px] font-bold text-[#171514] shadow-[0_5px_8px_rgba(74,44,22,0.08)] disabled:cursor-not-allowed disabled:opacity-40";
export const posLabel = "text-[13px] font-bold text-[#171514]";

export const POS_PASTELS = ["#e8dfff", "#ffd0a3", "#ddeb9f"] as const;

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
    active ? "bg-[#090909] font-bold text-white" : "border border-[#ded6cb] bg-white text-[#171514]",
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
