import Link from "next/link";
import { CancelRegistrationButton } from "@/components/tournaments/cancel-registration-button";
import {
  homeCardShadow,
  homeDisabledButton,
  homePrimaryButton,
  homeQuietLink,
} from "@/components/home/home-layout";
import { formatDate, formatPrice } from "@/lib/format";
import { registrationClosedLabel } from "@/lib/registration-input";
import type { TournamentItem } from "@/lib/types";

const STATUS_LABELS: Record<string, string> = {
  OPEN: "報名中",
  FULL: "已滿",
  IN_PROGRESS: "進行中",
  COMPLETED: "已結束",
  DRAFT: "草稿",
  CANCELLED: "已取消",
};

export function HomeEventCard({
  tournament,
  playerNames,
  signedUp,
  canCancel = false,
  showScoreboard = false,
}: {
  tournament: TournamentItem;
  playerNames: string[];
  signedUp: boolean;
  canCancel?: boolean;
  showScoreboard?: boolean;
}) {
  const closedLabel = registrationClosedLabel(tournament);
  const joined = signedUp || canCancel;
  const canRegister = !joined && closedLabel === null;

  return (
    <article
      className={`flex flex-col gap-6 rounded-[12px] border border-[rgba(200,162,74,0.9)] bg-[rgba(255,255,255,0.98)] p-8 ${homeCardShadow}`}
    >
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-[28px] font-medium leading-[1.4] text-[#0a0a09]">{tournament.title}</h3>
        <span className="inline-flex h-7 shrink-0 items-center rounded-full border border-[#c8a24a] bg-[#ece7dc] px-3 text-[13px] leading-[1.6] text-[#080808]">
          {STATUS_LABELS[tournament.status] ?? tournament.status}
        </span>
      </div>
      <p className="text-[13px] leading-[1.6] text-[#625f58]">{tournament.format}</p>
      {tournament.description ? (
        <p className="text-[16px] leading-[1.65] text-[#0a0a09]">{tournament.description}</p>
      ) : null}
      <div className="h-px bg-[rgba(200,162,74,0.55)]" />
      <div className="text-[16px] leading-[1.65] text-[#0a0a09]">
        <p>{formatDate(tournament.startsAt)}</p>
        <p>
          {tournament.location}
          {"   ·   "}
          {tournament.registeredCount} / {tournament.maxPlayers} 人
        </p>
      </div>
      <section aria-label="已報名選手" className="flex flex-col gap-3">
        <p className="text-[14px] font-medium leading-[1.45] text-[#0a0a09]">已報名選手</p>
        <p className="text-[13px] leading-[1.6] text-[#625f58]">
          {playerNames.length > 0 ? playerNames.join("   ·   ") : "暫無報名"}
        </p>
      </section>
      {tournament.prizePool ? (
        <p className="text-[16px] leading-[1.65] text-[#0a0a09]">獎品：{tournament.prizePool}</p>
      ) : null}
      <div className="flex items-center justify-between gap-3">
        <p className="text-[24px] font-medium leading-[1.2] text-[#0a0a09]">
          {tournament.entryFee > 0 ? formatPrice(tournament.entryFee) : "免費"}
        </p>
        {canRegister ? (
          <Link
            href={`/tournaments/${tournament.slug}/register`}
            className={`${homePrimaryButton} min-w-[148px]`}
          >
            立即報名
          </Link>
        ) : (
          <button type="button" disabled className={`${homeDisabledButton} min-w-[148px]`}>
            {joined ? "已報名" : (closedLabel ?? "此賽事已不再接受報名")}
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {canCancel ? <CancelRegistrationButton slug={tournament.slug} /> : null}
        {showScoreboard ? (
          <Link href="/tournaments/live" className={homeQuietLink}>
            現場計分板
          </Link>
        ) : null}
        <Link href={`/tournaments/${tournament.slug}`} className={`${homeQuietLink} w-[140px] justify-start px-0`}>
          比賽詳情
        </Link>
      </div>
    </article>
  );
}
