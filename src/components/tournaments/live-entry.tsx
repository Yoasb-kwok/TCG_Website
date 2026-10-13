"use client";

import { useSearchParams } from "next/navigation";
import { LiveBoard } from "@/components/tournaments/live-board";
import { PublicBoard } from "@/components/tournaments/public-board";
import { boardKeyFromSearch } from "@/lib/tournament-board";

export function LiveEntry() {
  const searchParams = useSearchParams();
  const key = boardKeyFromSearch(new URLSearchParams(searchParams.toString()));
  if (key) return <LiveBoard />;
  return <PublicBoard />;
}
