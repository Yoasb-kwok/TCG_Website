import { Suspense } from "react";
import { LiveBoard } from "@/components/tournaments/live-board";

export const metadata = {
  title: "店賽計分板",
};

export default function TournamentLivePage() {
  return (
    <Suspense
      fallback={
        <div className="grid h-dvh place-items-center bg-zinc-950 text-zinc-300">載入計分板…</div>
      }
    >
      <LiveBoard />
    </Suspense>
  );
}
