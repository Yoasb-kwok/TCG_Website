import Link from "next/link";
import { InfoPageLayout, InfoSection } from "@/components/info/info-page-layout";
import { SITE_BRAND } from "@/lib/constants";

export const metadata = {
  title: "付款方式",
  description: `${SITE_BRAND} 付款方式 — Stripe 信用卡、Apple Pay、FPS 轉數快及門市付款。`,
};

export default function PaymentPage() {
  return (
    <InfoPageLayout
      title="付款方式"
      subtitle="安全便捷的香港本地付款選項，所有線上交易以 HKD 結算"
    >
      <InfoSection title="網店線上付款">
        <p>透過本網站購物車結帳，支援以下方式（由 Stripe 安全處理）：</p>
        <ul className="list-inside list-disc space-y-2 pl-1">
          <li>
            <strong className="text-foreground">信用卡 / 扣賬卡</strong> — Visa、Mastercard、American Express
          </li>
          <li>
            <strong className="text-foreground">Apple Pay / Google Pay</strong> — 於支援的裝置上快速付款
          </li>
        </ul>
        <p className="text-muted-foreground">
          付款成功後，系統會自動確認訂單；庫存於付款完成後扣減。你會收到 Stripe 發出的付款確認電郵。
        </p>
      </InfoSection>

      <InfoSection title="FPS 轉數快">
        <p>
          如選擇 FPS 付款，請於結帳備註或 WhatsApp 索取付款 QR Code，並於{" "}
          <strong className="text-foreground">24 小時內</strong>完成轉帳。
        </p>
        <ul className="list-inside list-disc space-y-2 pl-1">
          <li>請在轉帳備註填寫訂單編號或登記電郵</li>
          <li>我們確認入帳後方會安排出貨或通知自取</li>
          <li>逾時未付款的訂單將自動取消並釋放庫存</li>
        </ul>
        <p className="text-muted-foreground">FPS 付款 QR Code 將於正式上線後提供。</p>
      </InfoSection>

      <InfoSection title="PayMe / 八達通">
        <p>
          門市購物及店賽報名費接受 <strong className="text-foreground">PayMe</strong> 及{" "}
          <strong className="text-foreground">八達通</strong>。網店結帳暫不支援，如有需要請 WhatsApp 查詢人工處理。
        </p>
      </InfoSection>

      <InfoSection title="門市付款">
        <p>親臨門市可選擇：</p>
        <ul className="list-inside list-disc space-y-2 pl-1">
          <li>現金（港幣）</li>
          <li>PayMe</li>
          <li>八達通</li>
          <li>信用卡（視乎當日 POS 安排）</li>
        </ul>
        <p>門市保留商品請先透過 WhatsApp 或電話確認庫存及預留。</p>
      </InfoSection>

      <InfoSection title="貨幣及發票">
        <p>
          本店所有價格以 <strong className="text-foreground">港幣（HKD）</strong> 顯示及結算。
        </p>
        <p>如需收據，請於下單時備註，或向門市職員索取。</p>
      </InfoSection>

      <InfoSection title="退款政策">
        <p>
          卡牌及盲抽商品屬收藏及遊戲用品，<strong className="text-foreground">開封後恕不退換</strong>。未開封封盒如有明顯運送損壞，請於收貨 24 小時內聯絡我們。
        </p>
        <p>
          單卡品相以商品頁標示為準（如 NM、LP）。如有爭議，請提供清晰相片，我們將按店內政策處理。
        </p>
        <p>
          送貨詳情請參閱{" "}
          <Link href="/shipping" className="text-pink-400 hover:text-pink-300">
            送貨方式
          </Link>
          。
        </p>
      </InfoSection>
    </InfoPageLayout>
  );
}
