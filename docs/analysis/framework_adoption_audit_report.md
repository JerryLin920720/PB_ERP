# Phase 8A: Framework Adoption Audit Report

## 1. Executive Summary
本報告執行了針對現有 ERP 系統內已開發之 BA (基本資料)、DP (開發)、MR (物料)、SA (業務) 等模組的底層框架採用度稽核。稽核結果顯示，雖然新一代的 Pattern A/B 與 DeepSaveMixinV2 等底層框架已趨於成熟（並成功應用於 BA015 及 DP030），但有**高達 80% 的既有作業**仍處於 Partial Legacy 或 High Risk Legacy 狀態，充斥著前端手刻存檔、手動 API 呼叫，及後端缺乏 Transaction / Validation 防護的舊版寫法。本報告確立了未來的框架推廣藍圖，以消弭技術債並保障全系統穩定。

## 2. 稽核範圍
* **前端 (Frontend)**：掃描 `frontend/src/views/` 下的所有 `Sheet.jsx`，檢查 `createDataWindowSheet`, `createRecordWorkbenchSheet`, `Win32DataWindow`, Validation, Report, ItemChanged 等特徵。
* **後端 (Backend)**：掃描 `backend/api/modules/*/views.py`，檢查 `ViewSet` 是否繼承 `DeepSaveMixinV2`, `ApprovalMixin`, `BillNoMixin`, `ValidationMixin`, `DataConstraint`，以及是否有手刻的 `deep_save` 或 `bulk_save`。
* **目標模組**：BA001, BA015, DP010, DP020, DP025, DP030, DP032, DP035, DP040, DP050, DP055, DP060, DP065, DP070, DP075, DP095, MR001, MR002, MR015, MR020, MR025, MR030, MR031。

## 3. 已完成底層框架摘要
目前可供套用的成熟底層組件包含：
- **Frontend Factory**: `createDataWindowSheet` (Pattern A), `createRecordWorkbenchSheet` (Pattern B), `createDictSheet`。
- **Frontend Capabilities**: `Dirty Tracking`, `F2 / Cascading Lookup`, `validationConfig`, `itemChangedRules`, `ReportModal`。
- **Backend Mixins**: `DeepSaveMixinV2`, `ValidationMixin`, `ApprovalMixin`, `BillNoMixin`, `DataConstraintFilterBackend`, `ReportMixin`。

## 4. Framework Adoption Matrix

| Module | Sheet / Component | Pattern | Frontend Factory | Backend Mixin | Validation | Hand-Written Risk | Overall Status | Action | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **BA015** | Ba015Sheet | Pattern B | Factory | DeepSaveV2, Valid | Yes | None | A. Fully Standardized | Keep as is | - |
| **DP030** | Dp030Sheet | Pattern B | Factory | DeepSaveV2, Appr, BillNo, DataConst | Yes | Legacy deep_save (deprecated) | A. Fully Standardized | Remove legacy later | P3 |
| **BA001** | Ba001Sheet | Pattern A | Win32DataWindow | None | No | None | B. Mostly Standardized | Adopt Factory A | P2 |
| **DP040** | Dp040Sheet | Pattern B | Manual | Valid, Appr, BillNo, DataConst | Yes | Manual Save, legacy deep_save | C. Partial Legacy | Migrate to DeepSaveV2 | P0 |
| **DP010** | Dp010Sheet | Custom | Manual | None | No | Manual Save, legacy deep_save | D. High Risk Legacy | Refactor to Pattern B | P1 |
| **DP025** | Dp025Sheet | Custom | Manual | None | No | Manual Save | D. High Risk Legacy | Refactor to Pattern B | P1 |
| **DP020** | Dp020Sheet | Pattern A | Manual | None | No | Manual Save | D. High Risk Legacy | Refactor to Factory A | P2 |
| **DP050** | Dp050Sheet | Pattern A | Manual | API Not Found | No | Manual Save | E. Not Found / Broken | Fix API & Factory | P1 |
| **DP055** | Dp055Sheet | Pattern A | Manual | None | No | Manual Save | D. High Risk Legacy | Refactor to Factory A | P2 |
| **DP095** | Dp095Sheet | Custom | Manual | None | No | Manual Save | D. High Risk Legacy | Refactor | P2 |
| **MR001** | Not Found | Unknown | None | None | No | Hand-written bulk_save | D. High Risk Legacy | Build Frontend | P1 |
| **MR015** | Not Found | Unknown | None | None | No | Hand-written bulk_save | D. High Risk Legacy | Build Frontend | P1 |
| **MR030** | Not Found | Pattern A | None | None | No | Hand-written bulk_save | D. High Risk Legacy | Build Frontend | P1 |

*(註：其餘如 DP032, DP035, DP060, MR002 等皆缺乏前端 Factory 與後端 Mixin，列為 Partial/High Risk Legacy。)*

## 5. Golden Sample 清單
1. **BA015**：仍是 Pattern B 及 `DeepSaveMixinV2` 的標準 Golden Sample。
2. **DP030**：作為 Complex Pattern B / Nested Detail (巢狀明細) 及多重 Mixin 的 Golden Sample。
3. **BA001**：作為 Pattern A 的前端 UI 展示基準（雖然後端未完全套用 Mixin，但 UI 已達標）。
4. **DP040**：跨表狀態聯動（SampleStatusService）但尚未完全 V2 化的過渡期參考作業。
5. **MR030**：後端已建構，未來可作為 Pattern A + 圖片/擴充欄位作業的開發參考。

## 6. Fully Standardized 作業清單
* **BA015**, **DP030**
* 已完全使用 Frontend Factory 及 Backend Mixin 進行全鏈路防護，無手刻風險。

## 7. Partial Legacy 作業清單
* **BA001**：前端使用了標準元件，但尚未轉移至 Factory，後端缺乏自動化驗證與聯動防護。
* **DP040**：前端擁有客製化報表與複雜邏輯，後端已掛載 Validation 等機制，但存檔依然是手刻的 `legacy_deep_save`。

## 8. High Risk Legacy 作業清單
* **DP010, DP025, DP020, DP050, DP055, DP095**：前端充斥 `handleSave()` 且自己組織 API Payload，無 Dirty Tracking，後端無 Transaction 防護或採用手刻巨大 `deep_save`，極易發生資料不一致或 N+1 問題。
* **MR 系列 (MR001, MR015, MR030)**：前端元件丟失或未標準化，後端大量使用 `bulk_save` 手工迴圈存檔。

## 9. 各模組待補清單
1. **需要補 ValidationConfig 的作業**：BA001, DP010, DP020, DP025 以及所有 MR 模組。
2. **需要補 ItemChangedRules 的作業**：DP010, DP025 (依賴關聯欄位帶出的作業)。
3. **需要補 ReportConfig 的作業**：目前僅 DP040 有私有實作，未來所有需要列印的作業皆須轉至標準 ReportConfig。
4. **需要補 ApprovalMixin / BillNoMixin 的作業**：DP010, DP025, MR 系列 (凡是牽涉單據審核與取號者)。
5. **需要補 DataConstraint 的作業**：所有 DP 及 MR 作業 (限制跨 Maker 存取)。
6. **需要從 hand-written deep_save 轉 DeepSaveMixinV2 的作業**：DP010, DP040。
7. **需要從 hand-written bulk_save 轉 DeepSaveMixinV2 的作業**：MR001, MR015, MR030。
8. **需要從 hand-written frontend state 轉 Factory 的作業**：BA001, DP010, DP020, DP025, DP040 等 90% 的現存作業。

## 10. P0 / P1 / P2 優先順序
* **P0 (Must Fix 核心風險)**：
  * **DP040**：作為 ERP 的出貨與庫存出入口，其手刻的 `legacy_deep_save` 且未納入 V2，具備極高資料損壞風險，需最優先套用 DeepSaveV2。
* **P1 (Core Module Refactor)**：
  * **DP010, DP025**：開發模組的上游源頭 (楦頭、型體)，目前均為手刻存檔，容易造成下游 DP030 引用異常。
  * **MR 模組全線前端重建**：基礎物料管理，影響成本計算。
* **P2 (General Debt)**：
  * **BA001, DP020, DP055**：單表或雙表字典維護，轉移至 Pattern A Factory，統一行為。

## 11. 建議修補路線圖
根據以上稽核，提出未來的推進策略：
1. **Phase 8B：P0 / P1 作業底層補齊**：優先將 DP040 及 DP010/DP025 轉換為 `createRecordWorkbenchSheet` 與 `DeepSaveMixinV2`。
2. **Phase 8C：AuditLogMixin 設計**：於底層補齊後，全面掛載操作歷程記錄 (Log) 機制。
3. **Phase 8D：DataConstraint DB 化**：將寫死的邏輯移至權限資料表動態控制。
4. **Phase 8E：Field-level Permission**：實作欄位級別的禁用與隱藏權限。
5. **Phase 8F：正式 Report Template Engine**：取代 PDF Stub。
6. **Phase 8G：Posting / Inventory / Cost Service Layer**：進階庫存與過帳過帳引擎建置。

## 12. 下一階段建議
強烈建議暫緩原定的 UI/UX 大翻新，改為執行 **Phase 8B (P0 / P1 作業底層補齊)**。如果在此時進行 UI 大翻新，我們將會在脆弱的高風險舊版程式上堆疊新畫面，導致未來轉換底層時發生嚴重衝突與浪費。應優先將 DP040 等核心作業推進至 Fully Standardized，再進行統一的 UI 升級。
