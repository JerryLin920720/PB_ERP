# DP004 / DP080 / DP100 V1 to V2 Upgrade Plan (Phase 8B-3-2)

此計畫目標是將 `DP004`, `DP080`, `DP100` 三支仍使用舊版 `DeepSaveMixin` (V1) 的作業升級為 `DeepSaveMixinV2`。

## 1. 現況拆解與升級策略

### DP004 (鞋種性別與尺碼定義)
* **Master**: Dp004, **Detail**: Dp004A (sizes)
* **現況**:
  - 後端 `Dp004ViewSet` 配置了 V1 的 `deep_save_config`。
  - **[重大發現]** 前端 `Dp004Sheet.jsx` 目前根本沒有呼叫 `deep_save`，而是直接呼叫 `BaseDictionaryViewSet` 提供的 `/api/dp004/bulk_save/`。由於 `Dp004Serializer` 將 `sizes` 設為 `read_only`，導致前端傳送的 `sizes` 陣列在存檔時被**完全忽略並丟棄**。
* **V2 升級策略**:
  - 後端: `Dp004ViewSet` 改用 `DeepSaveMixinV2`，更新 `deep_save_config` (Detail key: `dp004a`)。移除 V1 特有 hook，改用 `pre_deep_save_hook` 處理 `serialno` 取號。
  - 前端: 修改 `Dp004Sheet.jsx`，將原本的單次 `bulk_save/` 改為透過 `Promise.all` 針對有異動的 Master 分別呼叫 `/api/dp004/deep_save/`，並在發送前將平坦陣列 `sizes` 轉換為 V2 的 `{ upsert, delete }` 格式 (或由後端 pre_save_hook 自動處理 `delete_excluded`)。並額外呼叫 `/api/dp004/bulk_delete/` 或迴圈 delete 來處理 `deletedMasterGkeys`。

### DP080 (樣品試版反饋意見中心)
* **Master**: Dp080, **Details**: Dp081 (opinions), Dp082 (measurements)
* **現況**:
  - 前端呼叫 `/api/dp080/deep_save/`，並傳送 `{ master, opinions: [...], measurements: [...] }` 平坦陣列。
  - 後端依賴 V1 的 `sync_mode: "delete_excluded"` 來處理明細刪除。
* **V2 升級策略**:
  - 後端: 改用 `DeepSaveMixinV2`，更新 `deep_save_config` (Detail keys: `dp081`, `dp082`)。
  - **Hook 轉換法 (前端零修改)**: 實作 `pre_deep_save_hook`。攔截平坦陣列 `opinions` 與 `measurements`，查詢資料庫並比對現有 gkey，自動計算出被排除的 gkey 作為 `delete` 陣列，並重組為 V2 的 `{ dp081: { upsert, delete }, dp082: { upsert, delete } }` 格式。這樣前端可以完全不需修改 payload 邏輯。

### DP100 (開發費用轉嫁單)
* **Master**: Dp100, **Detail**: Dp101 (details)
* **現況**:
  - 前端呼叫 `/api/dp100/deep_save/`，傳送 `{ master, details: [...] }` 平坦陣列。
  - 後端依賴 V1 的 `sync_mode: "delete_excluded"`。
* **V2 升級策略**:
  - 後端: 改用 `DeepSaveMixinV2`，更新 `deep_save_config` (Detail key: `dp101`)。
  - 採取與 DP080 相同的 **Hook 轉換法**，在 `pre_deep_save_hook` 中將 `details` 平坦陣列轉換為 V2 要求的 `{ upsert, delete }` 格式，實現無縫相容。

## 2. Validation / DataConstraint / Approval 判斷
* **DP004**: 不需要 DataConstraint (無 es101gkey)。不需要 Approval (無 confirms)。不需要 BillNo。不需要 ValidationMixin。
* **DP080**: 不套用 DataConstraint/Approval/BillNo。若 V1 未特別指定 Validation，則維持原樣。
* **DP100**: 不套用 DataConstraint/Approval/BillNo。

## 3. User Review Required
> [!IMPORTANT]
> 關於 DP004 的存檔問題：
> 目前前端 `Dp004Sheet.jsx` 呼叫 `bulk_save` 導致 `sizes` (尺碼對照明細) 無法被寫入資料庫。
> 為了讓 DP004 完全支援 V2 並修復此問題，我計畫在前端 `Dp004Sheet.jsx` 改寫 `handleSave`：
> 1. 將被刪除的 Master 呼叫 API 逐筆刪除 (或透過某個 bulk_delete 端點)。
> 2. 將新增與修改的 Master 逐筆組成 V2 payload `{ master, dp004a: { upsert: [...], delete: [...] } }`，利用 `Promise.all` 並發呼叫 `/api/dp004/deep_save/`。
> 請問是否同意以此方式修復 DP004？

## 4. Verification Plan
* 執行 `npm run build` 確認前端無語法錯誤。
* 執行 `npm run smoke:frontend` 確保所有基準作業不受影響。
* 撰寫並產出 `docs/analysis/dp004_dp080_dp100_v1_to_v2_upgrade_result.md` 報告。
