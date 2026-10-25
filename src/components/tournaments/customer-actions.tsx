import Link from "next/link";
import { CancelRegistrationButton } from "@/components/tournaments/cancel-registration-button";

const scoreboardClass =
  "inline-flex h-8 items-center justify-center rounded-lg border border-border px-3 text-sm font-medium hover:bg-muted";
const signupClass =
  "inline-flex h-8 items-center justify-center rounded-lg bg-white px-3 text-sm font-medium text-black hover:bg-white/90";
const quietClass = "inline-flex h-8 items-center px-1 text-sm font-medium text-muted-foreground";

export function TournamentCustomerActions({
  slug,
  canRegister,
  signedUp,
  canCancel = false,
  closedLabel,
  showScoreboard = false,
  detailsCurrent = false,
  appearance = "compact",
}: {
  slug: string;
  canRegister: boolean;
  signedUp: boolean;
  /** Signed-in member owns this signup. Cookie-only signup stays read-only. */
  canCancel?: boolean;
  closedLabel: string | null;
  showScoreboard?: boolean;
  detailsCurrent?: boolean;
  appearance?: "compact" | "frame";
}) {
  const registerHref = `/tournaments/${slug}/register`;
  const detailsHref = `/tournaments/${slug}`;
  const joined = signedUp || canCancel;

  const frame = appearance === "frame";
  const primaryClass = frame
    ? "inline-flex h-12 w-full items-center justify-center rounded-[10px] border border-[#c8a24a] bg-[#080808] px-6 text-[14px] font-medium text-white hover:bg-[#1c1c1c]"
    : signupClass;
  const quietFrame = frame
    ? "inline-flex h-12 w-fit items-center justify-center rounded-[10px] bg-[#e7f3c9] px-5 text-[14px] font-medium text-[#080808] hover:bg-[#dcebb6]"
    : scoreboardClass;

  return (
    <div className={frame ? "flex flex-col items-start gap-4" : "flex flex-wrap items-center gap-2"}>
      {showScoreboard ? (
        <Link href="/tournaments/live" className={scoreboardClass}>
          現場計分板
        </Link>
      ) : null}
      {joined ? <span className={quietClass}>已報名</span> : null}
      {canCancel ? <CancelRegistrationButton slug={slug} /> : null}
      {!joined && canRegister ? (
        <Link href={registerHref} className={primaryClass}>
          立即報名
        </Link>
      ) : null}
      {!joined && !canRegister && closedLabel ? (
        <span className={quietClass}>{closedLabel}</span>
      ) : null}
      <Link
        href={detailsHref}
        aria-current={detailsCurrent ? "page" : undefined}
        className={frame ? quietFrame : scoreboardClass}
      >
        比賽詳情
      </Link>
    </div>
  );
}
