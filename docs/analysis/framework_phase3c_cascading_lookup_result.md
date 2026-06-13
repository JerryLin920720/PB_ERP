# Phase 3C 實作完成報告：Cascading Lookup (連動式開窗) 初版

本文件記錄了 `framework_foundation_refactor_plan.md` 中 Phase 3C (Cascading Lookup) 的實作結果與架構變更。

## 1. 實作摘要

本次階段成功將 PB 系統中經典的 **連動式開窗 (Cascading Lookup)** 行為移植到 React 前端框架中。藉由擴充 `lookupConfig` 的 `dependsOn` 設定，`ERPLookupField` 可以自動感知目前的表單 (Form) 或資料列 (Grid Row) 的上下文，動態擷取依賴的欄位值，並將其轉換為 `dynamicQueryParams` 送給後端 API 過濾資料。
同時，我們加入了嚴格的 `required` 防呆機制：若依賴的前置欄位尚未填寫（例如：未選擇客戶就想挑選聯絡人），系統將主動阻擋開窗並提示使用者，避免查詢錯誤或引發非預期的 Crash。

## 2. 修改了哪些檔案

- `frontend/src/components/erp/lookup/ERPLookupField.jsx` (實作 `dependsOn` 解析與 `dynamicQueryParams` 產生)
- `frontend/src/components/erp/lookup/ERPLookupModal.jsx` (接收動態查詢參數並傳遞給 axios)
- `frontend/src/components/Win32DataWindow.jsx` (將 `contextValues={row}` 綁定給 Lookup 欄位)
- `frontend/src/components/erp/lookup/lookupRegistry.js` (新增 `ba014` 與 `ba019` 連動開窗範例設定)

## 3. lookupConfig dependsOn 設計

在 `lookupRegistry` (或傳入的 `lookupConfig`) 中支援陣列格式的 `dependsOn`：
```javascript
dependsOn: [
  {
    sourceField: 'ba010gkey', // 上下文資料來源的欄位名稱 (例如客戶 ID)
    queryParam: 'ba010gkey',  // 傳遞給後端 API 的 Query String 參數名
    required: true,           // 若缺少此值是否阻擋開窗
    message: '請先選擇客戶'    // 防呆觸發時顯示的警告訊息
  }
]
```

## 4. dynamicQueryParams 如何產生

在 `ERPLookupField` 中新增 `getDynamicQueryParams()` 邏輯：
1. 若設定檔中存在 `dependsOn`，則輪詢每一個依賴條件。
2. 取值順序：優先從 `contextValues[sourceField]` (通常是 Grid 的 `rowRecord`) 讀取；若無，則向 `form.getFieldValue(sourceField)` 嘗試讀取。
3. 若取值成功，將其推入 `dynamicParams` 物件；若值不存在且 `required: true`，記錄 `missingRequired` 錯誤。
4. 最後透過 `useMemo` 將靜態的 `queryParams` 與動態產出的 `dynamicQueryParams` 合併為 `finalQueryParams`，確保動態參數優先權最高，並傳給 `fetchOptions` 與 `ERPLookupModal`。

## 5. ERPLookupField 修改說明

- 傳入新 Props：`contextValues` (供 Pattern A Grid Row 傳入)。
- 新增攔截：在 `handleOpenModal` 與 `fetchOptions` 前，若 `missingRequired` 存在，則呼叫 `message.warning()` 並強制 `return`，阻擋下拉選單載入或 Modal 開啟。
- 狀態快取重置：`useEffect` 依賴陣列中加入了 `JSON.stringify(dynamicQueryParams)`，當依賴欄位的值變更時，自動清空並重整 Lookup 的下拉選項快取。

## 6. ERPLookupModal 修改說明

- 修改了 Props 接收，將原本傳入的靜態 `queryParams` 改為接收合併後的 `finalQueryParams`。
- 在 `axios.get` 的 `params` 中帶入新的條件，達成開窗時的後端精準過濾。

## 7. Pattern A 測試預期

- **場景**：在 `Win32DataWindow` 中編輯「聯絡人」(`ba014`) 欄位。
- **結果**：因 `Win32DataWindow` 已將 `row` 傳遞給 `contextValues`，當該列的客戶 (`ba010gkey`) 為空時按 F2 或點擊開窗，跳出「請先選擇客戶」提示；當客戶有值時，正常彈出僅包含該客戶聯絡人的 Modal。

## 8. Pattern A2 測試預期

- **場景**：在下方 Form 區塊編輯「聯絡人」。
- **結果**：因使用 `createGridFormSheet` 的 Form 傳入了 `form={form}` 到 `ERPLookupField`，所以能夠透過 `form.getFieldValue('ba010gkey')` 獲取客戶 ID，達成同上的防呆與過濾效果。

## 9. Pattern B 測試預期

- **Master 區塊**：同 Pattern A2，依賴 `form`。
- **Detail 區塊**：同 Pattern A，依賴 `contextValues`。
- **跨區塊連動**：由於 `form` 在整個元件層級都可被獲取，若 Detail Grid 中的 Lookup 需要 Master Form 的值，只要將 `form` 或 `selectedMaster` 作為 `contextValues` 傳入即可無縫達成跨層級連動。

## 10. 防呆與迴歸測試

- **required 欄位防呆測試**：若未填依賴欄位，成功阻擋並顯示自訂的 `message`，不會引發 API Error 或 Crash，也不會清空當下欄位值。
- **Dirty Tracking 整合測試**：Cascading Lookup 開窗與回填完成後，`onChange` 正確觸發，原有的 `isDirty` 機制正常捕捉變化，`App.jsx` 的防呆機制完美銜接。
- **非 Cascading Lookup 迴歸測試**：未設定 `dependsOn` 的通用開窗（如季節 BA055、大底 DP015）運作如常，因為 `dynamicQueryParams` 將回傳空物件，直接 Fallback 至舊有行為，完全向後相容。

## 11. 尚未完成或需人工確認事項

1. **後端 API 過濾支援確認**：雖然前端已經能正確發送類似 `?ba010gkey=XXX` 的 API 請求，但需要確認對應的 Django API（如 `BA014ViewSet`）是否有實作 `filter_backends` (例如 `DjangoFilterBackend`)，並將 `ba010gkey` 放入 `filterset_fields` 中。若後端未支援，過濾將會無效。
2. **多重依賴實作優化**：目前的初版架構已支援陣列格式的多重依賴。未來若有更複雜的 AND/OR 條件邏輯，可擴充 `dependsOn` 的結構設計。
