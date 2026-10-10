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

4. （可選）從 Pokémon TCG API 匯入卡牌：

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

要改號碼，在 `.env` 設定 `WHATSAPP_NUMBER`（8 位香港號碼或含 `852` 的國際號碼）。未設定或留空時沿用網站設定。

## 收銀（POS）

店內收銀在 `/pos`（需 ADMIN）。規格可選填 `barcode`：留空代表未設定，有值時全店唯一。收銀搜尋欄可以手打、用掃碼槍（當鍵盤），或者撳「掃描」用 iPhone／iPad 相機讀 EAN-13、UPC、Code 128。讀到條碼後同掃碼槍一樣做精確配對並加入購物車。名稱搜尋維持原有列表。按「收款」後要再選付款方式並確認金額先入帳。相機要 HTTPS，以及 Safari／Chrome 的相機權限；拒絕權限時仍可手打。來貨同商品條碼欄都有同一個掃描按鈕。

套用條碼欄位：

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
