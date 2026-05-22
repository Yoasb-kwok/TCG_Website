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
| 商品 API | `/api/products` |
| 購物車（localStorage） | 右上角購物袋 |
| Stripe 結帳 | `/api/checkout` |
| 店賽列表 | `/tournaments` |

### 商品篩選 API 參數

- `page`, `pageSize`
- `minPrice`, `maxPrice`
- `cardSet`, `rarity`, `pokemonType`
- `type` — `SINGLE` | `SEALED_BOX` | `BOOSTER_PACK` | `ACCESSORY`
- `inStock=true`
- `search`, `language`

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
