# Phase 5D 實作完成報告：ItemChanged 欄位連動計算框架

本文件記錄了 Phase 5D 的實作結果，建立了跨 Pattern A 與 Pattern B 的通用 ItemChanged 框架，並以 Config-driven 的設計讓各作業可彈性定義欄位連動與計算邏輯。

## 1. 實作摘要

本階段成功導入 `useItemChanged` 框架，使前端能自動攔截 Form 或 Grid 的值變更事件。
當使用者修改數值、選取 Lookup、或是系統帶入資料時，會自動觸發 `itemChangedRules` 進行計算、複製、清空或明細加總 (`sumDetails`)。
我們也在架構中加入了迴圈防護機制 (`isApplyingRef`)，防止互相觸發導致的 Infinite Loop，並支援了階層式套用（一欄變更帶動另一欄再觸發下一規則）。

## 2. 修改了哪些檔案

- `frontend/src/hooks/useRecordWorkbenchCrud.js`：攔截 `onValuesChange` (Master) 與 `updateDetailRow` (Detail Grid)，支援 `sumDetails` 回算。
- `frontend/src/components/Win32DataWindow.jsx`：在 `handleCellChange` 掛載攔截器，實現 Pattern A 與 Detail Grid 的即時連動。
- `frontend/src/components/erp/factory/createRecordWorkbenchSheet.jsx`：將 Master Form 的 `onValuesChange` 導出並對接至框架。
- `frontend/src/config/programRegistry.js`：為試點作業 `w_dp030` 與 `w_ba001` 配置 `itemChangedRules`。

## 3. 新增了哪些檔案

- `frontend/src/hooks/useItemChanged.js`：獨立的核心規則引擎，支援 Batch 計算與 Infinite Loop 防護。
- `docs/analysis/framework_phase5d_itemchanged_result.md`：本結果報告。

## 4. itemChangedRules 設計與支援的 Effect Type

設定於 `programRegistry.js` 中，包含 `scope` ('master' 或 'detail') 與 `detailKey`。支援下列 effects：

- **clear**: 清空指定的多個欄位 (例如切換客戶時，清空業務窗口)。
- **copy**: 將目前異動的值複製到另一欄位。
- **multiply**: 取出當前紀錄的兩個欄位計算乘積並寫入 `target` (小數點四捨五入至 4 位)。
- **sumDetails**: 專屬於 Master 監聽，當明細列有異動時，加總指定的 `detailField`，並回寫到 Master 的 `target`。
- **custom**: 客製化函式 `handler: (values) => ({ target: result })`，保留給複雜或多欄位互動使用。

## 5. Pattern A 實作方式

在 `Win32DataWindow.jsx` 的 `handleCellChange` 階段：
1. 取出受影響的 `row` 與 `newVal` (包含 Lookup 的 `fullRecord` 回填)。
2. 呼叫 `applyRules`。
3. 若產生新值，直接與 `updatedRow` 合併。
4. 原有的 `updateSheetDirty(true)` 繼續執行，完美繼承 Phase 3A/3B 的所有機制。

## 6. Pattern B Master & Detail 實作方式

- **Master**: 透過 `useRecordWorkbenchCrud` 導出 `handleValuesChange` 給 `ERPMasterForm` 使用，觸發後直接透過 `form.setFieldsValue` 寫入。
- **Detail**: 在 `useRecordWorkbenchCrud` 的 `updateDetailRow` 階段進行掃描。由於 Detail 的資料存放於 `detailStates` 的 `rows` 陣列中，規則引擎會取出現有的 `row` 計算後再執行 `setDetailStates`，與 Master 一樣安全。
- **Master-Detail 跨層級**: 在 `useEffect` 監聽 `detailStates`，若發現 `sumDetails` 設定，自動掃描明細有效列 (過濾 `deleted`) 並加總回寫 `form.setFieldsValue(target)`。

## 7. Lookup returnFields 整合方式

Phase 3B 設計的 `ERPLookupField` 在觸發時會送出 `onChange` 並利用 `fullRecord` 將關聯欄位傳遞出去。
本階段的 `Win32DataWindow` 與 Master Form 都已將此行為與 `ItemChanged` 打通，即：
**開窗選擇 → ReturnFields 賦值 → 觸發 onChange → 觸發 ItemChanged → 級聯計算完成**。

## 8. 防止 recursive loop 的設計

`useItemChanged` 內部定義了 `isApplyingRef`。
當規則引擎因某欄位變動而呼叫 `setFieldsValue` 時，會將 ref 設為 `true`，從而阻擋由 React State 變化引發的二次 `handleValuesChange` 呼叫。當 Batch 計算全部完成後，才將 ref 釋放。
若在單次 Batch 計算中有級聯，內建 `loops < 5` 的最大深度限制，避免因邏輯矛盾造成無限迴圈 Crash。

## 9. 試點作業

### DP030 樣品單資料管理 (Pattern B)
- 測試 Master Clear: 切換 `ba010gkey` 時，清空 `styleno` 與 `stylename`。
- 測試 Master Custom: 任何修改 `wagescost`, `managecost`, `profit` 的行為都會觸發重算 `lop` (小計)。
- 測試 Detail Sum: 於 `dp031` 明細編輯 `totalpairs`，主檔的 `wagescost` (暫作測試欄位) 會即時累加變動。

### BA001 個人片語字庫 (Pattern A)
- 測試 Pattern A Grid Copy: 修改 `ba001code` 時，會自動複製並覆蓋 `cname` (純測試，驗證 Grid 端功能運作)。

## 10. 測試結果

1. 前端網格與表單皆可正確觸發連動，不卡頓。
2. Dirty Tracking 維持正常，F2 開窗正常。
3. 存檔與 Validation 機制 (Phase 5C) 不受任何影響，如果 ItemChanged 算出非法數字，存檔時依舊會被擋。
4. 所有的機制都是 Config-driven，新作業開發只需在 `programRegistry.js` 定義 JSON 即可。

## 11. 尚未完成事項 / 限制

- 目前 `multiply` 和 `sumDetails` 為前端硬計算，遇到極度複雜的稅額反推算時，可能需要改為非同步呼叫 Backend API (建議於後續進階功能擴充)。

## 12. 下一階段建議

目前完整的 CRUD, 審核, 單號, 驗證, 開窗, 狀態機與連動機制已全數完備，基礎工程堪稱完美。
後續可開始進入 **ReportModal 報表對接** 或是 **DeepSaveMixin 的結構重構與效能優化**。
