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

## 已附的 M6a 樣本

`prisma/catalog/samples/m6a.csv` 是香港官方 **擴充包「30th CELEBRATION」**（`expansionCodes=M6a`）。這不是「綠寶石風暴」。

2026-10 核對過的官方標籤：

| 來源 | 畫面上的名稱 | 寫進 CSV 的欄位 |
|------|----------------|-----------------|
| 香港卡牌搜尋篩選 | 擴充包「30th CELEBRATION」 | `setCode=M6a`，`setNameZhTw=30th CELEBRATION`（括號內，同 M6 的做法） |
| 香港商品列發售日 | `datetime="09-16-2026"` | `releaseDate=2026-09-16`。M6 同一欄是 `08-07-2026`，對應已採用的 2026-08-07，所以這裡是月-日-年 |
| 日本卡牌搜尋商品 | 拡張パック 30th CELEBRATION（`pg=961`） | `setNameJa` 用這個篩選標籤。日本標籤沒有「」，所以不會再砍掉「拡張パック」 |
| 英文 | 官方名稱本身就是 30th CELEBRATION | `setNameEn=30th CELEBRATION` |

日本另有「30th CELEBRATION プレミアムデッキセット」（`pg=959`），那是另一個商品，沒有放進這份 CSV。

2026-10 從香港官方列表抓到 **168** 列：

- 160 張收集編號是 `nnn/103`。官方列表沒有 `119/103`、`128/103`、`129/103`、`131/103`。`152/103` 是「達克萊伊＆克雷色利亞LEGEND」的右半，跟 `151/103` 同一張，放在 `altCollectorNumber`。
- 8 張基本能量的官方編號不是分數，而是 `DAR`、`FIG`、`FIR`、`GRA`、`LIG`、`MET`、`PSY`、`WAT`（惡、鬥、火、草、雷、鋼、超、水）。
- 日本 `pg=961` 對到 132 張。`104/103`–`135/103` 其中 28 張，以及上面 8 張能量，在這個日本商品篩選裡沒有對應列，所以日文名是空的。
- 日本詳細頁多數卡沒有稀有度圖示。這份樣本只有 10 張有圖示的 RR（例如 `047/103` 皮卡丘ex）。其餘稀有度留空，匯入後 `missingFields` 會含 `rarity`，沒有猜。

把樣本寫進資料庫（M6 和 M6a 都會匯入；`template.csv` 會略過）：

```bash
npm run db:migrate
npm run db:seed-catalog
```

`CATALOG_CSV` 可以改指向另一份 CSV，那時只匯入那一檔。

重新產生 M6a（只寫檔，不寫資料庫）：

```bash
npm run db:bootstrap-catalog -- --code M6a --jp-pg 961 --release 2026-09-16 --name-en "30th CELEBRATION" --out prisma/catalog/samples/m6a.csv
```

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

可售清單仍然只來自 `Product` / `ProductVariant`。條碼、SKU、密封盒和配件的搜尋沒有改去卡表，沒上架的卡也不會變成可加入購物車或可入帳的商品。

有搜尋字時，網店 `GET /api/products?search=` 和收銀的貨品搜尋會**另外**讀卡表（同 `GET /api/cards` 的資料表）：

- 回應多一個 `catalog`：`{ cards, total }`。網店和收銀把這些卡顯示在商品旁邊，標成卡表對照。
- 完整卡號（例如 `001/103` 或 `M6a 001/103`）用**完整編號**對卡表（含 `altCollectorNumber`）。`001/103` 不會當成 `011/103`。對到的官方卡名會再找單卡商品，所以只存了卡名、沒有存卡號的單卡仍可以找到。只打 `083` 這種不完整編號時，卡表會列出來，但不會拿那些卡名去擴大商品查詢。
- 卡名如果只對到少數卡（最多 8 張），會用那些收集編號再找單卡。商品如果只存了卡號、名稱不一致，仍可以找到。
- 系列代碼或能量代碼（例如 `M6a`、`GRA`）用完整代碼比對。`M6` 不會帶出 `M6a`，`GRA` 不會因為繪師名字裡有 Graphics 而對到別的卡。
- 系列名或太寬的關鍵字只顯示卡表對照，不會把整包卡名塞進商品查詢。
- 8 位或以上的純數字當條碼，不查卡表。收銀掃碼仍然先對條碼，其次 SKU，其次商品上的卡號。對不到商品時，`GET /api/pos/lookup` 才附上 `catalog`，方便把官方卡名填進手動貨品。手動貨品要自己輸入售價，不會自動以 0 元入帳。

上架單卡時仍可直接查：

```
GET /api/cards?set=M6a&number=001/086
```

然後在商品名單建立 SKU。卡表不取代條碼和銷售帳。
