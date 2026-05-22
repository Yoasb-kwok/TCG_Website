import Link from "next/link";
import { InfoPageLayout, InfoSection } from "@/components/info/info-page-layout";
import { SHOW_STORE_ADDRESS, SITE_BRAND, STORE } from "@/lib/constants";

export const metadata = {
  title: "送貨方式",
  description: `${SITE_BRAND} 送貨及自取方式 — 門市自取、順豐速遞及本地郵寄。`,
};

export default function ShippingPage() {
  return (
    <InfoPageLayout
      title="送貨方式"
      subtitle="門市自取、本地速遞及郵寄 — 單卡及封盒均妥善包裝"
    >
      <InfoSection title="門市自取（推薦）">
        <p>
          訂單完成付款並確認庫存後，我們會透過電郵或 WhatsApp 通知你可取貨。請於{" "}
          <strong className="text-foreground">7 個工作天內</strong>前往門市自取。
        </p>
        {SHOW_STORE_ADDRESS ? (
          <>
            <p className="font-medium text-foreground">自取地址</p>
            <p>{STORE.address.zh}</p>
            <p className="text-muted-foreground">{STORE.address.en}</p>
            <p className="text-muted-foreground">{STORE.mtr}</p>
          </>
        ) : (
          <p>
            自取地點將於訂單確認後透過電郵或 WhatsApp 通知。營業時間：{STORE.hours}
          </p>
        )}
        <p>
          <strong className="text-foreground">自取費用：免費</strong>
        </p>
      </InfoSection>

      <InfoSection title="順豐速遞（本地）">
        <p>適用於香港本地地址。單卡及高價值商品會使用硬卡套、泡泡紙及加固外盒包裝。</p>
        <ul className="list-inside list-disc space-y-2 pl-1">
          <li>
            訂單滿 <strong className="text-foreground">HK$500</strong>：免運費
          </li>
          <li>訂單未滿 HK$500：運費 HK$30（到付或預付，以結帳頁顯示為準）</li>
          <li>一般 1–2 個工作天內寄出（公眾假期除外）</li>
        </ul>
      </InfoSection>

      <InfoSection title="本地平郵">
        <p>
          適用於低價值訂單或指定商品。平郵不設追蹤號碼，寄失風險由買家承擔，我們建議高價單卡選用順豐或門市自取。
        </p>
        <p>運費：HK$15 起（視乎重量及數量）</p>
      </InfoSection>

      <InfoSection title="包裝說明">
        <ul className="list-inside list-disc space-y-2 pl-1">
          <li>單卡：卡套 + 硬卡套 + 加固信封或小盒</li>
          <li>封盒 / 補充包：原封包裝外加氣泡袋及外箱</li>
          <li>高價卡牌可要求額外保護，請於下單備註或 WhatsApp 聯絡我們</li>
        </ul>
      </InfoSection>

      <InfoSection title="處理時間">
        <p>
          現貨商品通常於 <strong className="text-foreground">1–2 個工作天</strong>{" "}
          內處理。預訂或缺貨商品會另行通知預計到貨及發貨日期。
        </p>
        <p className="text-muted-foreground">
          惡劣天氣、公眾假期或大型預訂活動期間，處理時間可能延長，敬請見諒。
        </p>
      </InfoSection>

      <InfoSection title="注意事項">
        <ul className="list-inside list-disc space-y-2 pl-1">
          <li>請確保收件地址及聯絡電話正確，因資料錯誤導致延誤或遺失恕不負責</li>
          <li>簽收後請即時檢查包裹，如有損壞請於 24 小時內聯絡我們並提供開箱相片</li>
          <li>目前僅提供香港本地送貨，暫不接受海外訂單</li>
        </ul>
        <p>
          付款詳情請參閱{" "}
          <Link href="/payment" className="text-pink-400 hover:text-pink-300">
            付款方式
          </Link>
          。
        </p>
      </InfoSection>
    </InfoPageLayout>
  );
}
