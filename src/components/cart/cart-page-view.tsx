"use client";

import Image from "next/image";
import Link from "next/link";
import { homeContainer, homePrimaryButton } from "@/components/home/home-layout";
import { useCart } from "@/providers/cart-provider";

export function CartPageView() {
  const { itemCount, setIsOpen } = useCart();

  return (
    <section className={`${homeContainer} flex flex-col gap-[32px] py-[64px]`}>
      <h1 className="text-[40px] font-medium leading-[1.3] text-[#0a0a09]">購物車 ({itemCount})</h1>
      {itemCount === 0 ? (
        <div className="flex w-full flex-col items-center gap-[32px] rounded-[24px] bg-white p-[64px]">
          <Image src="/brand/home/icon-bag-empty.svg" alt="" width={48} height={48} unoptimized />
          <p className="text-[28px] font-medium leading-[1.4] text-[#0a0a09]">購物車是空的</p>
          <Link
            href="/products"
            className="inline-flex h-[48px] w-[180px] items-center justify-center rounded-[10px] border border-[#c8a24a] bg-[#080808] px-6 text-[14px] font-medium leading-[1.45] text-white transition hover:bg-[#1c1c1c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c8a24a]"
          >
            商品
          </Link>
        </div>
      ) : (
        <div className="flex max-w-[42rem] flex-col items-start gap-6">
          <p className="text-[16px] leading-[1.6] text-[#625f58]">
            購物車內有 {itemCount} 件商品。有商品時的頁面尚未提供，可先開啟現有清單。
          </p>
          <button type="button" className={homePrimaryButton} onClick={() => setIsOpen(true)}>
            開啟清單
          </button>
        </div>
      )}
    </section>
  );
}
