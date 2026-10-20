import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DemoRegisterForm } from "@/components/demo/demo-register-form";
import { demoPanelClass } from "@/components/demo/demo-look";
import { DEMO_TOURNAMENTS } from "@/lib/demo-products";
import { DEMO_STORE_PATH, getDemoTournament } from "@/lib/demo-shop";
import { formatDate, formatPrice } from "@/lib/format";
import { registrationClosedLabel } from "@/lib/registration-input";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return DEMO_TOURNAMENTS.map((tournament) => ({ slug: tournament.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const tournament = getDemoTournament(slug);
  if (!tournament) return { title: "找不到賽事" };
  return { title: tournament.title };
}

export default async function DemoTournamentPage({ params }: PageProps) {
  const { slug } = await params;
  const tournament = getDemoTournament(slug);
  if (!tournament) notFound();
  const closed = registrationClosedLabel(tournament);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 lg:px-6">
      <Link href={`${DEMO_STORE_PATH}/tournaments`} className="text-sm text-slate-400 hover:text-white">
        ← 返回店賽
      </Link>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">{tournament.title}</h1>
      <p className="mt-3 text-sm leading-6 text-slate-400">{tournament.description}</p>
      <dl className={`${demoPanelClass} mt-6 grid gap-4 p-5 text-sm sm:grid-cols-2`}>
        <div>
          <dt className="text-muted-foreground">時間</dt>
          <dd>{formatDate(tournament.startsAt)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">地點</dt>
          <dd>{tournament.location}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">賽制</dt>
          <dd>{tournament.format}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">報名費</dt>
          <dd>{formatPrice(tournament.entryFee)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">名額</dt>
          <dd>
            {tournament.registeredCount} / {tournament.maxPlayers}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">獎品</dt>
          <dd>{tournament.prizePool}</dd>
        </div>
      </dl>
      {closed ? (
        <p className={`${demoPanelClass} mt-8 p-4 text-sm text-slate-300`}>{closed}</p>
      ) : (
        <DemoRegisterForm slug={tournament.slug} />
      )}
    </div>
  );
}
