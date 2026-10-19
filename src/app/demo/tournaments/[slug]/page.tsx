import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DemoRegisterForm } from "@/components/demo/demo-register-form";
import { DEMO_TOURNAMENTS } from "@/lib/demo-products";
import { getDemoTournament } from "@/lib/demo-shop";
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
    <div className="mx-auto max-w-3xl px-4 py-8 lg:px-6">
      <Link href="/demo/tournaments" className="text-sm text-muted-foreground hover:text-foreground">
        ← 返回店賽
      </Link>
      <h1 className="mt-4 text-2xl font-bold">{tournament.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{tournament.description}</p>
      <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
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
        <p className="mt-8 rounded-lg border border-border bg-muted/40 p-4 text-sm">{closed}</p>
      ) : (
        <DemoRegisterForm slug={tournament.slug} />
      )}
    </div>
  );
}
