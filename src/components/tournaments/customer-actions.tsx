import Link from "next/link";

const scoreboardClass =
  "inline-flex h-8 items-center justify-center rounded-lg border border-border px-3 text-sm font-medium hover:bg-muted";
const signupClass =
  "inline-flex h-8 items-center justify-center rounded-lg bg-white px-3 text-sm font-medium text-black hover:bg-white/90";
const quietClass = "inline-flex h-8 items-center px-1 text-sm font-medium text-muted-foreground";

export function TournamentCustomerActions({
  slug,
  canRegister,
  signedUp,
  closedLabel,
  showScoreboard = false,
  detailsCurrent = false,
}: {
  slug: string;
  canRegister: boolean;
  signedUp: boolean;
  closedLabel: string | null;
  showScoreboard?: boolean;
  detailsCurrent?: boolean;
}) {
  const registerHref = `/tournaments/${slug}/register`;
  const detailsHref = `/tournaments/${slug}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {showScoreboard ? (
        <Link href="/tournaments/live" className={scoreboardClass}>
          現場計分板
        </Link>
      ) : null}
      {signedUp ? (
        <span className={quietClass}>已報名</span>
      ) : canRegister ? (
        <Link href={registerHref} className={signupClass}>
          立即報名
        </Link>
      ) : closedLabel ? (
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
