# Phase 3B 實作完成報告：F2 Lookup 鍵盤觸發與基礎標準化

本文件記錄了 `framework_foundation_refactor_plan.md` 中 Phase 3B (F2 Lookup) 的實作結果與架構變更。

## 1. 實作摘要

本次階段將 PB 中經典的 F2 Lookup 操作體驗無縫移植到 React 框架中，並將底層回填邏輯與 Config-Driven 架構結合。使用者在任何相容的 `ERPLookupField` 中不僅可以下拉搜尋、點擊右側圖示開窗，現在更支援了 `F2` 快捷鍵直接開窗。此外，我們實作了 `returnFields` 多欄回填機制，支援從 `lookupRegistry` 或 `programRegistry` 動態取得配置，大幅簡化各個作業模組手動撰寫連動邏輯的負擔。

## 2. 修改了哪些檔案

- `frontend/src/components/erp/lookup/ERPLookupField.jsx` (新增 F2 事件、`returnFields` 自動回填、`readOnly` 判斷)
- `frontend/src/components/erp/lookup/ERPLookupModal.jsx` (支援從 Props 動態吃入 `lookupConfig`)
- `frontend/src/components/Win32DataWindow.jsx` (新增 `col.type === 'lookup'` 的支援與 `returnFields` 聯動邏輯)

## 3. ERPLookupField 如何支援 F2

在 `ERPLookupField` 中綁定了 `onInputKeyDown` 事件：
1. 先行判斷元件是否處於 `disabled` 或 `readOnly` 狀態，若是則直接阻擋。
2. 偵測鍵盤事件是否為 `F2` (或 `keyCode === 113`)。
3. 觸發 `e.preventDefault()` 避免觸發預設行為（如瀏覽器的幫助頁面），接著觸發 `handleOpenModal()` 將 `modalVisible` 設為 true 展開檢索對話框。
4. 原本的 `onDoubleClick` 與滑鼠點擊 Search Icon 開窗皆完整保留。

## 4. lookupRegistry 與 programRegistry 整合方式

在 `ERPLookupField` 與 `ERPLookupModal` 內部新增了 Config 優先權推算邏輯：
```javascript
const config = lookupConfig || lookupRegistry[type];
```
這允許開發者優先在 View 中傳入欄位專屬的 `lookupConfig`（例如透過 `programRegistry.lookupConfig`）。若未傳遞，則 fallback 至全域通用的 `lookupRegistry`。

## 5. returnFields 多欄回填方式

針對多欄回填 (`returnFields`) 實作了兩種支援路徑：
- **Pattern A (Grid 內)**：在 `Win32DataWindow` 的 `handleCellChange` 方法中，接收 `ERPLookupField` 傳回來的 `fullRecord`。若當前欄位配置帶有 `returnFields`（例如 `{ targetField: sourceField }`），則一併將 `fullRecord` 的值賦予該列的其他欄位，並更新至 `dirtyMap`。
- **Pattern A2 / B (Form 內)**：若在 `<ERPLookupField>` 傳入 `form={form}` 屬性與 `returnFields={{ ... }}`，當使用者選取資料時，元件內部會自動產生 `updates` 物件，並呼叫 `form.setFieldsValue(updates)` 達成聯動與髒點觸發。

## 6. Pattern A 測試結果預期

- **觸發開窗**：在 Grid 編輯狀態下，Focus 於 Lookup 欄位並按下 F2，正常彈出。
- **回填與髒點**：選定資料後，原本欄位更新，關聯欄位（如客戶名稱）同步回填。`Win32DataWindow` 的 `dirtyMap` 正確追蹤，上方 Navbar `Save` 按鈕亮起。

## 7. Pattern A2 測試結果預期

- **觸發開窗**：點擊上方 Grid 解鎖下方 Form 後，在 Lookup 表單欄位按 F2 可正常開啟。
- **回填與髒點**：配合 `form={form}`，選取資料後，其他唯讀的 `Input` 欄位會自動套用新值，且 Form 的 `onValuesChange` 觸發 `isDirty = true`，切換列前會跳出防呆提示。

## 8. Pattern B 測試結果預期

- **主明細連動**：Master 區塊中的 Lookup 行為同 A2；若 Detail 區塊使用 Pattern A 的 Grid，則行為同 A。
- **防呆卡控**：選取新資料導致變更後，隨意點擊左側的其他主檔紀錄，會被 Dirty Tracking 機制阻擋。

## 9. 錯誤處理說明

- **Config 缺失**：若找不到對應的 lookup 註冊檔，會自動 fallback 顯示 disabled 的 `<Select placeholder="檢索設定不存在..." />`，不會導致全域白畫面 Crash。
- **API 失敗**：開窗後若 `fetchData` 失敗，會吐出 Error Message 提示使用者，且 Table 會處於空資料狀態。
- **未選取確認**：在 Modal 中若未點選任何一列就點擊確認，會攔截並 `message.warning('請先選擇一筆資料！')`，不會清除原本欄位的值。
- **防止重複開窗**：使用 React 的 boolean state 綁定 `visible`，連按 F2 不會導致 Modal 多重實例化。

## 10. 尚未完成或需人工確認事項

1. **實際作業回填映射確認**：因系統中存在大量 PB `returnFields`，建議挑選 `ba015`, `dp030`, `mr030` 等關鍵作業，將舊有的 DataWindow 欄位映射關係搬移至前端的 config，進行人工驗證。
2. **Cascading Lookup (Phase 3C)**：有些開窗會依賴另一個欄位的值作為過濾條件（例如「部門開窗」依賴「目前選取的公司」）。下個階段需確保 `queryParams` 可以動態從 Form 或 Row 中獲取相依值。
