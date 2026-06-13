# DP010 / DP025 現況拆解與標準化計畫

## 1. Executive Summary
本計畫對 ERP 系統中樣品模組的最上游基本資料 —— DP010 (楦頭基本資料) 與 DP025 (型體基本資料) 進行了深入的現況拆解。
分析結果指出，**DP025 具有極高的標準化潛力**，其前端 Payload 已完美契合 `upsert` / `delete` 格式，僅需收攏為單一 `DeepSaveMixinV2` 請求；而 **DP010 則屬於高度客製化的 Matrix (矩陣) 表單**，前端採用「全刪全建 (Replace-all)」的危險機制，且子表具備複雜的外鍵依賴關係。
**結論與建議**：應優先執行 DP025 的標準化 (Phase 8B-2B)，待其穩定後再審慎處理高風險的 DP010 (Phase 8B-2C)。

---

## 2. DP010 現況拆解
### 前端 (Dp010Sheet.jsx)
* **UI 架構**：高度客製化，未使用 Factory。使用大量的 `useState` 管理 `masterList`、`measurements` (Dp011)、`values` (Dp012)、`histories` (Dp013) 與 `stocks` (Dp014)。
* **Matrix 特殊邏輯**：`handleValueChange` 包含複雜的「步長 (steps) x 基準碼 (basicsize)」聯動計算，這是一組二維展開的動態矩陣表單。
* **Payload 結構**：**非 V2 標準格式**。前端呼叫 `/api/dp010/deep_save/`，但傳遞的是 `{ master, measurements, values, histories, stocks }` 純陣列，並沒有區分 `upsert` 與 `delete`。

### 後端 (views.py -> Dp010ViewSet)
* **類別**：單純繼承 `viewsets.ModelViewSet`，未引入任何防護 Mixins (如 Validation, Approval, BillNo)。
* **存檔機制**：使用 `@action(url_path='legacy_deep_save')`。
* **高風險業務邏輯 (Replace-all)**：後端會直接 `delete()` 整批 Dp011, Dp012, Dp014，然後用前端傳來的陣列**全部重新建立 (Create)**。且重新建立時，透過 Dictionary (如 `dp011_map`) 將 Dp011 的新 `gkey` 綁定給 Dp012 (因 Dp012 依賴 Dp011)。

---

## 3. DP025 現況拆解
### 前端 (Dp025Sheet.jsx)
* **UI 架構**：純手刻 React Component (未使用 Factory)，以 Tab 切換 Query 與 Details。
* **特有業務流**：具有「從樣品單一鍵導入 (ue_custom1 / import_from_sample)」以及複雜的 F2 雙重選擇窗。
* **Payload 結構**：**完美相容 V2！** 前端已經手工計算了 `deletedPrices`、`deletedTransfers`，並在存檔時將資料轉為 `{ upsert: [...], delete: [...] }` 格式。
* **存檔機制 (Dispersed Transaction)**：**極度危險**。前端 `handleSaveAll` 先以 `axios.post` 或 `put` 呼叫 `/api/dp025/` 存主檔，取得 `savedGkey` 後，再發起三個平行的 `Promise.all` 呼叫各自的 `bulk_save`。這破壞了原子性 (Atomicity)。

### 後端 (views.py -> Dp025ViewSet)
* **類別**：繼承 `BaseDictionaryViewSet`，沒有套用 `DeepSaveMixinV2`。
* **存檔機制**：目前沒有定義 `deep_save`。依賴前端發送多次 HTTP 請求。

---

## 4. Pattern 判定
* **DP010 建議 Pattern**：**Custom Pattern (Pattern M - Matrix)**。因為具備二維尺碼展開與階層關聯，且為全刪全建邏輯，無法無腦套用 Pattern A/B。
* **DP025 建議 Pattern**：**Pattern B (Master-Detail)** 或 **Record Workbench**。其具備一個主檔與三個相互獨立的明細表，標準的主從關係。

---

## 5. 風險評估 (Risk Analysis)

### DP010 風險 (極高)
* **前端風險**：若硬改為 Factory，二維尺碼矩陣 (Pivot) 的渲染與動態步長連動計算會全部失效。
* **後端風險**：若強上 `DeepSaveMixinV2`，因前端未傳遞 `delete` 陣列，V2 將無法處理「刪除舊資料」的行為。若在後端 Hook 內自行對比 DB 並補上 Delete 清單，邏輯過於複雜且容易造成 Dp012 失連 (Orphaned records)。

### DP025 風險 (低 ~ 中)
* **前端風險**：維持現有 UI，僅需將分散的 Save 邏輯收攏為一包 JSON 並送往 `deep_save/`。
* **後端風險**：`Dp025ViewSet` 完全可以直接掛載 `DeepSaveMixinV2`。三支明細 (Dp026, Dp027, Dp028) 彼此間沒有外鍵互卡，是完美的平行子表。

---

## 6. DeepSaveMixinV2 可行性與 Mixin 需求

| 作業 | DeepSaveMixinV2 | Validation | Approval | BillNo | DataConstraint |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **DP025** | ✅ **極度適合** | ✅ 需要 | ✅ 需要 (已有 confirms) | ❌ 暫無需求 | ✅ 需要 |
| **DP010** | ⚠️ **需客製 Hook 介入** | ✅ 需要 | ❌ 暫無需求 | ❌ 暫無需求 | ✅ 需要 |

---

## 7. 建議優先順序與路線圖

基於「先易後難、控制爆破範圍」的策略，強烈建議：
👉 **先執行 DP025，再執行 DP010。**

### Phase 8B-2B：DP025 標準化計畫 (優先)
1. **後端**：讓 `Dp025ViewSet` 繼承 `DeepSaveMixinV2, ValidationMixin, ApprovalMixin, DataConstraintFilterBackend`。
2. **deep_save_config**：設定 `dp026`, `dp027`, `dp028`，`delete_mode` 設為 `hard`。
3. **前端**：修改 `Dp025Sheet.jsx` 中的 `handleSaveAll`，將 `master` 與三個 `{upsert, delete}` 物件包裝成單一 payload，直接呼叫 `/api/dp025/deep_save/`。
4. **預期效益**：修復前端分散存檔 (Dispersed Saves) 的巨大風險，實現 100% 資料庫原子性。

### Phase 8B-2C：DP010 標準化計畫 (延後)
1. **策略**：同樣採取「前端不重寫 UI，透過後端 Hook 轉接」的策略。
2. **後端客製轉接**：在 `Dp010ViewSet` 接入 `DeepSaveMixinV2`，但必須覆寫 `pre_deep_save_hook`。在 Hook 中接收前端傳來的純陣列 `measurements, values`，在記憶體中比對 DB 現有資料，動態產生出 V2 認識的 `upsert` 與 `delete` 陣列，藉此欺騙 V2 使其能夠處理 Replace-all 的行為。
3. **保留 legacy**：DP010 的 `legacy_deep_save` 必須標示為 Deprecated 嚴格保留。

---

## 8. 下一階段建議
請回覆是否同意本計畫。若同意，我們將啟動 **Phase 8B-2B：DP025 底層補齊 / DeepSaveMixinV2 標準化重構**。
