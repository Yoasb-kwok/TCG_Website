import type { Metadata } from "next";
import Link from "next/link";
import { LegalShell } from "@/components/info/legal-document";
import { getLegalPage, SALE_PAYMENT_CLAUSE } from "@/lib/legal-pages";

const sale = getLegalPage("sale");
const shipping = getLegalPage("shipping");

export const metadata: Metadata = {
  title: "付款方式",
  description: "網店付款以服務及購物條款為準：FPS 轉數快／銀行轉帳，並須於 24 小時內完成付款及上傳憑證。",
};

export default function PaymentPage() {
  return (
    <LegalShell title="付款方式">
      <div className="flex flex-col gap-6 text-[16px] leading-[1.75] text-[#0a0a09]">
        <p>
          網店付款、時限及逾期取消，以
          <Link
            href={`${sale.href}#s-3-2`}
            className="mx-1 font-medium underline decoration-[#dccdaf] underline-offset-4 hover:decoration-[#c8a24a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c8a24a]"
          >
            {sale.title}
          </Link>
          第 3.2 條為準。本頁轉載該條，不再另訂付款或退款細則。
        </p>
        <section
          aria-labelledby="payment-clause-heading"
          className="rounded-[14px] border border-[#e6dfd2] bg-white p-6 shadow-trtcg-card sm:p-8"
        >
          <h2 id="payment-clause-heading" className="text-[20px] font-medium leading-[1.4]">
            3.2 付款方式與時限
          </h2>
          <p className="mt-4">{SALE_PAYMENT_CLAUSE}</p>
        </section>
        <p>
          退換貨及送貨請參閱
          <Link
            href={shipping.href}
            className="mx-1 font-medium underline decoration-[#dccdaf] underline-offset-4 hover:decoration-[#c8a24a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c8a24a]"
          >
            {shipping.title}
          </Link>
          。
        </p>
      </div>
    </LegalShell>
  );
}
