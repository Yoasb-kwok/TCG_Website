/** Official storefront policy copy. Contact fields stay as client placeholders. */

export const LEGAL_EMAIL_PLACEHOLDER = "[請填入客服電郵]";
export const LEGAL_PHONE_PLACEHOLDER = "[請填入電話]";
export const STORE_PICKUP_ADDRESS = "九龍灣工業中心7樓28室";

export const SALE_PAYMENT_CLAUSE =
  "本網站支援 FPS 轉數快 / 銀行轉帳。顧客須於落單後 24 小時內完成付款並上傳有效憑證（如適用），逾期未付款之訂單系統將自動取消而不作另行通知。";

export type LegalBlock = {
  type: "paragraph";
  text: string;
};

export type LegalSection = {
  id: string;
  heading: string;
  blocks: LegalBlock[];
};

export type LegalSlug = "privacy" | "terms" | "sale" | "shipping" | "membership";

export type LegalPage = {
  slug: LegalSlug;
  href: `/${LegalSlug}`;
  navLabel: string;
  title: string;
  englishTitle: string;
  description: string;
  sections: LegalSection[];
};

function paragraph(text: string): LegalBlock {
  return { type: "paragraph", text };
}

export const LEGAL_PAGES: readonly LegalPage[] = [
  {
    slug: "privacy",
    href: "/privacy",
    navLabel: "私隱政策",
    title: "私隱政策聲明",
    englishTitle: "PRIVACY POLICY STATEMENT",
    description: "T&R TCG HK 天睿卡遊的個人資料私隱政策，說明收集目的、第三方披露及查閱更正權利。",
    sections: [
      {
        id: "s-1-1",
        heading: "1.1 承諾與法例遵循",
        blocks: [
          paragraph(
            "本公司（T&R TCG HK 天睿卡遊，下稱「本店」）高度重視閣下的個人資料私隱，並嚴格遵守香港特別行政區法例第 486 章《個人資料（私隱）條例》之規定，確保所有收集之個人資料均獲得妥善保安及合法處理。",
          ),
        ],
      },
      {
        id: "s-1-2",
        heading: "1.2 收集資料之目的及類別",
        blocks: [
          paragraph(
            "當閣下於本網站註冊會員、落單購物、參與預購、報名賽事或查詢客服時，本店可能會收集閣下的姓名、聯絡電話、電郵地址、送貨地址及交易紀錄。上述資料僅用於處理訂單、安排物流配送、核實賽事資格、會員積分管理及提供售後服務。",
          ),
        ],
      },
      {
        id: "s-1-3",
        heading: "1.3 資料披露與第三方轉移",
        blocks: [
          paragraph(
            "除為完成訂單配送而必須將收件人資料提供予認可物流服務商（如順豐速運等），或因應香港執法機關及法例要求外，本店絕不會將閣下的個人資料出售、出租或披露予任何無關之第三方作商業推廣用途。",
          ),
        ],
      },
      {
        id: "s-1-4",
        heading: "1.4 查閱及更改資料權利",
        blocks: [
          paragraph(
            `根據《個人資料（私隱）條例》，閣下有權隨時要求查閱、更正或刪除本店所持有關於閣下的個人資料。如有需要，請透過官方電郵 ${LEGAL_EMAIL_PLACEHOLDER} 或官方 WhatsApp ${LEGAL_PHONE_PLACEHOLDER} 與本店聯絡。`,
          ),
        ],
      },
    ],
  },
  {
    slug: "terms",
    href: "/terms",
    navLabel: "網站使用條款",
    title: "網站使用條款及 Cookies 政策",
    englishTitle: "TERMS OF USE & COOKIES POLICY",
    description: "網站使用條款及 Cookies 政策，涵蓋知識產權、系統免責及 Cookies 的使用。",
    sections: [
      {
        id: "s-2-1",
        heading: "2.1 知識產權聲明",
        blocks: [
          paragraph(
            "本網站內所有文字、商標、標誌、版面設計、攝影圖片及系統程式碼均屬本店或其合法授權方所有。未經本店事先書面許可，任何人士不得擅自複製、轉載、修改、爬蟲抓取或作任何商業用途。",
          ),
        ],
      },
      {
        id: "s-2-2",
        heading: "2.2 系統運作與免責聲明",
        blocks: [
          paragraph(
            "本店致力確保網站資訊準確及系統穩定，惟不保證網站內容全無錯漏或完全不受網絡中斷影響。若因系統故障、黑客攻擊或不可抗力因素導致之任何直接或間接損失，本店概不承擔賠償責任。",
          ),
        ],
      },
      {
        id: "s-2-3",
        heading: "2.3 Cookies 技術之使用",
        blocks: [
          paragraph(
            "本網站使用 Cookies 及同類追蹤技術以記錄閣下的購物車狀態、登入階段及瀏覽偏好，並進行匿名流量分析以優化網站體驗。閣下可自行於瀏覽器設定中停用 Cookies，惟部分網站功能（如自動登入或購物車保存）可能會因此受限。",
          ),
        ],
      },
    ],
  },
  {
    slug: "sale",
    href: "/sale",
    navLabel: "服務及購物條款",
    title: "服務及購物條款（含預購商品特別守則）",
    englishTitle: "TERMS & CONDITIONS OF SALE & PRE-ORDER RULES",
    description: "服務及購物條款，包括港幣定價、FPS／銀行轉帳付款時限，以及預購到貨、砍單與尾數取貨規則。",
    sections: [
      {
        id: "s-3-1",
        heading: "3.1 貨幣、定價與訂單確認",
        blocks: [
          paragraph(
            "本網站所有商品價格均以港幣（HKD）計算。本店保留隨時調整商品價格之權利。若因系統故障或人為輸入導致標價出現明顯錯誤，本店有權於發貨前取消相關訂單並全額退還已收款項，無須承擔額外賠償。",
          ),
        ],
      },
      {
        id: "s-3-2",
        heading: "3.2 付款方式與時限",
        blocks: [paragraph(SALE_PAYMENT_CLAUSE)],
      },
      {
        id: "s-3-3",
        heading: "3.3 預購商品（Pre-order）特別條款（極重要）",
        blocks: [
          paragraph(
            "（a）到貨日期：所有預購商品之預計發售及到貨日期僅供參考，實際日期須視乎日本／海外原廠及香港代理商之派貨進度而定。",
          ),
          paragraph(
            "（b）代理砍單（Cut 單）處理：如遇原廠或代理商大幅削減供貨配額（Cut 單），本店將嚴格按照顧客「完成付款之時間先後順序」進行公平分配；未能獲分配之訂單，本店將安排 100% 全額退回已付訂金，顧客不得以此為由追討差價或額外損失。",
          ),
          paragraph(
            "（c）尾數及取貨期限：預購貨品到店後，本店將透過 WhatsApp／電郵通知顧客。顧客須於收到通知起 14 天內繳清尾數並完成取貨／安排寄送。逾期超過 30 天仍未聯絡或未取貨者，將視為自動放棄該訂單，已付訂金不予退還，本店有權自行處置相關貨品。",
          ),
        ],
      },
    ],
  },
  {
    slug: "shipping",
    href: "/shipping",
    navLabel: "退換貨／送貨",
    title: "退換貨、售後免責及送貨政策",
    englishTitle: "RETURN, REFUND & SHIPPING POLICY",
    description: "退換貨、售後免責及送貨政策，包括原盒與單卡條款、開箱影片，以及本地送貨與門市自取。",
    sections: [
      {
        id: "s-4-1",
        heading: "4.1 不設無理由退換",
        blocks: [
          paragraph(
            "根據香港法例，網上購物不設強制冷靜期。除商品存在嚴重出廠結構損壞或本店寄錯款式外，所有商品一經售出或出門，恕不接受任何因個人喜好、後悔或買錯款式為由之退換或退款。",
          ),
        ],
      },
      {
        id: "s-4-2",
        heading: "4.2 卡牌原盒（Booster Box）及單卡（Single Cards）特別條款",
        blocks: [
          paragraph(
            "（a）原盒／補充包：鑑於集換式卡牌具有隨機抽卡性質及為杜絕調包風險，所有原盒（Booster Box）、補充包（Booster Pack）及盲盒類商品，一經拆封或撕毀原廠保護膠膜，絕不接受任何理由退換。",
          ),
          paragraph(
            "（b）單卡品相：本店所有單卡上架前均經專人檢視，並如實標註品相（如 NM / LP 等）。原廠印刷線（Print Lines）、輕微白邊或因氣候濕度引致之閃卡自然微彎均屬正常出廠現象，不列入瑕疵退換範圍。",
          ),
          paragraph(
            "（c）開箱錄影憑證：為保障雙方權益，顧客收到包裹後必須拍攝「完整、無剪接、清晰顯示快遞面單及包裹六面」之開箱影片。如發現寄錯貨或嚴重運送損毀，須於簽收後 24 小時內連同開箱影片聯絡客服跟進，逾期或未能提供完整影片者恕不受理。",
          ),
        ],
      },
      {
        id: "s-4-3",
        heading: "4.3 送貨及門市自取安排",
        blocks: [
          paragraph(
            "（a）本地送貨：現貨訂單將於確認收款後 1–3 個工作天內寄出，預設採用 順豐速運到付 / 滿指定金額包郵。貨品交予物流公司後，運送途中之延誤、遺失或外盒輕微壓損風險由物流承運商按其條款處理。",
          ),
          paragraph(
            `（b）門市自取：顧客可選擇親臨本店「${STORE_PICKUP_ADDRESS}」免費自取，取貨時請出示訂單編號及聯絡電話核對。`,
          ),
        ],
      },
    ],
  },
  {
    slug: "membership",
    href: "/membership",
    navLabel: "會員制度及積分",
    title: "會員制度及積分獎賞條例",
    englishTitle: "MEMBERSHIP TERMS & LOYALTY PROGRAMME RULES",
    description: "會員制度及積分獎賞條例，包括資格、積分累積、每年 12 月 31 日清零，以及賽事缺席處理。",
    sections: [
      {
        id: "s-5-1",
        heading: "5.1 會員資格與帳戶安全",
        blocks: [
          paragraph(
            "任何年滿 16 歲之人士（未滿 16 歲須獲家長或監護人同意）均可免費註冊成為本網站會員。會員註冊時須提供真實有效之聯絡電話及電郵。每位顧客僅限持有一個會員帳戶，會員資格、積分及專屬優惠僅限本人使用，嚴禁轉讓、買賣或借予他人使用。",
          ),
        ],
      },
      {
        id: "s-5-2",
        heading: "5.2 會員等級與積分累積規則",
        blocks: [
          paragraph(
            "（a）會員於本網站或實體門市消費（運費、代購手續費及指定特價品除外），每消費滿 HKD $1 即可獲得指定積分（實際倍率視乎當時會員等級而定）。",
          ),
          paragraph(
            "（b）積分將於訂單完成交易（即確認收貨或門市取貨）後自動存入會員帳戶。若該筆訂單其後發生退款或取消，系統將相應扣回已發放之積分。",
          ),
        ],
      },
      {
        id: "s-5-3",
        heading: "5.3 積分有效期與兌換限制",
        blocks: [
          paragraph(
            "（a）所有累積積分之有效期為「每年 12 月 31 日統一清零」，逾期未使用之積分將自動作廢，恕不補發或順延。",
          ),
          paragraph(
            "（b）積分可於結帳時按指定比例折抵現金或兌換指定禮品／比賽入場券，惟積分不可兌換現金、不可找贖，亦不可用於支付預購訂金（除非另有特別推廣說明）。",
          ),
        ],
      },
      {
        id: "s-5-4",
        heading: "5.4 賽事報名及店內行為守則",
        blocks: [
          paragraph(
            "會員透過網站報名參加本店舉辦之官方或店內卡牌賽事時，須準時到場報到。若無故缺席（No-show）且未於開賽前 12 小時通知取消，本店有權暫停其未來 15 天之網上優先報名資格。會員於線上社群及實體店內須保持禮貌，嚴禁任何私下倒賣、炒作、騷擾其他玩家或違反官方比賽規則之行為。",
          ),
        ],
      },
      {
        id: "s-5-5",
        heading: "5.5 會員資格暫停或終止",
        blocks: [
          paragraph(
            "若發現任何會員以虛假資料註冊、利用系統漏洞刷取積分、惡意棄單（Cut 單/走數）、涉及假卡交易或嚴重違反本條例，本店有權立即凍結或永久取消其會員資格及清空所有累積積分，並保留追究法律責任之權利。本店保留隨時修訂會員制度及最終決定權。",
          ),
        ],
      },
    ],
  },
];

export function getLegalPage(slug: LegalSlug): LegalPage {
  const page = LEGAL_PAGES.find((item) => item.slug === slug);
  if (!page) throw new Error(`Missing legal page: ${slug}`);
  return page;
}

export function legalPlainText(pages: readonly LegalPage[] = LEGAL_PAGES): string {
  return pages
    .flatMap((item) => [
      item.title,
      item.englishTitle,
      ...item.sections.flatMap((section) => [section.heading, ...section.blocks.map((block) => block.text)]),
    ])
    .join("\n");
}
