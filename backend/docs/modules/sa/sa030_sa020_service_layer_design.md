# Legacy Analysis Phase 2A-D：SA030 / SA020 Service Layer 核心架構設計

## 一、為何需要 Service Layer？

SA030 訂單存檔邏輯牽涉的範圍極廣，若將所有邏輯塞入 ViewSet 或 Model `save()` 中，將導致程式碼難以維護、測試困難，且無法在未來的 SA020 預告單重用。
根據現有 `DeepSaveMixinV2` 的架構設計，雖然它能處理基礎的 Master-Detail 儲存，但面對 SA030 的 **Sub-Detail 解析** 與 **跨模組 Side Effects (DP / QC)**，我們必須建立專屬的 Service Layer 來封裝這些企業邏輯。

## 二、SaOrderDeepSaveService 設計 (核心入口)

* **負責範圍**：統籌整張訂單的儲存生命週期。
* **是否與 DeepSaveMixinV2 相容**：**是**。Service 可以宣告內部類別繼承 `DeepSaveMixinV2`，或是在 Service 內實例化一個 Adapter。建議採用 Adapter 模式，將 Payload 交由 Mixin 處理第一層 (sa030, sa031, sa034, sa035)，並利用 Hook 擴充。
* **Hook 實作 (post_detail_save_hook)**：
  當 Mixin 儲存完一筆 `sa031` 後，觸發 Hook。此時 `SaOrderDeepSaveService` 接手，從 `raw_detail_payload` 的 `custom_children` 中抽取出 `sa032` 與 `sa033`，並呼叫對應的遞迴儲存邏輯。

## 三、SaOrderValidationService 設計

* **負責範圍**：接管 `pre_save_validation_hook`。
* **業務規則**：
  * 檢查 `approve` 狀態是否為 Y，若是則拋出 PermissionDenied。
  * 檢查 `sa033` 尺碼網格的各尺碼數量，若 `outpairs > 0` 且前端傳入的雙數與資料庫不同，拋出 ValidationError (禁止修改已出貨尺碼)。
  * 檢查必填欄位 (客戶、交期等)。
* **實作建議**：第一階段必須實作，可作為獨立 Class，由 DeepSaveService 呼叫。

## 四、SaOrderTotalRecalcService 設計

* **負責範圍**：存檔完成後的資料重算。
* **業務規則**：
  * `sa033` 必須根據 Assortment 模式重新計算 `ctnpairs` 與 `totalpairs`。
  * `sa032` 必須加總其下 `sa033` 的數量。
  * `sa031` 必須加總其下 `sa032` 的數量與金額。
  * `sa030` 必須加總整張訂單的總雙數與總金額。
* **實作建議**：在 `post_deep_save_hook` 執行。可先用簡單的 DB Aggregate Query 實作，確保即使前端計算有誤，資料庫落檔依然正確。

## 五、SaOrderAssortmentService 設計

* **負責範圍**：封裝 Assortment 4 種模式的展開與檢驗。
* **業務規則**：
  1. 單色單碼裝
  2. 單色混碼裝
  3. 混色單碼裝
  4. 混色混碼裝
  確保前端傳入的 16 碼 Grid 數據符合選定的裝箱模式。
* **實作建議**：作為 Validation 的輔助工具，第一階段若由前端保證資料正確性，此 Service 可延後至第二階段深化。

## 六、SaOrderDpAdoptedService 設計

* **負責範圍**：更新開發模組 (DP) 的 `adopted` 狀態。
* **觸發時機**：`post_transaction_hook` 或在 DeepSave 的 Atomic Transaction 結尾。
* **業務規則 (提取自 PB)**：
  1. 收集本次訂單用到的 `styleno`, `dp010gkey`, `dp015gkey`, `dp020gkey`。
  2. 若 `sa030.status != '0'` (非預告單)，將上述 DP 項目設為 `adopted = 'Y'`。
  3. 收集本次被**刪除**或**替換**的 DP 項目。
  4. 針對被移除的項目，下 SQL 檢查是否有「其他狀態!=0 的訂單」仍在使用。若無，則更新為 `adopted = 'N'`。
* **實作建議**：**第一階段絕對必要**。這是 PB 系統的核心關聯邏輯，未實作會導致開發部門的型體狀態錯誤。

## 七、SaOrderQcSyncService 設計

* **負責範圍**：同步新增/刪除品保模組 (QC) 的驗貨資料。
* **觸發時機**：同上。
* **業務規則 (提取自 PB)**：
  1. 當新增 `sa031` / `sa032` 時，自動在 `qc030` (驗貨主檔) / `qc031` (驗貨明細) 中插入對應記錄。
  2. 當刪除 `sa031` / `sa032` 時，連動刪除對應的 QC 記錄。
* **架構考量**：
  * 是否該用 Event-Driven (Celery/Signals) 降低耦合？
  * 考量到舊版 PB 採用同步 Transaction (失敗即 Rollback)，為了確保初期改版穩定度，**強烈建議第一階段維持同步呼叫**，將邏輯包裝在 Service 中，與主訂單共用同一個 `transaction.atomic()`。

## 八、不建議放在 ViewSet 的邏輯

* 任何跨表運算 (如 Recalc)。
* 跨模組狀態連動 (DP, QC)。
* 巢狀 Sub-Detail 解析。
**ViewSet 應保持極度輕量**，僅負責接收 Request Payload，驗證 `program_id` 權限，並呼叫 `SaOrderDeepSaveService`，最後將結果 Serialize 回傳。

## 九、實作階段建議順序

1. **Phase 1: 基礎存檔**
   * 建立 `sa030 ~ sa035` Django Models。
   * 實作 `SaOrderDeepSaveService` 結合 `DeepSaveMixinV2` 與客製化 `post_detail_save_hook` (處理 sa032/sa033)。
2. **Phase 2: 基礎驗證與總計**
   * 實作 ValidationService 阻擋 Approve 與 Outpairs 修改。
   * 實作 TotalRecalcService 防止前端計算誤差。
3. **Phase 3: 跨模組 Side Effects**
   * 實作 DpAdoptedService 與 QcSyncService，並掛載至 Transaction 結尾。
