# 🍱 剩食地圖 Leftover Map

> **減少食物浪費的雙模式平台 — 超商剩食預約 × 宿舍剩食分享**

**課程｜TAICA — 生成式 AI 的人文導論（期末專題）**

🔗 線上版：<https://leftovermap-nycu.pages.dev> ・ 🖥️ 專案簡報：<https://leftovermap-nycu.pages.dev/slides>

剩食地圖是一個跑在 **Cloudflare 邊緣、全 serverless** 的校園剩食媒合平台，把「有多餘食物的人」連上「想拿的人」。它有**兩種模式**（超商即期品預約、宿舍同學分享），介面支援**十種語言**，並整合**五種 AI**：以向量語意檢索的 RAG 對話助手、會幫你預約的 tool-calling agent、拍照辨識、即時翻譯，以及一個**我們自己訓練**的供給預測模型。涵蓋交大（NYCU）與清大（NTHU）共 34 棟宿舍。

> ℹ️ **關於安全性**：本專案為課程示範，採無帳號設計。所有資料庫查詢皆參數化（無 SQL injection）、前端由 React 自動轉義（無 XSS）、公開 API 回應會主動移除聯絡方式欄位（隱私保護）。因無登入機制，目前未做 per-IP rate limiting；正式上線前建議補上速率限制與身分驗證。詳見「限制與未來」。

**🌐 Language: English (below) ｜ [中文](#-目錄)**

---

## 🌐 English

**Leftover Map** is a campus food-sharing web app that connects people who have surplus food with people who want it — built as the final project for **TAICA — Introduction to the Humanities of Generative AI（生成式 AI 的人文導論）**.

It puts **two modes on one map**: **convenience-store surplus** (discounted near-expiry items from 7-ELEVEN & FamilyMart) and **dorm sharing** (students sharing leftover food across 34 dorms at NYCU & NTHU). The interface is available in **10 languages**, and the whole thing runs **fully serverless on Cloudflare**.

🔗 **Live app:** <https://leftovermap-nycu.pages.dev> ・ 🖥️ **Slides:** <https://leftovermap-nycu.pages.dev/slides>

### Five AI features
- **Conversational RAG assistant + tool-calling agent** — ask in natural language ("where's bread right now?"); it does semantic retrieval over the real items (embeddings + cosine similarity) and answers grounded on them — and can even **reserve an item for you**.
- **Photo recognition** — snap a photo of food and a vision-language model auto-fills the title & category.
- **Real-time translation** — translate user-posted item text into the viewer's own language.
- **Self-trained supply-forecast model** — a logistic-regression model we trained ourselves (test ROC-AUC ≈ 0.85) estimates how likely a store currently has near-expiry stock, running entirely client-side.

### Tech stack
- **Frontend:** React + TypeScript + Vite, Tailwind CSS, React-Leaflet (interactive clustered map), custom 10-language i18n.
- **Backend:** Cloudflare Pages Functions (TypeScript) + D1 (edge SQLite), all parameterized SQL.
- **AI:** Cloudflare Workers AI — `bge-m3` (embeddings), `Llama 3.1 8B` / `Llama 3.3 70B` (chat & tools), `Llama 3.2 11B Vision` (photos) — plus a self-trained scikit-learn model.

### Getting started
```bash
npm install
npm run dev                       # local dev (Vite + Pages Functions)
npm run build                     # type-check (tsc) + production build (vite)
npx wrangler pages deploy dist    # deploy to Cloudflare Pages
python3 ml/train_forecast.py      # (re)train the supply-forecast model
```

### Security
No user accounts (course demo). DB queries are parameterized (no SQL injection), the React frontend auto-escapes user content (no XSS), and the public API strips contact fields (privacy by data shape). Per-IP rate limiting is **not** implemented — see *限制與未來* below before any production use.

---

完整中文說明見下方 ↓

---

## 📖 目錄

- [這是什麼](#這是什麼)
- [為什麼做這個](#為什麼做這個)
- [核心設計：兩種模式](#核心設計兩種模式)
- [功能總覽](#功能總覽)
- [使用方法](#使用方法)
- [多語言支援](#多語言支援)
- [隱私與資料安全](#隱私與資料安全)
- [技術架構](#技術架構)
- [API 端點](#api-端點)
- [專案目錄結構](#專案目錄結構)
- [資料模型](#資料模型)
- [Demo 資料](#demo-資料)
- [限制與未來規劃](#限制與未來規劃)

---

## 這是什麼

**剩食地圖**是一個架在 Cloudflare Pages 上的單頁應用，提供兩種模式幫助使用者減少食物浪費：

1. **🏪 超商剩食預約**：在地圖上瀏覽全台 7-ELEVEN 與全家便利商店，點選任一店家後可以看到「今日剩食」清單（即將到期的飯糰、便當、麵包等折扣商品），可直接預約並到店自取。
2. **🏠 宿舍剩食分享**：聚焦在 **陽明交大光復校區** 與 **清華大學校本部** 共 34 棟宿舍。任何學生可以將自己吃不完、買多了、室友送的食物上架，讓同棟或同校的其他人來領走。

兩種模式互補：超商模式處理「商家的剩食」，宿舍模式處理「個人的剩食」。

---

## 為什麼做這個

每年台灣丟掉的食物超過 **400 萬噸**，其中很大一部分發生在：
- **超商通路**：食品到期前 8 小時左右會打折，但消費者通常不知道哪間店剩什麼。
- **學生宿舍**：學生買多了、吃不完、要回家了、室友拿錯了…食物常常被丟掉。

這個專案把兩種「不同尺度的剩食」整合到同一張地圖上：
- 走在路上時 → 開超商模式，看附近哪家店有打折好物。
- 在宿舍時 → 開宿舍模式，看同學有沒有要送出的食物。

---

## 核心設計：兩種模式

| 特性 | 🏪 超商模式 | 🏠 宿舍模式 |
|---|---|---|
| **資料來源** | Mock data（示範用） | 真實 Cloudflare D1 資料庫 |
| **誰提供** | 商家系統（demo 為產生器） | 學生自己上架 |
| **誰可以拿** | 任何使用者預約 → 到店付款 | 同校學生 → 聯繫上架者自取 |
| **互動方式** | 預約按鈕（前端 state） | 領取 → 顯示聯絡方式 |
| **覆蓋範圍** | 全台 7-ELEVEN + FamilyMart | NYCU 12 棟 + NTHU 22 棟宿舍 |
| **資料保留** | 重整頁面就消失 | 永久存在 D1 |

> ℹ️ 超商模式之所以是 mock data，是因為實際整合需要與「[i 珍食](https://www.icherishfood.com.tw/)」/「[7-11 友善食光](https://www.7-11.com.tw/event/2020/savefood/index.html)」官方 API 對接，那不是這個 demo 的範圍。介面與資料結構都模擬真實 API 設計，未來只要換掉資料來源即可。

---

## 功能總覽

### 🗺️ 地圖功能
- 互動式 Leaflet 地圖，可拖曳、縮放
- **超商模式**：標記叢集（marker clustering）— 縮放層級低時聚合，放大後展開為個別店家
- **宿舍模式**：宿舍以校徽色彩標記（🔷 NYCU 藍 / 🔶 NTHU 橘），按校區篩選
- **定位按鈕**：點右下角藍色按鈕，瀏覽器會跳出權限請求後跳到你的位置
- **地圖控制元件**：所有覆蓋在地圖上的面板（語言、篩選器、定位）都做了事件隔離，點面板不會誤觸地圖

### 🏪 超商模式功能
- 顯示 7-ELEVEN（綠色）與 FamilyMart（藍色）標記
- 點選任一店家 → 右側滑出店家詳情面板：
  - 店名 / 地址 / 電話
  - 「今日剩食」清單（4–7 項，每次點都隨機產生新的，模擬即時資料）
  - 每項剩食顯示：品名、原價、折扣價、剩餘份數、過期倒數
  - 「預約自取」按鈕 → 點下後變成「✓ 已預約」狀態
- 圖例（右下角）：顯示兩家連鎖品牌的標記顏色

### 🏠 宿舍模式功能
- 顯示 34 棟宿舍（12 NYCU + 22 NTHU），座標精度 ~10–50 公尺
- **校區篩選器**（左下角）：可單獨看交大、清大、或兩校
- **每棟宿舍**：點選 → 右側滑出宿舍面板：
  - 上架物品列表（含圖片、分類標籤、過期倒數）
  - 「+ 上架物品」按鈕
  - 「已被領走」歷史記錄（折疊展開）
- **上架功能**：彈出對話框填寫：
  - 品名（必填，最長 80 字）
  - 8 種分類（便當 / 零食 / 飲料 / 麵包 / 水果 / 生鮮 / 冷凍 / 其他）
  - 說明（選填，最長 500 字）
  - 照片（選填，瀏覽器端壓縮到 ≤300KB 後存成 base64）
  - 領取期限（2 小時 ～ 3 天）
  - 聯絡方式（必填，最長 100 字）— LINE/IG/Email 都可
- **領取功能**：彈出對話框填寫：
  - 領取者名字 / 暱稱（必填）
  - 領取者聯絡方式（選填，**只與上架者分享，不公開**）
  - 確認後顯示上架者的聯絡方式
- **領取歷史**：已被領走的物品顯示「👤 已被 XXX 領走」（含領取者名字，但不含其聯絡方式）

### 🌍 通用功能
- **10 種語言**切換（見下）
- **語言記憶**：選過的語言會存在 localStorage，下次再來自動套用
- **瀏覽器語言偵測**：第一次來訪時根據 `navigator.language` 自動選定
- **響應式**：手機 / 平板 / 桌面都能用，面板在小螢幕全寬展開
- **無需登入 / 註冊**：純展示用，任何人可上架/領取（demo 性質）

---

## 使用方法

### 第一次進入網站

1. 打開 <https://leftovermap-nycu.pages.dev>
2. 預設停在 **超商模式**（`/cvs` 路徑）
3. 系統會自動偵測你的瀏覽器語言：
   - 中文系統 → 中文介面
   - English 系統 → 英文介面
   - 其他 8 種語言依此類推
4. 第一次允許定位（可拒絕）

### 切換模式

頂端兩顆按鈕：
- **🏪 超商剩食** → 切到 `/cvs`
- **🏠 宿舍分享** → 切到 `/dorm`

切換時地圖會重新初始化，避免兩種模式的標記混在一起。

### 切換語言

頂端右側下拉選單，10 種語言任選：

| 顯示 | 代碼 |
|---|---|
| 🇹🇼 中文 | `zh` |
| 🇺🇸 English | `en` |
| 🇯🇵 日本語 | `ja` |
| 🇰🇷 한국어 | `ko` |
| 🇮🇳 हिन्दी | `hi` |
| 🇻🇳 Tiếng Việt | `vi` |
| 🇹🇭 ไทย | `th` |
| 🇩🇪 Deutsch | `de` |
| 🇪🇸 Español | `es` |
| 🇫🇷 Français | `fr` |

切換是**即時**的 — 包含已經打開的詳情面板裡所有文字、模擬剩食的品名等都會跟著變。

### 🏪 超商模式：尋找附近剩食

1. 切到 **超商剩食** 模式
2. 用滑鼠拖曳地圖到你想找的區域
3. **看到紫色數字圈** → 那是叢集，點下去會自動放大
4. **看到綠色 / 藍色標記** → 那是個別店家
   - 🟢 綠色 = 7-ELEVEN
   - 🔵 藍色 = FamilyMart
5. **點任一店家** → 右側滑出面板
6. 面板顯示「今日剩食」清單，每項都有：
   - 品名（依當前語言顯示）
   - 原價 NT$XX → 折扣價 NT$YY（紅色）
   - 「省 NT$ Z」徽章
   - 剩 N 份
   - 過期倒數（X 小時 Y 分後過期）
7. 點 **「預約自取」** → 變成「✓ 已預約」
8. 想關閉面板：點右上角的 × 或地圖空白處

> 💡 預約只是前端 state，重整頁面就消失（demo 模擬用）。

### 🏠 宿舍模式：看別人上架的

1. 切到 **宿舍分享** 模式
2. 地圖會自動顯示新竹（涵蓋 NYCU + NTHU 兩校）
3. **左下角校區篩選**：選「全部」「只看 NYCU」「只看 NTHU」
4. **點任一宿舍**（藍色 = NYCU，橘色 = NTHU）→ 右側滑出面板
5. 面板顯示：
   - 宿舍名稱、所屬學校、座標
   - 目前 X 項可領 · Y 項已被領走
   - **可領清單**：每項有縮圖、分類標籤、品名、說明、過期倒數
   - 「+ 上架物品」按鈕
   - **已被領走** 折疊區（預設展開，顯示誰領走了什麼）

### 🏠 宿舍模式：上架自己的剩食

1. 點 **「+ 上架物品」** → 跳出表單
2. 填寫：
   - **品名 \*** 例：「未開封的吐司」「半盒水餃」「兩瓶可樂」
   - **分類** 從 8 個 emoji 標籤中選一個
   - **說明** 例：「6/3 到期，室友買多了，可以分一半」
   - **照片** 點上傳按鈕 → 選手機相簿照片 → 自動壓縮（最長邊 800px，JPEG 品質遞減直到 ≤300KB）
   - **領取期限** 下拉選單：2 小時 / 6 小時 / 12 小時 / 1 天 / 2 天 / 3 天內要被領完
   - **聯絡方式 \*** LINE ID / IG / Email — 領取者最後會看到
3. 點 **「上架」** → 表單關閉、清單立刻更新
4. 你的物品會出現在該宿舍的可領清單中，地圖標記上的數字也會 +1

> 💡 照片壓縮在瀏覽器內完成，不會把原始大檔上傳。iOS Safari < 15 也支援（自動降級到 `HTMLImageElement` 路徑）。

### 🏠 宿舍模式：領取別人的剩食

1. 在可領清單中找到想要的東西
2. 點 **「我要拿這個」** → 彈出 **領取確認對話框**
3. 填寫：
   - **你的名字 / 暱稱 \*** 例：「陳同學 / 工三 412」「Sarah Wang」
   - **你的聯絡方式（選填）** LINE / IG，**只與上架者分享，不會公開顯示**
4. 點 **「確認領取」**
5. 對話框關閉，原本的「我要拿這個」按鈕區變成綠底框，顯示上架者的聯絡方式
6. 你就可以用 LINE / IG 聯繫上架者，約時間自取

> 🔒 **隱私機制**：你填的聯絡方式儲存在 D1 但**不會出現在任何人的瀏覽器**，包含 API response 也已剝離此欄位。

### 觀察「已被領走」歷史

每棟宿舍面板底部展開「已被領走」區，可以看到：
- 商品的縮圖（半透明）
- 品名（劃線）
- **👤 已被 XXX 領走**（XXX 是領取者填的名字）
- ⚠️ 不會顯示領取者的聯絡方式

這讓上架者**有了正向回饋**（看到自己的食物被誰拿走了），同時保護領取者的隱私。

### 定位按鈕

地圖右下角的 🎯 藍色按鈕：
1. 點下去 → 瀏覽器跳出定位權限請求
2. 允許後地圖會跳到你的位置，加上一個藍色標記
3. 再點一次按鈕會更新位置（不會留下舊標記）

---

## 多語言支援

支援 **10 種語言**，覆蓋全 UI 文字（包含模擬資料的品名）：

| 國旗 | 語言 | 代碼 | 適用對象 |
|---|---|---|---|
| 🇹🇼 | 中文 | `zh-TW` | 在地學生 |
| 🇺🇸 | English | `en` | 國際學生、外籍教授 |
| 🇯🇵 | 日本語 | `ja` | 日籍交換生 |
| 🇰🇷 | 한국어 | `ko` | 韓籍交換生 |
| 🇮🇳 | हिन्दी | `hi` | 印度籍留學生 |
| 🇻🇳 | Tiếng Việt | `vi` | 越南籍留學生 |
| 🇹🇭 | ไทย | `th` | 泰國籍留學生 |
| 🇩🇪 | Deutsch | `de` | 德國交換生 |
| 🇪🇸 | Español | `es` | 西語系國家學生 |
| 🇫🇷 | Français | `fr` | 法語系國家學生 |

### i18n 實作細節

- 字典存在 `src/i18n.ts`，每種語言一個 dict（key-value）
- React Context 透過 `useI18n()` hook 提供 `t(key, params?)` 函式
- 支援參數插值：`t('dorm.summary', { available: 5, claimed: 2 })` → `5 available · 2 taken`
- 使用者選擇會存在 `localStorage`（Safari 私密模式會自動 fallback）
- HTML `<html lang>` 屬性會隨語言更新（利於螢幕閱讀器）

---

## 隱私與資料安全

### 收集了什麼

| 資料 | 場景 | 儲存位置 | 是否公開 |
|---|---|---|---|
| **上架者品名 / 說明** | 上架表單 | D1 | ✅ 公開 |
| **上架者聯絡方式** | 上架表單 | D1 | ⚠️ 領取者點按鈕後可見 |
| **上架者照片** | 上架表單 | D1（base64） | ✅ 公開 |
| **領取者名字** | 領取對話框 | D1 | ✅ 公開（在歷史顯示） |
| **領取者聯絡方式** | 領取對話框 | D1 | 🔒 **永遠不在前端顯示，API 已剝離** |
| **使用者位置** | 定位按鈕 | 僅前端 state | ❌ 不上傳 |
| **使用者 IP / cookie** | 未追蹤 | — | — |
| **語言偏好** | 自動 | `localStorage` | — |

### 隱私防線

1. **領取者聯絡方式**：
   - DB 儲存欄位 `claimer_contact`
   - **但 `GET /api/items` 在 response 中主動剝離此欄位**（`functions/api/items.ts` 中明確 strip）
   - 即便有人 curl API 也拿不到
   - 前端 UI 也完全不顯示

2. **上架者聯絡方式**：
   - DB 與 API response 都有此欄位
   - UI 只在 **使用者主動點「我要拿這個」並完成領取後** 才顯示
   - 設計權衡：在沒有 auth 的 demo 中，這是最低門檻的保護

3. **無註冊 / 無 cookie / 無追蹤**：
   - 沒有使用者帳號系統，沒有 cookie，沒有 analytics
   - localStorage 只存語言偏好

### API 層的保護

- **POST 端點輸入驗證**：
  - `dorm_id` 必須在 34 個白名單中
  - `category` 必須在 8 個白名單中
  - `image_data_url` 必須符合 base64 正規表達式
  - 圖片 ≤ 300KB
  - `expires_at` 必須是未來時間，且 ≤ 30 天
  - 字串長度限制（品名 ≤80、聯絡方式 ≤100、說明 ≤500）
  - 名字 ≤ 30 字
- **錯誤處理**：所有 D1 例外都包在 `try/catch` 中回傳 JSON `{error: ...}`，不會洩漏 stack trace
- **原子操作**：claim 使用 `UPDATE ... WHERE claimed=0 RETURNING *` 防止 race condition
- **catchall 路由**：未匹配的 `/api/*` 不會 fallback 到 `index.html`，會回傳 JSON 404

---

## 技術架構

```
┌──────────────────────────────────────────────────┐
│             Browser (React 18 SPA)                │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  │
│  │ react-     │  │ Tailwind   │  │ i18n       │  │
│  │ leaflet    │  │ CSS        │  │ Context    │  │
│  └────────────┘  └────────────┘  └────────────┘  │
└──────────────────────────────────────────────────┘
              │                          ▲
              │ fetch /api/items         │ JSON
              ▼                          │
┌──────────────────────────────────────────────────┐
│        Cloudflare Pages Functions (Edge)         │
│  ┌──────────────┐  ┌──────────────────────────┐ │
│  │ GET /items   │  │ POST /items/:id/claim    │ │
│  │ POST /items  │  │ catchall (404 JSON)      │ │
│  └──────────────┘  └──────────────────────────┘ │
└──────────────────────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────────────┐
│         Cloudflare D1 (SQLite at edge)           │
│           — table: items                         │
└──────────────────────────────────────────────────┘
```

### 前端 Stack

- **React 18.3** + **TypeScript 5.6** — 元件化 SPA
- **Vite 5.4** — 開發 server / production build
- **Tailwind CSS 3.4** — utility-first 樣式（無 CSS-in-JS overhead）
- **React Router 6** — `/cvs` 與 `/dorm` 路由切換
- **react-leaflet 4** — Leaflet 的 React 包裝
- **leaflet.markercluster** — 標記叢集（用 imperative API，不用 react-leaflet-cluster v2 因為其 children pattern 在 React 18 下會吃掉 marker click 事件）

### 後端 Stack

- **Cloudflare Pages** — 靜態檔托管 + Pages Functions
- **Pages Functions** — TypeScript edge functions（類 Worker）
- **Cloudflare D1** — SQLite 在 edge 上，全球低延遲
- **Wrangler 3.114** — 部署工具（CLI）

### 為什麼選 Cloudflare

- **完全免費**（Pages + D1 + Functions 在小流量下）
- **edge 部署** — 全球 CDN
- **無 cold start**（V8 isolates）
- **D1 距離 user 通常 <50ms**

### 部署流程

```bash
# 開發
npm run dev          # → http://localhost:5173

# Build
npm run build        # tsc -b && vite build → dist/

# Deploy
npm run deploy       # wrangler pages deploy dist
```

`wrangler.toml` 已綁定 D1 database `eng-p-db`（ID `31a544f2-1e0f-4a70-9ae2-38f362a0ac66`）。

---

## API 端點

所有端點都在 `/api/*` 路徑下，response 都是 JSON。

### `GET /api/items`

取得宿舍剩食列表。

**Query parameters:**
| 參數 | 必填 | 說明 |
|---|---|---|
| `dorm` | 否 | 篩選某棟宿舍（例：`nycu-7`） |
| `category` | 否 | 篩選分類（例：`meal`） |
| `all` | 否 | `1` = 包含過期與已領走、預設不含 |

**Response:** `{items: LeftoverItem[]}`

```json
{
  "items": [
    {
      "id": 33,
      "dorm_id": "nycu-7",
      "title": "全聯吐司 1 條",
      "description": "未開封，買多了一條",
      "category": "bread",
      "image_data_url": "data:image/jpeg;base64,...",
      "expires_at": "2026-06-04T12:00:00.000Z",
      "contact": "LINE: demo-tsai",
      "claimed": 1,
      "claimer_name": "陳同學 / 工三 412",
      "claimed_at": "2026-06-03T18:42:11Z",
      "created_at": "2026-06-03 12:00:00"
    }
  ]
}
```

> ⚠️ `claimer_contact` 欄位**永不出現在這個 endpoint 的 response 中**（即使有值也會被剝離）。

### `POST /api/items`

上架一筆剩食。

**Body:**
```json
{
  "dorm_id": "nycu-7",
  "title": "未開封的吐司",
  "description": "可選",
  "category": "bread",
  "image_data_url": "data:image/jpeg;base64,... (≤300KB)",
  "expires_at": "2026-06-05T10:00:00Z",
  "contact": "LINE: my-id"
}
```

**Response:** 201 + 新建的 `LeftoverItem`

**錯誤碼:**
- `400` 缺欄位 / 格式錯 / 圖片太大 / dorm_id 不在白名單
- `500` DB 錯誤

### `POST /api/items/:id/claim`

領取一筆剩食。原子操作 — 若已被領走會回 404。

**Body:**
```json
{
  "claimer_name": "陳同學",
  "claimer_contact": "LINE: chen_g3"
}
```

**Response:** 已更新的 `LeftoverItem`（包含上架者 `contact`，給領取者看）

**錯誤碼:**
- `400` 缺 claimer_name / 長度超限
- `404` 找不到該 ID 或已被領走

### `/api/*` catchall

未匹配的 API 路徑回傳 `{error: "not found"}` 404，不會 fallback 到 SPA HTML。

---

## 專案目錄結構

```
eng_p/
├── README.md                       本文件（含「附錄：AI 用在哪裡」）
├── wrangler.toml                   CF Pages + D1 + Workers AI binding
├── package.json / package-lock.json
├── index.html                      Vite 進入 HTML
├── vite.config.ts                  Vite + Tailwind/PostCSS（已內聯）
├── tsconfig*.json                  TypeScript 設定
├── .gitignore
│
├── db/
│   └── schema.sql                  D1 items 表定義
│
├── docs/
│   ├── SPEECH.md                   英文講稿（~3 分）
│   └── SPEECH_zh.md                中文講稿（~8–10 分，含舞台提示）
│
├── ml/
│   └── train_forecast.py           供給預測模型訓練（logistic regression）
│
├── public/
│   ├── _redirects                  SPA fallback + /api/* 路由
│   └── favicon.svg
│
├── functions/                      Cloudflare Pages Functions（後端）
│   └── api/
│       ├── items.ts                GET/POST /api/items
│       ├── items/[id]/claim.ts     POST 領取
│       ├── [[catchall]].ts         404 for unmatched /api/*
│       └── ai/
│           ├── agent.ts            RAG 檢索 + tool-calling 對話 agent
│           ├── vision.ts           拍照辨識
│           └── translate.ts        貼文翻譯
│
└── src/
    ├── main.tsx / App.tsx          進入點 + Router
    ├── types.ts
    ├── i18n.ts                     10 語字典
    ├── i18n.ai.ts                  AI 功能字串（併入 i18n）
    ├── index.css
    ├── data/
    │   ├── dorms.ts                34 棟宿舍座標 (NYCU + NTHU)
    │   ├── categories.ts           8 個食物分類
    │   ├── cvs.ts                  超商資料來源
    │   └── forecastModel.ts        ★自動產生★ 預測模型權重
    ├── lib/
    │   ├── api.ts                  API client（askAgent / translateTexts / recognizeImage…）
    │   ├── useI18n.tsx             i18n Context + Hook
    │   ├── imageCompress.ts        Canvas 圖片壓縮
    │   ├── markers.ts              Leaflet 標記圖示
    │   ├── mockCvsFood.ts          超商剩食模擬生成器
    │   └── supplyForecast.ts       供給預測（前端推論）
    └── components/
        ├── Header.tsx              頂端 bar + 語言下拉
        ├── MapView.tsx             主地圖容器
        ├── CVSLayer.tsx / DormLayer.tsx        標記層
        ├── StoreDetailPanel.tsx / DormDetailPanel.tsx
        ├── NewItemDialog.tsx       上架表單（含 AI 拍照辨識）
        ├── ClaimDialog.tsx         領取對話框
        ├── ItemText.tsx            物品文字 + 翻譯按鈕
        ├── AIChat.tsx              AI 助手聊天視窗
        ├── QRCodeBadge.tsx         右上角 QR code
        ├── LocateButton.tsx        定位按鈕
        └── MapControl.tsx          地圖控制包裝（事件隔離）
```

---

## 資料模型

### `items` 表（D1 / SQLite）

```sql
CREATE TABLE items (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  dorm_id         TEXT NOT NULL,                          -- 例如 'nycu-7'
  title           TEXT NOT NULL,                          -- 品名（≤80）
  description     TEXT,                                   -- 說明（≤500）
  category        TEXT,                                   -- 8 種分類之一
  image_data_url  TEXT,                                   -- base64 JPEG（≤300KB）
  expires_at      TEXT NOT NULL,                          -- ISO timestamp
  contact         TEXT NOT NULL,                          -- 上架者聯絡方式
  claimed         INTEGER NOT NULL DEFAULT 0,             -- 0 = 可領, 1 = 已領
  claimer_name    TEXT,                                   -- 領取者名字
  claimer_contact TEXT,                                   -- 領取者聯絡方式 🔒
  claimed_at      TEXT,                                   -- ISO timestamp
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_items_dorm ON items(dorm_id);
CREATE INDEX idx_items_created ON items(created_at);
```

### TypeScript 型別

```typescript
export interface LeftoverItem {
  id: number;
  dorm_id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  image_data_url?: string | null;
  expires_at: string;
  contact: string;
  claimed: 0 | 1;
  claimer_name?: string | null;
  claimer_contact?: string | null;  // 從 API response 已剝離
  claimed_at?: string | null;
  created_at: string;
}
```

### 8 個分類

| ID | Emoji | 中文 | English | 顏色 |
|---|---|---|---|---|
| `meal` | 🍱 | 便當熟食 | Meal | 橙色 |
| `snack` | 🍪 | 零食 | Snacks | 紫色 |
| `drink` | 🥤 | 飲料 | Drinks | 天藍 |
| `bread` | 🍞 | 麵包 | Bread | 棕色 |
| `fruit` | 🍎 | 水果 | Fruit | 紅色 |
| `groceries` | 🛒 | 生鮮 | Groceries | 綠色 |
| `frozen` | ❄️ | 冷凍 | Frozen | 深藍 |
| `other` | 📦 | 其他 | Other | 灰色 |

### 34 棟宿舍

**NYCU 光復校區（12 棟）：**
七、八、九、十、十一、十二、十三、女宿、女二、研一、研二、研三

**NTHU 校本部（22 棟）：**
清齋、華齋、明齋、新齋、義齋、平齋、誠齋、新 A/B/C、仁齋、實齋、禮齋、碩齋、儒齋、善齋、學齋、鴻齋、雅齋、靜齋、慧齋、文齋

座標來源：
- NYCU：OpenStreetMap building polygons
- NTHU：[NTHU campusmap XML](https://map.nthu.edu.tw/)

精度：~10–50 公尺，已逐棟驗證。

---

## Demo 資料

預先 seed 了 14 筆物品（皆有照片），分散在 13 棟宿舍：

| Dorm | 物品 | 分類 |
|---|---|---|
| NYCU 七舍 | 全聯吐司 1 條 | 🍞 麵包 |
| NTHU 誠齋 | 半條法式長棍 | 🍞 麵包 |
| NYCU 八舍 | 鮮乳坊牛奶 936ml | 🥤 飲料 |
| NTHU 義齋 | 義美生機鮮乳 | 🥤 飲料 |
| NYCU 女二 | 7-11 御飯糰 x2 | 🍱 便當 |
| NTHU 實齋 | 統一肉燥麵 x5 包 | 🍱 便當 |
| NYCU 九舍 | 麥當勞冰炫風優惠券 x2 | 🍪 零食 |
| NTHU 仁齋 | 樂事洋芋片 x3 包 | 🍪 零食 |
| NYCU 女宿 | 整盒大湖草莓 | 🍎 水果 |
| NTHU 雅齋 | 富士蘋果 x4 | 🍎 水果 |
| NYCU 研一 | 桂格即食燕麥 | 🛒 生鮮 |
| NTHU 華齋 | 半盒雞蛋 (5 顆) | 🛒 生鮮 |
| NTHU 實齋 | 白米 1.5kg | 🛒 生鮮 |
| NTHU 碩齋 | 火鍋料一盒 | ❄️ 冷凍 |

並且預先 demo 了 6 筆「已被領走」記錄，模擬不同學生領走的情境（含本地學生、國際學生、不同聯絡方式格式），讓「已被領走」歷史區一進去就有內容。

照片來源：[loremflickr.com](https://loremflickr.com) 依分類關鍵字抓取的真實食物照片，瀏覽器壓縮到 ≤150KB 後存成 base64。

---

## 限制與未來規劃

### 目前 demo 的限制

1. **無使用者認證**：任何人都能上架、領取、查看上架者聯絡方式
   - 未來：整合學校 SSO（NYCU portal / NTHU LDAP）
2. **超商剩食是 mock**：不是真實的超商剩食資料
   - 未來：對接「7-11 友善食光」/「全家友善食光」官方 API
3. **無 rate limiting**：可能被人惡意刷 POST
   - 未來：在 Cloudflare WAF 加 rule（每 IP 每分鐘 ≤ 10 個 request）
4. **照片以 base64 存進 DB**：增加 DB 體積、查詢變慢
   - 未來：用 Cloudflare R2 物件儲存，DB 只存 URL
5. **無通知系統**：上架後無法通知附近的人
   - 未來：Web Push API 或整合 LINE Notify
6. **無評分 / 信譽系統**：無法判斷上架者 / 領取者是否可信
   - 未來：簡單的 thumbs up/down 機制
7. **無檢舉機制**：若有不當內容無法移除
   - 未來：管理員後台
8. **部分翻譯需要 native speaker review**：印地語、泰語、越南語為機翻
9. **照片在前端壓縮，但若使用者上傳大量照片可能 OOM**：未來改 server-side 處理 / 直接傳到 R2

### 工程上仍可改進

- 沒有單元測試（demo 性質）
- `@cloudflare/workers-types` 未加入 `devDependencies`（IDE typing only，runtime 無影響）
- 部分元件可進一步抽出 hook
- 圖片可加上 lazy-loading

---

## 附錄：AI 用在哪裡

本專案在地圖上整合了 **Cloudflare Workers AI**（跑在自有帳號的免費額度，無需自架伺服器）。以下完整盤點「哪裡是 AI、哪裡不是」，方便 demo / Q&A 對照。

### 🟢 ① AI 對話助手 — RAG（embedding 語意檢索）

- **位置**：地圖右下角 ✨ 浮動按鈕 → 聊天視窗
- **功能**：用自然語言問「現在哪間宿舍有麵包？」「我想吃甜的」，回傳一句自然語言答案。
- **運作流程（完整 RAG）**：
  1. **Retrieval**：用 `bge-m3` 把**問題**和每一筆 live 物品都轉成向量，依 **cosine 相似度**取最相關的前 8 筆（真語意檢索，不是關鍵字比對）。
  2. **Augment**：只把這 top-8 物品放進 prompt（含所在宿舍）。
  3. **Generation**：Llama 只依據這些物品作答，**不會幻想出不存在的物品**。
- **為什麼是「語意」檢索**：問「我想吃甜的」也能撈到「草莓、香蕉」——字面完全沒有「甜」字，靠的是 embedding 語意相近。
- **規模化**：本資料量小，採每次請求即時 embedding + brute-force cosine；要放大可改用向量索引（如 **Cloudflare Vectorize**，ANN 次線性查詢），檢索邏輯不變。
- **Agent（工具呼叫）**：助手不只回答，還能**直接幫你預約**——它有一個 `reserve_item` 工具，當你明確說要預約某物並給了名字，它會呼叫工具、**原子地** claim 該物品，再回報捐贈人的聯絡方式。為避免 8B 模型亂呼叫工具，加了**雙重防呆**：必須 (1) 使用者明確表達預約意圖、且 (2) 名字確實出現在使用者自己打的訊息裡，才會真的動到資料庫（防止「問問題就被預約」或「亂編名字」）。
- **模型**：`@cf/baai/bge-m3`（embedding，多語）+ **Llama 雙模型**：`llama-3.1-8b-instruct`（一般問答，快、不帶工具）/ `llama-3.3-70b-instruct-fp8-fast`（只在預約工具呼叫時用）。為什麼分兩個：8B 選 item id 不準會預約到錯的東西，所以預約用 70B；但帶著工具的 70B 又常拒答一般問題，所以沒預約意圖時就不帶工具、用 8B 回答。
- **程式**：`functions/api/ai/agent.ts`（RAG 檢索 + 工具呼叫，同一支端點）、`src/components/AIChat.tsx`、`src/lib/api.ts`

### 🟢 ② 拍照自動辨識 — 視覺語言模型

- **位置**：宿舍模式 → 上架物品 → 選照片後「✨ AI 自動辨識」
- **功能**：拍一張食物照片，自動填好「品名」「分類」，降低上架打字門檻。
- **運作流程**：
  1. **看圖 + 出欄位**：照片送進 **Llama 3.2 11B Vision**，**單次呼叫**就直接讀懂圖片並輸出使用者語言的 `{title, category}`。
  2. **人為確認**：前端預填，使用者確認後才送出（半自動：AI 先填、人定稿）。
- **穩健性**：若 3.2 Vision 沒給可用結果，自動退回舊的 **LLaVA 看圖 → Llama 整理** 兩段式；輸出一律過濾，不會把 JSON 字串／空白當成品名。
- **模型**：`@cf/meta/llama-3.2-11b-vision-instruct`（主，需一次性同意 Meta 授權）+ fallback `@cf/llava-hf/llava-1.5-7b-hf` + `@cf/meta/llama-3.1-8b-instruct`
- **程式**：`functions/api/ai/vision.ts`、`src/components/NewItemDialog.tsx`

### 🟢 ③ 即期品供給預測 — 自己訓練的 logistic regression 模型

- **位置**：超商模式 → 點店家 → 面板上方「🔮 即期品機率」
- **功能**：估「現在去這家店有即期品的機率」。
- **這是我們自己訓練的模型（不是呼叫 API）**：用 `ml/train_forecast.py` 在本地合成時序資料、訓練一個 **logistic regression**，匯出 ~8 個係數到 `src/data/forecastModel.ts`，前端直接做 sigmoid 推論（**零網路、零模型伺服器**）。
- **特徵**：時段（sin/cos 兩個諧波 → 捕捉兩個每日高峰）、是否週末、超商品牌、店家來客 proxy。
- **成效（測試集）**：**ROC-AUC 0.85、accuracy 0.77、Brier 0.157**。
- **誠實揭露**：訓練資料是**合成的**（沒有真實回報歷史），展示的是完整 ML pipeline（合成 → 特徵 → 訓練 → 評估 → 部署）；接上真實資料即可重訓。
- **程式**：`ml/train_forecast.py`、`src/data/forecastModel.ts`、`src/lib/supplyForecast.ts`

### 🟢 ④ 貼文自動翻譯 — 使用者內容即時翻譯

- **位置**：宿舍模式 → 物品卡片下方「🌐 翻譯成我的語言」
- **功能**：UI 介面本來就有 10 語，但**使用者自己打的物品標題/描述**沒有；國際學生一鍵就能把中文貼文翻成自己的語言（可再切回原文）。
- **為什麼用 Llama 而非專用翻譯模型**：短的食物名稱（如「整盒大湖草莓」）給小的 m2m100 翻得很差；改用 Llama 指令翻譯品質明顯較好，且能自動偵測來源語言。
- **模型**：`@cf/meta/llama-3.3-70b-instruct-fp8-fast`（翻譯這支特別用 70B；中↔日這種漢字重疊的情況，8B 會誤判「已經是日文」而原樣返回，70B 正常）
- **程式**：`functions/api/ai/translate.ts`、`src/components/ItemText.tsx`

### 一句話總結

> 本站用 Cloudflare Workers AI 的開源模型：**bge-m3 + Llama 3.3 70B** 做對話查詢（embedding 語意檢索的完整 RAG，且是能**幫你預約**的 tool-calling agent）、**Llama 3.2 Vision** 看懂使用者拍的食物照片、**Llama 3.3 70B** 翻譯貼文；供給預測則是**我們自己訓練的 logistic regression 模型**（本地離線訓練、權重前端推論）。Workers AI 全部跑在自有 Cloudflare 帳號的免費額度。

> 📂 講稿（中／英）已移至 [`docs/`](docs/) 資料夾。

---

## 授權

MIT License — 自由 fork、修改、用於非商業用途。商業使用請先聯繫。

## 致謝

- **地圖底圖**：[OpenStreetMap](https://www.openstreetmap.org/) contributors
- **超商位置 demo 資料**：[Minato1123/taiwan-cvs-map](https://github.com/Minato1123/taiwan-cvs-map)
- **NTHU 宿舍座標**：[NTHU campusmap](https://map.nthu.edu.tw/)
- **示範食物照片**：[loremflickr.com](https://loremflickr.com/)
- **Hosting**：[Cloudflare Pages](https://pages.cloudflare.com/)

---

**Made with 💚 to reduce food waste, one bowl at a time.**
