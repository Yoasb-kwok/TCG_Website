# TCG HK — Pokémon TCG 香港網店

香港 Pokémon TCG 專門店網站：單卡買賣、封盒預訂、店賽報名。深色主題、繁體中文、HKD 定價。

## 技術棧

- **Next.js 16** (App Router) + TypeScript
- **Tailwind CSS** + shadcn/ui
- **PostgreSQL** + Prisma ORM
- **Stripe** 結帳（HKD）
- Demo 模式：未設定資料庫時自動使用示範商品資料

## 快速開始

```bash
# 安裝依賴
npm install

# 複製環境變數
cp .env.example .env

# 生成 Prisma Client
npm run db:generate

# 啟動開發伺服器（無資料庫亦可運行 Demo）
npm run dev
```

瀏覽 [http://localhost:3000](http://localhost:3000)

## 資料庫設定

1. 在 [Supabase](https://supabase.com) 或 [Neon](https://neon.tech) 建立 PostgreSQL
2. 將連線字串填入 `.env` 的 `DATABASE_URL`
3. 執行 migration：

```bash
npm run db:migrate
```

4. （可選）把固定示範店賽寫進資料庫。只需要 `DATABASE_URL`。已存在的 slug 不會被覆蓋：

```bash
npm run db:seed-tournaments
```

5. （可選）從 Pokémon TCG API 匯入卡牌：

```bash
npm run db:seed
```

## Stripe 設定

1. 在 [Stripe Dashboard](https://dashboard.stripe.com) 建立帳戶（香港）
2. 填入 `.env`：
   - `STRIPE_SECRET_KEY`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_WEBHOOK_SECRET`（webhook 端點：`/api/webhooks/stripe`）
3. 庫存會在 webhook `checkout.session.completed` 確認後才扣減

## 主要功能

| 功能 | 路徑 |
|------|------|
| 首頁 + Hero 輪播 | `/` |
| 商品列表 + 進階篩選 | `/products` |
| 商品詳情 | `/products/[slug]` |
| 商品 API | `/api/products` |
| 卡表系列 / 卡牌 | `/api/sets`、`/api/cards` |
| 卡表匯入 | `/admin/catalog`（見 `docs/catalog-import.md`） |
| 購物車（localStorage） | 右上角購物袋 |
| Stripe 結帳 | `/api/checkout` |
| 店賽列表 | `/tournaments` |

### 商品篩選 API 參數

- `page`, `pageSize`
- `minPrice`, `maxPrice`
- `cardSet`, `rarity`, `pokemonType`
- `type` — `SINGLE` | `SEALED_BOX` | `BOOSTER_PACK` | `ACCESSORY`
- `inStock=true`
- `search`, `language`（`search` 對名稱、卡號、系列、SKU、條碼做包含比對；有字時一併對照卡表）
- `game` — 目前只支援 `pokemon`。`one-piece`、`lorcana` 會回傳空清單（選單暫不顯示這兩個遊戲）

卡表（系列代碼、卡名、卡圖、稀有度）在 `/api/sets` 與 `/api/cards`，資料來自 Postgres，用後台 CSV 更新。商品搜尋的可售結果仍只回 SKU。`search` 另外附上 `catalog` 卡表對照：完整卡號可以用官方卡名找到單卡，卡名也可以用收集編號找到單卡。8 位以上的純數字當條碼，不會查卡表。匯入方式見 [docs/catalog-import.md](docs/catalog-import.md)。

## WhatsApp

右下角按鈕連到 `https://wa.me/` 加門市號碼。預設使用 `src/lib/constants.ts` 的 `STORE.whatsapp`（`66094893`，即 `https://wa.me/85266094893`）。

要改號碼，在 `.env` 設定 `WHATSAPP_NUMBER`（8 位香港號碼或含 `852` 的國際號碼）。未設定或留空時沿用網站設定。有號碼時，頁尾「社交媒體」和桌面導覽列也會列出同一個 WhatsApp 連結；右下角浮動按鈕維持不變。

## 社交媒體

Instagram、Facebook 的圖示列在頁尾品牌欄（標題「社交媒體」），桌面版導覽列右側，以及手機選單底部。沒有網址的項目不會渲染。

在 `.env` 填入完整網址（也可只寫 `instagram.com/帳號`，會補上 `https://`）：

```
SOCIAL_INSTAGRAM_URL="https://www.instagram.com/your-handle"
SOCIAL_FACEBOOK_URL="https://www.facebook.com/your-page"
```

留空或填了無效網址就隱藏該圖示。預設 `src/lib/social.ts` 的 `href` 是空字串，所以未設定環境變數時店面不會出現壞掉的 Instagram / Facebook 連結。

要再加一個平台（例如 YouTube），在 `SOCIAL_LINK_SLOTS` 加 `{ id, label, accessibleName, href, icon, envVar }`，並在同一個檔案的 `SOCIAL_ENV` 讀取該環境變數。未知的 `icon` 會顯示一般連結圖示。

## 收銀（POS）

店內收銀在 `/pos`（需 ADMIN）。規格可選填 `barcode`：留空代表未設定，有值時全店唯一。收銀搜尋欄可以手打、用掃碼槍（當鍵盤），或者撳「掃描」用 iPhone／iPad 相機讀 EAN-13、UPC、Code 128。讀到條碼後同掃碼槍一樣做精確配對並加入購物車。名稱搜尋維持原有列表。按「收款」後要再選付款方式並確認金額先入帳。相機要 HTTPS，以及 Safari／Chrome 的相機權限；拒絕權限時仍可手打。倉存同商品條碼欄都有同一個掃描按鈕。倉存頁內的「進貨」用來入庫。

收卡在 `/pos/buyback`（同樣需要 ADMIN）。搜尋沿用商品同卡表，卡號可以有空格，例如 `083 / 101`、`M6a 001`。填數量同收取價錢（HKD），客人姓名、電話、Pokémon ID 可留空。今日收卡每一行都會顯示收取價錢。已上架的規格只加庫存，不會改售價。卡表有、店內未上架的卡會新建單卡庫存，售價留空（未定價），網店不會當免費貨賣出。每筆記一筆來源為 `buyback` 的收卡帳，以及一筆進貨開支。今日紀錄用香港時間。

套用條碼同收卡資料表（migration `20261012150000_pos_buyback`）：

```bash
npm run db:migrate
```

未設定資料庫時，示範條碼仍可用，例如補充包 `4891510000010`、Charizard ex `4891511990001`。

## 專案結構

```
src/
  app/              # 頁面與 API routes
  components/       # UI 元件
  lib/              # 業務邏輯、Prisma、Stripe
  providers/        # Cart context
prisma/
  schema.prisma     # TCG 資料模型
  seed.ts           # Pokémon TCG API 匯入
```

## 商家後台

1. 在 `.env` 設定：
   ```
   AUTH_SECRET=openssl rand -base64 32
   ADMIN_EMAIL=admin@trtcg.hk
   ADMIN_PASSWORD=你的密碼
   DATABASE_URL=...
   POKEMON_TCG_API_KEY=   # 可選，英文卡價參考
   ```
2. 執行 `npm run db:migrate` 與 `npm run db:seed-admin`
3. 以 ADMIN 帳戶登入 [http://localhost:3000/admin/login](http://localhost:3000/admin/login)
   （`role: USER` 無法進入 `/admin`，會被 middleware 導走）

| 功能 | 說明 |
|------|------|
| 單卡上架 | TCGdex `zh-tw` 繁中卡圖及譯名優先 → 填價格庫存 |
| 卡盒/週邊 | 選系列 Logo 或手動建立配件 |
| 交易紀錄 | 訂單狀態管理 |
| 店賽報名 | 賽事列表及報名名單 |

## 下一步建議

- [x] Auth.js 商家後台（ADMIN / USER）
- [ ] 前台用戶註冊登入
- [ ] PayMe / FPS 本地付款
- [ ] 店賽線上報名表單
- [ ] 管理後台（庫存、賽事）
