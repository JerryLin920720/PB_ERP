# Legacy Analysis Phase 2A-E：SA030 / SA020 Analysis Integration & Framework Impact Review

## 一、分析摘要

SA030 (P/O訂單) 與 SA020 (預告單) 是 SA 模組的最核心作業。經過前端 UI、Backend API、DeepSave Payload 以及 Service Layer 的全面分析後，確認此兩支作業具備高度共用性，且擁有極端複雜的「三層巢狀主從結構」(Master -> Detail -> Sub-Detail)。
本次整合將彙整前述所有設計文件，評估其對底層框架 (Frontend / Backend) 的衝擊，盤點相關的 Side Effects (DP / QC)，並提供實作前的 Readiness Checklist。

## 二、SA030 / SA020 核心定位

* **SA030** 是 P/O 正式訂單核心作業。
* **SA020** 是預告訂單作業。
* **共用性 (已確認)**：兩者完全共用 `sa030 ~ sa035` 資料表結構，僅透過 `sa030.status` (0=預告, 1~5=正式) 區分。
* **後端架構 (已確認)**：兩者極度適合共用 `SaOrderDeepSaveService`，僅需透過各自的 ViewSet 帶入不同的 `order_type` 與 `program_id` 參數即可實現權限隔離。

## 三、目前已確認的資料結構

目前已確認的關聯樹如下：

```text
sa030 (Master 主檔)
 │  -- 包含 Master Extensions: Mark, Memo, SayTotal, Pack, Bank (實體皆為 sa030 欄位)
 │
 ├─ sa031 (Detail: 型體/顏色) [FK: sa030gkey]
 │   │
 │   ├─ sa032 (Sub-Detail: 尺碼與價格) [FK: sa031gkey, sa030gkey]
 │   │
 │   └─ sa033 (Sub-Detail: 裝箱/Assortment/Size Grid) [FK: sa032gkey, sa031gkey, sa030gkey]
 │       -- 包含橫向固定的 size1~16 與 pairs1~16
 │
 ├─ sa034 (Detail: 配件明細) [FK: sa030gkey]
 │
 └─ sa035 (Detail: 加扣款明細) [FK: sa030gkey]
```

* **待驗證事項**：`sa033` 掛在 `sa032` 之下是合理的推測，但依據 PB 的 SRD 定義，它同時持有 `sa030gkey`, `sa031gkey`, `sa032gkey` 三個外鍵以方便查詢。具體的聯動層級需在實作時確保。

## 四、Pattern B-Order 前端框架影響

現有的 `Pattern B` 無法支撐此複雜度，必須新增 **Pattern B-Order** 樣板。
* **佈局需求**：需要 Master + Detail + SubDetail 且需支援左側導覽列。
* **Size Grid 需求**：需要支援 `FixedSizeGrid` (16碼固定)。
* **Assortment 需求**：需要支援單色單碼、單色混碼、混色單碼、混色混碼 4 種模式展開。
* **Dirty State 管理**：由於表單層次極深，需要統一的狀態管理器 (Zustand) 在前端緩存所有的修改，並在點擊 Save 時一次送出。
* **新增元件建議**：
  * `OrderWorkbench`：訂單工作台頁面容器。
  * `OrderMasterForm`：包含多 Tab 的主檔表單。
  * `FixedSizeGrid`：16碼尺碼輸入與動態加總網格。
  * `OrderStatusGuard`：負責處理 Approve Lock 與 Outpairs Lock 的 UI 封鎖防呆。

## 五、Backend Framework 影響

SA030 對後端框架造成了巨大挑戰。

* **DeepSaveMixinV2 能力評估**：
  * **(已確認)** 可支援 Master + Detail 的存檔。
  * **(已確認)** 可支援 `pre_save_validation_hook` 與 `post_deep_save_hook`。
  * **(推測/不支援)** 不支援預設解析 Sub-Detail (如 `sa032`, `sa033`)。
* **解決方案**：需要利用 `custom_children` 讓 Mixin 忽略 Sub-Detail，並在 `post_detail_save_hook` 中攔截進行手動遞迴存檔。
* **Service Layer 需求**：絕對需要獨立出 `SaOrderDeepSaveService` 等領域服務，不可將邏輯寫在 ViewSet。必須使用 `transaction.atomic` 包住整張訂單的處理。

## 六、Side Effects 整理 (跨模組影響)

### 1. DP adopted 同步
* **觸發條件**：存檔 SA030 時，將訂單中 `sa031` 用到的 `dp010` (楦頭), `dp015` (大底), `dp020` (鞋跟), `dp025` (型體) 設為 `adopted='Y'`。
* **取消條件**：當訂單被刪除或改回預告單時，檢查這些基礎資料是否還有被「其他正式訂單」引用，若無則設回 `adopted='N'`。
* **風險**：極容易引發資料庫 Deadlock，必須透過 `SaOrderDpAdoptedService` 統一管理，甚至考慮鎖表順序。

### 2. QC030 / QC031 同步
* **觸發條件**：新增或刪除 `sa031` 時，PB 採用同步 `rowsmove` 的方式在同一個 Transaction 內將 `qc030` 與 `qc031` 檢驗單紀錄寫入。
* **建議**：為維持穩定性，第一階段建議維持同步寫入，不採用非同步 Event。需建立 `SaOrderQcSyncService` 支援。

## 七、已確認 / 待驗證 / 推測清單

| 類別 | 項目 | 狀態 | 證據來源 | 備註 |
| --- | --- | --- | --- | --- |
| 資料結構 | `sa030` 為 Master，包含延伸 Tab 欄位 | 已確認 | PB/SRD | |
| 資料結構 | `sa033` 掛在 `sa032` 之下 | 已確認 | SRD 外鍵定義 | `sa033` 具備 `sa032gkey` |
| 前端 | 需要 Pattern B-Order 樣板 | 已確認 | UI 複雜度分析 | 普通 Pattern B 無法應付 |
| 後端 | 兩者共用 `SaOrderDeepSaveService` | 已確認 | 商業邏輯分析 | `status` 區分兩者 |
| 後端 | DeepSaveMixinV2 支援 Sub-Detail 遞迴 | **待驗證** | 架構推測 | 需藉由 Hook 客製化實現 |
| Side Effect | 存檔時需同步建立 QC 資料 | 已確認 | PB 原始碼 | |

## 八、實作前 Readiness Checklist

- [x] SA020 / SA030 差異是否已釐清？ (是)
- [x] `sa030 ~ sa035` FK 關係是否已確認？ (是)
- [ ] Pattern B-Order 的 Figma / UI 佈局是否已定案？ (未定)
- [ ] `DeepSaveMixinV2` 的 `custom_children` Hook 解析邏輯原型是否驗證通過？ (未定)
- [ ] DP adopted 的 Aggregate Check SQL 效能測試是否通過？ (未定)
- [ ] QC 模組是否已準備好對應的寫入 Service？ (未定)
- [ ] 權限 / approve / outpairs 的 UI Disabled 機制是否已有明確規格？ (未定)

## 九、是否建議現在進入實作

**否，目前不建議直接進入前端或 API 的 Coding 實作。**

**原因**：
1. `DeepSaveMixinV2` 的巢狀擴展能力尚未有明確的 Proof of Concept (PoC)。如果直接開發，一旦 Mixin 扛不住巢狀資料結構，可能需要大規模打掉重構。
2. DP 與 QC 模組尚未準備好對應的內部呼叫介面，這會導致 SA030 API 開發時無法將 Side Effect 拼圖補齊。

## 十、下一步建議
建立一份 SA030 巢狀 Payload 的 JSON 測試檔，針對 `DeepSaveMixinV2` 進行一版純後端的存檔 PoC (Proof of Concept)，確定可以利用 Hook 完成 Master -> Detail -> SubDetail 的存檔與 Transaction Rollback 後，再進行實際的業務開發。
同時，可先切換至 SA 模組的其他查詢作業或簡單的基礎資料表，如 SA040 或 SA010 的分析，以利團隊平行作業。
