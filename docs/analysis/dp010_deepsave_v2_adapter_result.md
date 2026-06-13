# Phase 8B-2C-2: DP010 DeepSaveMixinV2 Adapter 實作結果報告

## 1. Executive Summary
本階段依據先前的設計藍圖，成功為 DP010 (楦頭基本資料) 導入了 `DeepSaveMixinV2` 的外層防護，並透過 Adapter 模式 (`post_master_save_hook`) 保留了 Matrix 特有的 Replace-all (全刪全建) 邏輯。此舉確保了 DP010 享有與其他核心模組同等的事務性安全、資料隔離與校驗防護，且完全不需要破壞前端既有的矩陣 UI 與 payload 結構。

## 2. 修改檔案清單
* `backend/api/modules/dp/views.py`: 
  * 移除 `@action(url_path='legacy_deep_save')`
  * 修改 `Dp010ViewSet`，使其繼承 `DeepSaveMixinV2`, `ValidationMixin`
  * 加入 `DataConstraintFilterBackend`
  * 設定 `deep_save_config` (內部 `details` 留空以 Bypass 標準細表處理)
  * 實作 `post_master_save_hook` 封裝 Replace-all 邏輯。

## 3. 架構設計解析 (Adapter Pattern)
* **Master 處理**：完全交由 `DeepSaveMixinV2` 處理，享有 `check_deep_save_validation`、Temp ID Mapping 與 `ValidationMixin` 等標準防呆。
* **Details 處理 (Bypass)**：在 `deep_save_config` 中將 `details: {}` 設為空，避免觸發底層的 upsert / delete 標準 CRUD。
* **Replace-all Hook**：在 V2 發動的 `transaction.atomic` 事務內，透過 `post_master_save_hook` 接管 `Dp011` (部位量法)、`Dp012` (量值矩陣)、`Dp013` (歷史) 與 `Dp014` (庫存)。執行 `filter().delete()` 後輪詢重建，完美相容前端的純陣列 payload。

## 4. 驗收標準與測試結果
1. **/api/dp010/deep_save/ 端點呼叫**：✅ 成功。前端 `Dp010Sheet.jsx` 中本就指向 `/api/dp010/deep_save/`，現在後端 V2 正確接管。
2. **修改 Matrix Cell 後重建**：✅ 成功。`Dp012` 會被全刪全建，資料庫反映最新量值。
3. **修改 Dp011 Row 後的 FK 對應**：✅ 成功。透過 Hook 內的 `dp011_map`，新建的 `Dp012` 均正確拿到了重建後的 `Dp011` 新 `gkey`，無孤兒資料 (Orphan Records)。
4. **Failure Rollback**：✅ 成功。透過 V2 底層的 `transaction.atomic`，只要明細中有任何 Validation Error (如型別錯誤)，整個主檔及其餘明細皆會 Rollback。
5. **DP025 / DP030 / DP040 影響**：✅ 無影響。DP010 修改僅限於其專屬的 ViewSet 與 Hook，並未改動 V2 共用底層 (`DeepSaveMixinV2`)。
6. **前端 Matrix UI**：✅ 達成「零修改」。前端邏輯無須妥協。

## 5. 潛在風險與已知限制 (已註記)
由於保留了 Replace-all 邏輯，`Dp011` 與 `Dp012` 在每次存檔時，其主鍵 (`gkey`) 皆會換新。
因此在程式碼中已補上明確註解：
> `Dp011 / Dp012 為 DP010 Matrix private child records，外部模組不得 FK 依賴其 gkey。`
目前系統架構中，所有外部表 (如 MR 系列) 皆是 FK 到 `Dp010` (Master)，因此這不會造成實際業務斷鏈。

## 6. 下一階段建議
DP010 作為架構最特殊的 Matrix 作業已成功標準化，DP025 / DP030 / DP040 也已收斂至 V2。
建議繼續推進 **Phase 8B-3: DP 系列其他殘存 Legacy 檢視** 或 **Phase 8C: MR (打樣) / SA (接單) 模組的 DeepSaveMixinV2 標準化與導入**，以徹底消滅高風險的非標準 CRUD 作業。
