# Frontend Blank Screen Emergency Fix Report

## 1. 發現與分析 (Discovery & Analysis)
- **問題現象**：用戶反映全站前端開啟後呈現空白，且所有功能無法使用。
- **排查過程**：
  1. 使用 `npm run build` 確認前端專案可以正常編譯，排除語法或靜態 Import 錯誤。
  2. 啟動 `vite` 開發伺服器 (`npm run dev`)，確認 Login 頁面正常載入，且無全域 Router 崩潰。
  3. 建立並使用 `admin` 帳號進行登入與自動化測試 (Puppeteer)，發現當開啟任何使用 `RecordWorkbenchSheet` (例如 DP030) 的作業時，React 會發生 Fatal Error 導致元件樹卸載 (Blank Screen)。
- **核心錯誤訊息**：
  1. `ReferenceError: handleValuesChange is not defined` (發生在 `useRecordWorkbenchCrud.js`)
  2. `ReferenceError: Cannot access 'dynamicQueryParams' before initialization` (發生在 `ERPLookupField.jsx`)

## 2. 根本原因 (Root Cause)
1. **`useRecordWorkbenchCrud.js`**：在最近的開發階段 (Phase 7D) 中，`handleValuesChange` 邏輯被移出此 Hook 並搬到 `createRecordWorkbenchSheet.jsx`。然而，在 `useRecordWorkbenchCrud.js` 的 `useEffect` dependencies 中，仍殘留了 `handleValuesChange` 的變數參考。因為該變數在 Hook 內部已不存在，導致元件在 Render 階段即拋出 Reference Error 崩潰。由於所有標準化作業皆依賴此 Hook，導致全站功能癱瘓。
2. **`ERPLookupField.jsx`**：為了支援關聯查詢 (Cascading/dependsOn) 的進階功能，近期加入了 `dynamicQueryParams` 的邏輯。但在 `useMemo` 的 dependencies array 中，提前參照了尚未宣告的 `dynamicQueryParams` 常數，觸發了 ES6 的 Temporal Dead Zone (TDZ) 錯誤。這導致所有包含 ERP Lookup 欄位的表單都會在載入時當機。
3. **`Win32DataWindow.jsx` (第二輪發現)**：殘留了 `ReportModal` JSX 與其狀態變數 `reportModalVisible`，但卻沒有宣告對應的 `useState`，導致只要開啟任何基於 Pattern A (使用 `Win32DataWindow`) 的作業 (例如 BA001, BA015) 時，即全域崩潰拋出 `ReferenceError: reportModalVisible is not defined`。同時其 `queryParams` 參數錯誤地參照了未定義的 `searchForm`。

## 3. 修復方案 (Minimal Fixes Applied)
嚴格遵守「最小必要修復」與「不重構」原則，進行了以下修正：
- **Fix 1: `frontend/src/hooks/useRecordWorkbenchCrud.js`**
  - 從 `useEffect` 的 dependencies 陣列中移除未定義的 `handleValuesChange`。
  - 從 Hook 的回傳物件 (`return { ... }`) 中移除 `handleValuesChange` 的匯出。
- **Fix 2: `frontend/src/components/erp/lookup/ERPLookupField.jsx`**
  - 將 `dynamicQueryParams` 的參考從 `queryParamsMemo` 的 dependencies 陣列中移除。由於 `queryParamsMemo` 僅需負責靜態 `queryParams` prop 的快取，`finalQueryParams` 稍後會自動將動態參數合併進去，因此直接移除即可解決 TDZ 問題，且不影響原有邏輯。
- **Fix 3: `frontend/src/components/Win32DataWindow.jsx` (第二輪修復)**
  - 補齊遺失的 `reportModalVisible` 與 `reportDefaultAction` 的 `useState` 宣告。
  - 修復 `queryParams={searchForm.getFieldsValue()}` 的錯誤，將其替換為安全的空物件 `queryParams={{}}`，因為 Pattern A 沒有動態查詢表單。
  - 在 `handleGlobalCommand` 中補上 `action === 'print'` 的事件處理。
  - 經檢查，`ReportModal.jsx` 內部已針對 `reportConfig` 未定義的情況進行防呆 (`if (!reportConfig || !reportConfig.enabled) return null;`)，因此 optional-safe 安全。

## 4. 驗證結果 (Verification)
- 修正後重新執行自動化登入測試 (Puppeteer)。
- 模擬點擊並載入以下作業皆成功，且 Console 無任何 blocking error：
  1. BA001 (Pattern A) - 載入成功，未見 `reportModalVisible` 錯誤。
  2. BA015 (Pattern A) - 載入成功。
  3. DP030 (Pattern B / RecordWorkbench) - 載入成功。
  4. DP040 (Pattern B / RecordWorkbench) - 載入成功。
- 執行 `npm run build` 確認全部通過，無編譯阻斷錯誤。
- 頁面成功渲染出 Win32 桌面及表單 UI，全站前端恢復正常運作。

## 5. 後續建議
- 在未來的 Phase 開發中，對於全域底層元件 (如 Factory, Crud Hooks, Lookup Field, Win32DataWindow) 的修改，應在修改後開啟至少兩個不同模組的表單進行交叉測試。
- `App.jsx` 或 `ERPSheetPage` 可考慮加上 `<ErrorBoundary>`，確保單一分頁的崩潰不會導致整個 MDI 系統變成空白。
