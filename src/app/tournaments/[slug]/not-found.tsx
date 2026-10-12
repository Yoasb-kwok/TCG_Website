import Link from "next/link";

export default function TournamentNotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 text-center lg:px-6">
      <p className="text-lg text-muted-foreground">賽事不存在</p>
      <Link
        href="/tournaments"
        className="mt-6 inline-flex h-8 items-center justify-center rounded-lg bg-white px-3 text-sm font-medium text-black hover:bg-white/90"
      >
        返回賽事列表
      </Link>
    </div>
  );
}
