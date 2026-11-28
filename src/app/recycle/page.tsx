import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { homeContainer } from "@/components/home/home-layout";
import { formatPrice } from "@/lib/format";
import { getPublicRecycleListings } from "@/lib/site-content";

export const metadata: Metadata = {
  title: "單卡回收",
  description: "本店現正回收的 Pokémon 單卡、回收價與數量。",
};

export default async function RecyclePage() {
  const listings = await getPublicRecycleListings();

  return (
    <section className={`${homeContainer} flex flex-col gap-8 py-16 text-trtcg-ink`}>
      <div className="flex flex-col gap-3">
        <h1 className="text-[40px] font-medium leading-[1.3]">單卡回收</h1>
        <p className="max-w-[640px] text-[16px] leading-[1.65] text-trtcg-muted">
          以下是本店現正回收的單卡。回收價與數量由店主設定，到店時請以當日公告為準。
        </p>
      </div>

      {listings.length === 0 ? (
        <p className="rounded-[24px] bg-trtcg-surface p-10 text-[16px] text-trtcg-muted shadow-trtcg-card">
          暫未公開單卡回收清單。
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {listings.map((listing) => (
            <li
              key={listing.id}
              className="flex gap-4 rounded-[16px] border border-trtcg-gold/70 bg-white p-5 shadow-trtcg-card"
            >
              <Link
                href={`/products/${listing.slug}`}
                className="relative h-[132px] w-[96px] shrink-0 overflow-hidden rounded-[12px] bg-trtcg-lavender"
              >
                {listing.imageUrl ? (
                  <Image
                    src={listing.imageUrl}
                    alt=""
                    fill
                    unoptimized
                    sizes="96px"
                    className="object-contain p-1"
                  />
                ) : null}
              </Link>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Link href={`/products/${listing.slug}`} className="text-[18px] font-medium leading-[1.4] hover:underline">
                  {listing.name}
                </Link>
                {(listing.setCode || listing.cardNumber) && (
                  <p className="text-[13px] leading-[1.6] text-trtcg-muted">
                    {[listing.setCode, listing.cardNumber].filter(Boolean).join(" · ")}
                  </p>
                )}
                <p className="text-[22px] font-medium leading-[1.2]">{formatPrice(listing.price)}</p>
                <p className="text-[14px] text-trtcg-muted">回收數量 {listing.quantity}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
