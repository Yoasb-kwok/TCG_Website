import { Clock, ShoppingBag, Trophy } from "lucide-react";
import { InfoPageLayout, InfoSection } from "@/components/info/info-page-layout";
import { SHOW_STORE_ADDRESS, SITE_BRAND, STORE } from "@/lib/constants";

export const metadata = {
  title: "關於我們",
  description: `${SITE_BRAND} — 香港 Pokémon TCG 專門店，單卡買賣、封盒現貨、店賽舉辦。`,
};

export default function AboutPage() {
  return (
    <InfoPageLayout
      title="關於我們"
      subtitle={`${SITE_BRAND} — 香港 Pokémon TCG 專門店`}
    >
      <InfoSection title="我們是誰">
        <p>
          <strong className="text-foreground">{SITE_BRAND}</strong>{" "}
          專注 Pokémon TCG 的卡牌平台。我們提供單卡買賣、最新系列封盒及補充包現貨，並定期舉辦店內標準賽及新手友善賽，歡迎各位訓練家交流、組牌與對戰。
        </p>
        <p>
          無論你是收藏玩家、競技牌手，還是剛入門的新手，我們都樂意為你解答卡牌、品相及賽制相關問題。
        </p>
      </InfoSection>

      <InfoSection title="我們提供">
        <ul className="space-y-3">
          {[
            {
              icon: ShoppingBag,
              text: "Pokémon TCG 單卡、封盒、補充包及周邊配件",
            },
            {
              icon: Trophy,
              text: "每週店賽 — 標準賽制、瑞士輪及淘汰賽",
            },
            {
              icon: Clock,
              text: "門市自取（詳情請下單後與我們確認）",
            },
          ].map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-3">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-pink-400" />
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </InfoSection>

      {SHOW_STORE_ADDRESS && (
        <InfoSection title="門市資訊">
          <p className="font-medium text-foreground">{STORE.address.zh}</p>
          <p className="mt-1 text-muted-foreground">{STORE.address.en}</p>
          <p className="mt-2">{STORE.mtr}</p>
          <p className="mt-2">營業時間：{STORE.hours}</p>
        </InfoSection>
      )}

      <InfoSection title="聯絡我們">
        <p>
          如有商品查詢、預留或賽事報名問題，歡迎透過網站右下角 WhatsApp 按鈕與我們聯絡。
        </p>
        <p className="text-muted-foreground">
          線上訂單一般於 1–2 個工作天內處理；門市自取請待收到「可取貨」通知後前往。
        </p>
      </InfoSection>
    </InfoPageLayout>
  );
}
