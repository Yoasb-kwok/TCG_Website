# 卡表目錄：匯入新系列

店內卡表存在 Postgres（`CatalogSet`、`CatalogCard`、`CatalogChangelog`）。上線後的來源是這份資料庫，加上後台 CSV 匯入。TCGdex 和其他第三方 API 都不是來源。

商品 SKU、價格、庫存、條碼仍在 `Product` / `ProductVariant`。卡表沒有庫存，也不會改收銀帳。

## 官方來源

香港／亞洲繁中卡表：

- 卡牌搜尋：<https://asia.pokemon-card.com/hk/card-search/>
- 依系列列出，例如 M6：<https://asia.pokemon-card.com/hk/card-search/list/?expansionCodes=M6>

日本官方卡名、圖片、稀有度：

- <https://www.pokemon-card.com/card-search/>
- M6「ストームエメラルダ」的商品篩選值（`pg`）在 2026-10 是 `955`。新系列要在官方搜尋頁的商品名裡核對，不要寫死。

系列代碼照官方原文保存。`M6` 和 `M6a` 是不同系列。2026-10 在香港官方卡牌搜尋裡：

| 代碼 | 官方商品名 |
|------|------------|
| M6 | 擴充包「綠寶石風暴」 |
| M6a | 擴充包「30th CELEBRATION」 |

如果老闆說的代碼和公開網站不一樣，仍用他提供的 CSV 裡的代碼匯入。匯入程式不認識特定代碼，也不會等某一包的檔案。

## 已附的 M6 樣本

`prisma/catalog/samples/m6.csv` 是從上面兩個官方站整理的「綠寶石風暴」卡表（香港收集編號、繁中名稱、香港卡圖；日文名稱、日本卡圖、稀有度圖示）。發售日用香港官方商品頁的 2026-08-07。

有三張傳說競技場卡，香港官方把左右兩半寫在同一個收集編號，例如 `071/076 , 072/076`。匯入後主編號是前半（`071/076`），另一半放在 `altCollectorNumber`。日本官方只用後半的編號。兩種編號都能用 `/api/cards?number=` 找到。

把樣本寫進資料庫：

```bash
npm run db:migrate
npm run db:seed-catalog
```

`CATALOG_CSV` 可以改指向另一份 CSV。

## CSV 欄位

範本（含 UTF-8 BOM，Excel 可直接開）：後台「卡表目錄」的「下載 CSV 範本」，或 `GET /api/catalog/template`。

| 欄位 | 必填 | 說明 |
|------|------|------|
| setCode | 是 | 官方系列代碼，例如 `M6`、`M6a`。整份檔同一個代碼時，也可以在後台另外填，CSV 不用每列都寫。 |
| setNameZhTw / setNameJa / setNameEn | 否 | 系列名稱。英文可以留空。 |
| releaseDate | 否 | `YYYY-MM-DD` |
| regulationMark | 否 | 賽制字母，例如 `J`。不是系列代碼。 |
| officialUrl | 否 | 官方卡表頁 |
| collectorNumber | 是 | 收集編號，例如 `001/076`。`58/76`、`#058/076` 會正規化成 `058/076`。 |
| altCollectorNumber | 否 | 另一地區的官方編號，只在不同時填。 |
| nameZhTw | 否 | 空白或「待補」會存成 **待補**，並把 `pendingTranslation` 設為 true。 |
| nameJa / nameEn | 否 | 日文、英文卡名。只有一欄「名稱」時，含假名的視為日文，其餘視為繁中。 |
| rarity | 否 | 例如 `C`、`RR`、`AR`、`SR`、`SAR`、`MUR`。香港官方詳細頁沒有文字稀有度，樣本用日本官方圖示。 |
| illustrator | 否 | 繪師 |
| imageUrl / imageUrlJa | 否 | 官方卡圖網址。只存網址，不把圖檔放進 git。 |

缺 `nameZhTw`、`nameJa`、`imageUrl` 或 `rarity` 時，`missingFields` 會列出缺的欄。再次匯入時，空白或「待補」**不會蓋掉**已經有的譯名、圖片或稀有度。CSV 裡沒有的卡**不會刪除**。

Excel：另存「CSV UTF-8」。收集編號欄設成文字再貼，避免 `001/076` 變成日期。程式會去掉檔頭 BOM，也接受 CRLF。

## 後台匯入

1. 用 ADMIN 登入，打開 `/admin/catalog`。
2. 上傳 CSV。若檔案沒有 `setCode` 欄，在「系列代碼」填官方代碼。
3. 匯入後，同一頁的「最近更新」會多一筆 `CatalogChangelog`（時間、系列代碼、新增／更新／待補張數）。

也可以 `POST /api/admin/catalog/import`（要 ADMIN），用 `multipart` 欄位 `file`，或 JSON `{ "csv": "...", "setCode": "M6", "note": "..." }`。

## 新系列（例如老闆給的下一包）

1. 在香港官方卡牌搜尋確認商品代碼（網址的 `expansionCodes=`）。
2. 若要日文名和稀有度，在日本官方卡牌搜尋找到該商品的 `pg` 值。
3. 產生 CSV（只寫檔，不寫資料庫）：

```bash
npm run db:bootstrap-catalog -- --code M6 --jp-pg 955 --release 2026-08-07 --out prisma/catalog/samples/m6.csv
```

`--jp-name ストームエメラルダ` 可以代替 `--jp-pg`。沒有日本站資料時，省略這兩個參數，日文名會是空的，匯入後標成缺 `nameJa`。

4. 把 CSV 交到 `/admin/catalog` 上傳。這一步才是正式入庫。

官方網頁改版時，這支腳本可能要改。後台 CSV 匯入不依賴它。

## 內部 API

不需 API key（多店、限流是之後的範圍）。

- `GET /api/sets` — 系列。可用 `q` 搜代碼或名稱。
- `GET /api/cards` — 卡牌。`set`（或 `setCode`）是**完整代碼**，`M6` 不會帶出 `M6a`。`number`（或 `collectorNumber`）比對卡號。`q`（或 `search`）搜繁中、日文、英文、卡號、稀有度、系列名。`pending=1` 只看待補。`page`、`pageSize`（最大 200）。
- `GET /api/catalog/changelog` — 最近更新。`limit`、`set`。

## 和商品搜尋的關係

`/api/products`、網店搜尋和收銀條碼仍只查 `Product` / `ProductVariant`（名稱、卡號、SKU、條碼、價格、庫存）。不要把這些查詢改去卡表，否則沒上架的卡會出現在可售清單。

上架單卡時，先查卡表再抄名稱：

```
GET /api/cards?set=M6&number=058/076
```

然後在商品名單建立 SKU。卡表不取代條碼和銷售帳。
