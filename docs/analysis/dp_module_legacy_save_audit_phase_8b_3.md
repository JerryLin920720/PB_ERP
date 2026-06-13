# Phase 8B-3: DP 系列模組 Legacy Save / Custom Save 稽核報告

## 1. 稽核範圍與目標
本階段針對 DP 模組所有後端 `ViewSet` (`backend/api/modules/dp/views.py`) 與前端 (`frontend/src/views/Dp*.jsx`) 進行全面靜態分析，以盤點除了已完成標準化的 DP010 / DP025 / DP030 / DP040 之外，是否仍有殘存的非標準儲存行為。

## 2. DP 作業清單與現況矩陣

| 作業代碼 | 名稱 | Pattern 類型 | 目前儲存方式 | 已接 V2 | Legacy/Custom Save 狀態 | 建議處理方式 | 優先級 | 需改前端? | 需 Adapter? | 影響核心? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **DP015** | 大底基本資料 | B | `ModelViewSet` | ❌ | 存在 `legacy_deep_save`<br>且前端呼叫與後端端點不一致 (Broken) | 全面重構繼承 `DeepSaveMixinV2`，收攏端點 | **P0** | 是(端點) | 否 | 否 |
| **DP004** | 性別尺寸表 | B | `DeepSaveMixin` (V1) | ❌ | V1 `deep_save_config` 舊語法 | 升級繼承 `DeepSaveMixinV2` | **P1** | 否 | 否 | 否 |
| **DP080** | 楦頭尺寸表 | B | `DeepSaveMixin` (V1) | ❌ | V1 `deep_save_config` 舊語法 | 升級繼承 `DeepSaveMixinV2` | **P1** | 否 | 否 | 否 |
| **DP100** | 紙板資料 | B | `DeepSaveMixin` (V1) | ❌ | V1 `deep_save_config` 舊語法 | 升級繼承 `DeepSaveMixinV2` | **P1** | 否 | 否 | 否 |
| **DP031** | 樣品明細 (DP050) | Batch UI | `BaseDictionary` | ❌ | 存在 `batch_save` 處理 DP050 審核 | 可轉型為 V2 Custom Hook 或暫予保留 | **P2** | 否 | ✅ | 否 |
| **DP007** | 鞋種部位設定 | Pivot UI | `ModelViewSet` | ❌ | 存在 `sync_parts` 一鍵覆蓋 | 可轉型為 V2 Custom Hook 或暫予保留 | **P2** | 否 | ✅ | 否 |
| **DP030** | 樣品出貨單 | B | `DeepSaveMixinV2` | ✅ | 殘存 `legacy_deep_save` 作為備用 fallback | 可規劃於下階段移除 fallback 廢碼 | **P3** | 否 | 否 | 否 |
| **DP040** | 樣品出貨分配 | B | `DeepSaveMixinV2` | ✅ | 殘存 `legacy_deep_save` 作為備用 fallback | 可規劃於下階段移除 fallback 廢碼 | **P3** | 否 | 否 | 否 |
| **DP010** | 楦頭資料 | Matrix | `DeepSaveMixinV2` | ✅ | 已收編入 V2 Hook | 基準已完成 | Done | 否 | ✅ | 否 |
| **DP025** | 成型報價 | B | `DeepSaveMixinV2` | ✅ | 已完全消除 | 基準已完成 | Done | 否 | 否 | 否 |
| 其他 DP | 基礎字典/報表 | A / R | `BaseDictionary` | - | 無 | 維持現狀 (標準 API 或純查詢) | 無 | 否 | 否 | 否 |

---

## 3. 稽核發現詳細說明

### 🚨 發現一：DP015 處於高風險斷鏈狀態 (P0)
DP015 是典型 Pattern B (Master: Dp015, Details: Dp016, 017, 018)。目前它繼承自普通的 `viewsets.ModelViewSet` 並實作了 `@action(url_path='legacy_deep_save')`，內含 `transaction.atomic()` 與 Replace-all 邏輯。
但前端 `Dp015Sheet.jsx` (第 227 行) 呼叫的卻是 `${API_BASE}/dp015/deep_save/`，由於後端並未掛載 V1 或 V2 Mixin 提供 `deep_save` 路由，可能導致 404 錯誤。此處為最急需修復與 V2 標準化的目標。

### ⚠️ 發現二：DP004 / DP080 / DP100 仍使用 V1 (P1)
這些作業確實是 Pattern B，且過去曾經導入過早期的 `DeepSaveMixin` (V1)。它們的 `deep_save_config` 語法為舊版的 `{ "master": {...}, "details": {...} }`。由於 V2 的 API 簽章與配置格式已改變，需排程將這三支作業升級為 `DeepSaveMixinV2`，以確保整個系統底層完全統一。

### 📊 發現三：DP031 與 DP007 擁有特殊 Custom Save (P2)
* **DP031 (`batch_save`)**：被 DP050 (樣品單狀態審核) 用來批次更新狀態與數量。
* **DP007 (`sync_parts`)**：用於二維矩陣式的部位分配，全刪全建 (`bulk_create`) 關係表。
這兩支作業屬於 Special UI / Pivot UI，與傳統表單不同。雖然目前運作正常，但長期而言若要享有 `DataConstraint` 權限防護與事務一致性，建議未來透過 V2 外殼 + Adapter Hook 模式予以收編。

### 🛡️ 發現四：對 DP010 / DP025 / DP030 / DP040 之影響
* **DP010 實作** 由於採用了隔離的 `post_master_save_hook`，未改動底層與前端，**確認沒有帶來任何 Regression 風險**。
* **DP025** 已完美標準化。
* **DP030 / DP040** 的 `legacy_deep_save` 屬於前期試點所留下的「後路 (fallback)」，目前前端均已打向 V2 標準端點，這些 fallback 函式已可安全移除。

---

## 4. 下階段建議路線
1. **Phase 8B-3-1**: 執行 DP015 V2 標準化重構 (優先解決端點斷鏈問題)。
2. **Phase 8B-3-2**: 執行 DP004 / DP080 / DP100 升級 (將 V1 替換為 V2)。
3. **Phase 8B-3-3**: 清理 DP030 / DP040 廢棄的 `legacy_deep_save` 程式碼，宣告 DP 系列 DeepSave 底層全面標準化。
