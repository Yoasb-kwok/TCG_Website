import { Suspense } from "react";
import { auth } from "@/auth";
import { LiveEntry } from "@/components/tournaments/live-entry";

export const metadata = {
  title: "店賽計分板",
};

export default async function TournamentLivePage() {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <Suspense
      fallback={
        <div className="grid h-dvh place-items-center bg-zinc-950 text-zinc-300">載入計分板…</div>
      }
    >
      <LiveEntry isAdmin={isAdmin} />
    </Suspense>
  );
}
