import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GoogleCalendarLink } from "@/components/tournaments/google-calendar-link";
import { RegistrantNames } from "@/components/tournaments/registrant-names";
import { TournamentCustomerActions } from "@/components/tournaments/customer-actions";
import { homeContainer } from "@/components/home/home-layout";
import { formatDate, formatPrice } from "@/lib/format";
import { loadPublicTournamentView } from "@/lib/public-tournament-view";
import { cancelRegistrationRefusal } from "@/lib/tournament-registrations";
import { decodeRouteSlug, registrationClosedLabel } from "@/lib/registration-input";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function TournamentDetailPage({ params }: PageProps) {
  const { slug: rawSlug } = await params;
  const slug = decodeRouteSlug(rawSlug);
  const { tournaments, namesBySlug, registeredSlugs, ownedSlugs, isAdmin } =
    await loadPublicTournamentView();
  const tournament = tournaments.find((item) => item.slug === slug);

  if (!tournament) notFound();

  const spotsLeft = tournament.maxPlayers - tournament.registeredCount;
  const closedLabel = registrationClosedLabel(tournament);
  const signedUp = registeredSlugs.has(tournament.slug);
  const names = namesBySlug.get(tournament.slug) ?? [];

  return (
    <div className={`${homeContainer} flex flex-col gap-8 py-16 text-[#0a0a09]`}>
      <Link
        href="/tournaments"
        className="inline-flex h-12 w-fit items-center rounded-[10px] bg-[#e7f3c9] px-4 text-[14px] font-medium text-[#080808] transition hover:bg-[#dcebb6]"
      >
        ← 返回賽事
      </Link>

      <h1 className="text-[40px] font-medium leading-[1.3]">{tournament.title}</h1>

      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(280px,464px)] xl:gap-10">
        <section className="flex flex-col gap-6 rounded-[24px] bg-white p-6 shadow-[0_10px_24px_rgba(0,0,0,0.06)] sm:p-10">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-[28px] font-medium leading-[1.4]">{tournament.title}</h2>
            {tournament.format ? (
              <span className="inline-flex h-7 items-center rounded-full border border-[#c8a24a] bg-[#f5ebcf] px-3 text-[13px]">
                {tournament.format}
              </span>
            ) : null}
          </div>
          {tournament.description ? (
            <p className="text-[16px] leading-[1.65] text-[#625f58]">{tournament.description}</p>
          ) : null}
          <div className="h-px bg-[#e6dfd2]" />
          <dl className="flex flex-col gap-4 text-[16px]">
            <div className="grid gap-2 sm:grid-cols-[120px_minmax(0,1fr)]">
              <dt className="text-[13px] text-[#625f58]">比賽時間</dt>
              <dd>{formatDate(tournament.startsAt)}</dd>
            </div>
            <div className="grid gap-2 sm:grid-cols-[120px_minmax(0,1fr)]">
              <dt className="text-[13px] text-[#625f58]">地點</dt>
              <dd>{tournament.location}</dd>
            </div>
            <div className="grid gap-2 sm:grid-cols-[120px_minmax(0,1fr)]">
              <dt className="text-[13px] text-[#625f58]">名額</dt>
              <dd>
                尚餘 {spotsLeft} 位（{tournament.registeredCount} / {tournament.maxPlayers}）
              </dd>
            </div>
            {tournament.prizePool ? (
              <div className="grid gap-2 sm:grid-cols-[120px_minmax(0,1fr)]">
                <dt className="text-[13px] text-[#625f58]">獎品</dt>
                <dd>{tournament.prizePool}</dd>
              </div>
            ) : null}
          </dl>
          <div className="flex flex-col gap-3">
            <p className="text-[14px] font-medium">已報名選手</p>
            <RegistrantNames names={names} variant="line" />
          </div>
        </section>

        <aside className="flex flex-col gap-6 rounded-[24px] bg-white p-8 shadow-[0_10px_24px_rgba(0,0,0,0.06)]">
          <Image src="/brand/home/icon-calendar.svg" alt="" width={32} height={32} unoptimized />
          <p className="text-[16px] text-[#625f58]">報名費</p>
          <p className="text-[64px] font-medium leading-none">
            {tournament.entryFee > 0 ? formatPrice(tournament.entryFee) : "免費"}
          </p>
          <TournamentCustomerActions
            slug={tournament.slug}
            canRegister={!closedLabel}
            signedUp={signedUp}
            canCancel={
              ownedSlugs.has(tournament.slug) && cancelRegistrationRefusal(tournament.status) === null
            }
            closedLabel={closedLabel}
            showScoreboard={isAdmin}
            detailsCurrent
            appearance="frame"
          />
          <GoogleCalendarLink tournament={tournament} />
        </aside>
      </div>
    </div>
  );
}
