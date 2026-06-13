# Framework 健全度稽核與缺口分析報告 (Framework Gap Audit)

## 1. 總覽

本報告盤點了目前 ERP 重構專案中前後端共用底層模組的健全度，比對程式實際實作與現有文件，標示出已完成、半完成與尚未完成的能力，並整理出高風險缺口及未來補強順序，以實現「未來要避免每支作業一直補底層」的核心目標。

## 2. 後端底層能力盤點

| 後端能力項目 | 說明與狀態 | 評估 |
| :--- | :--- | :--- |
| **AuditFieldsMixin** | 提供 `createuser`, `createdate`, `modifyuser`, `modifydate` 自動注入 | ✅ 已完成 |
| **BulkSaveMixin** | 支援 Pattern A/A2 單檔與多筆異動之 Transactional 儲存 | ✅ 已完成 |
| **DeepSaveMixin** | 第一代 Master-Detail 儲存引擎 | ⚠️ 半完成 (將被 V2 取代) |
| **DeepSaveMixinV2** | 支援巢狀明細、`upsert_delete`、`wipe_and_recreate` 等複雜情境及精準 Hook 攔截 | ✅ 已完成 (於 DP030 試點成功) |
| **ApprovalMixin** | 提供標準審核 / 反審核流程及防呆阻擋 (Approve Lock) | ✅ 已完成 |
| **PermissionMixin / program_id 機制** | 支援 `sys_constraint` 進行列級與動作 (check/uncheck 等) 權限對應 | ⚠️ 半完成 (目前僅於 `data_constraint.py` 硬編碼) |
| **Transaction Atomicity** | 於 `BulkSaveMixin` 與 `DeepSaveMixinV2` 皆強制使用 `transaction.atomic()` | ✅ 已完成 |
| **明細刪除同步 / 自動排序** | 支援手動與自動 `serialno` 取號，支援 Hard Delete 同步 | ✅ 已完成 |
| **狀態回灌 / Recalculation Hook** | 提供 `post_deep_save_hook` 讓 Service 層可回扣數量與狀態 (如 `SampleStatusService`) | ✅ 已完成 |
| **Excel Export / PDF Preview** | `ReportMixin` 提供基本的 PDF 與 Excel 生成，但缺乏精美樣板處理 | ⚠️ 半完成 |
| **F2 Lookup API / 查詢對應** | 支援動態查詢、Cascading 條件對接 | ✅ 已完成 |

## 3. 前端底層能力盤點

| 前端能力項目 | 說明與狀態 | 評估 |
| :--- | :--- | :--- |
| **Pattern A 單表 CRUD** | `Win32DataWindow` 單檔操作、髒點追蹤與即時 Validation | ✅ 已完成 |
| **Pattern A2 上列表下編輯** | `useSingleTableCrud.js` 處理單檔與 GridForm 連動 | ✅ 已完成 |
| **Pattern B 工作台** | `createRecordWorkbenchSheet` 提供 Master-Detail 共用佈局 | ⚠️ 半完成 (大型作業如 DP030 仍手刻) |
| **MDI Global Command / Toolbar** | `Navbar.jsx` 與 `SHEET_STATE` 狀態機，精確控制按鈕狀態 | ✅ 已完成 |
| **Route Guard / 權限控制** | `programRegistry` 與按鈕顯示控制對接 | ✅ 已完成 |
| **F2 Lookup 開窗** | `ERPLookupField` 支援 Master 與 Detail Grid，並提供 `returnFields` 回填 | ✅ 已完成 |
| **前端 Validation 與後端對接** | 整合 `validationConfig` 支援必填及網格驗證 | ✅ 已完成 |
| **Excel 匯出 / PDF 列印入口** | 提供 `ReportModal.jsx` | ⚠️ 半完成 (手動掛載殘留，非全自動化) |
| **高密度表格 / Scroll 處理** | `Win32DataWindow` 支援高效能網格渲染 | ✅ 已完成 |

## 4. 文件與程式不一致處 (Inconsistencies)

1. **DP030 狀態矛盾**：`dp030_deepsave_v2_trial_result.md` 宣稱 DP030 樣品系統重構實質完成且「前端完全零修改」；但 `dp030_ultimate_decomposition_plan.md` 明確指出其前端仍為「高度手刻的巨型組件 (未用 Factory)」。這表示 **後端底層已強壯，但前端的標準化 Factory 尚未套用到巨型作業上**。
2. **權限設定資料庫化**：文件中宣稱有 `sys_constraint` 權限對應，但實際分析程式發現 `data_constraint.py` 目前仍以 **硬編碼 (Hard-coded)** 方式執行，尚未做到真正與資料庫動態連動。
3. **報表渲染器能力**：文件提及 Report / Export 已試點通過，但實際 `ReportModal` 與 `ReportMixin` 非常陽春，**宣稱已有報表能力，但實務上難以應付複雜排版**。

## 5. 高風險缺口與未完成能力

| 缺口類型 | 描述 | 風險等級 |
| :--- | :--- | :--- |
| **前端巨型作業標準化缺口** | 大型作業 (如 DP030, DP040) 的前端元件仍為手刻，無法享受 Config-driven 帶來的全局維護性。 | 🔴 Critical |
| **進階權限控管機制** | 缺少從 DB 讀取 `sys_constraint` 及按鈕層級/欄位層級 (Field-level) 權限控制。 | 🟠 High |
| **報表樣板渲染引擎** | PDF 與 Excel 的排版與動態欄位產出不足，未形成強大的共用報表列印引擎。 | 🟠 High |
| **進階複雜元件支援** | Pattern D (聯鎖雙 Grid、特殊批次處理) 完全尚未規範與實作。 | 🟡 Medium |
| **Service Layer 抽離不足** | 過帳 (Posting)、庫存盤點與成本運算的 Service 層結構尚未完全定型。 | 🟡 Medium |

## 6. 優先補強順序與建議下一階段計畫

為避免未來每開發一支作業就需要擴充底層，建議優先補強以下項目：

1. **[第一優先] 大型作業前端 Factory 化 (Phase 1)**：強制作業如 DP030 完全轉換至 `createRecordWorkbenchSheet`，驗證前端 Pattern B 的極限擴充性。
2. **[第二優先] 權限引擎 DB 化與欄位級權限 (Phase 2)**：完成 `sys_constraint` 的管理後台與動態載入，取代硬編碼。
3. **[第三優先] 報表與匯出引擎重構 (Phase 3)**：實作正規的 Template Renderer，並把 `ReportModal` 整合進 Toolbar 全域指令。
4. **[第四優先] 建立 Pattern D 規範 (Phase 4)**：針對跨模組批次處理（例如 DP040 出貨影響 DP030）與聯鎖雙 Grid 建立規範。
5. **[第五優先] 建立業務邏輯 Service 標準 (Phase 5)**：為過帳、庫存等大型計算建立可複用的 Hook 與 Service 樣板。
