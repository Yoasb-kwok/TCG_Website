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
}: {
  slug: string;
  canRegister: boolean;
  signedUp: boolean;
  /** Signed-in member owns this signup. Cookie-only signup stays read-only. */
  canCancel?: boolean;
  closedLabel: string | null;
  showScoreboard?: boolean;
  detailsCurrent?: boolean;
}) {
  const registerHref = `/tournaments/${slug}/register`;
  const detailsHref = `/tournaments/${slug}`;
  const joined = signedUp || canCancel;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {showScoreboard ? (
        <Link href="/tournaments/live" className={scoreboardClass}>
          現場計分板
        </Link>
      ) : null}
      {joined ? <span className={quietClass}>已報名</span> : null}
      {canCancel ? <CancelRegistrationButton slug={slug} /> : null}
      {!joined && canRegister ? (
        <Link href={registerHref} className={signupClass}>
          立即報名
        </Link>
      ) : null}
      {!joined && !canRegister && closedLabel ? (
        <span className={quietClass}>{closedLabel}</span>
      ) : null}
      <Link
        href={detailsHref}
        aria-current={detailsCurrent ? "page" : undefined}
        className={scoreboardClass}
      >
        比賽詳情
      </Link>
    </div>
  );
}
