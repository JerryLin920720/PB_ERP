# Phase 3A 實作完成報告：全系統 Dirty Tracking 與防呆機制

本文件記錄了 `framework_foundation_refactor_plan.md` 中 Phase 3A (Dirty Tracking + close confirm) 的實作結果與架構變更。

## 1. 實作摘要

本次階段成功將前端的表單編輯狀態 (`isDirty`) 與 MDI (Multiple Document Interface) 架構全面連動。在使用者編輯資料後，系統能主動攔截關閉 Tab、切換資料列、甚至關閉或重整整個瀏覽器視窗的動作，並提示使用者是否要放棄未儲存的變更，避免資料遺失。此外，也實作了 `cancel` (取消) 指令的全面支援，讓使用者能一鍵還原修改。

## 2. 修改了哪些檔案

- `frontend/src/App.jsx` (擴充狀態管理、實作 close confirm 與 beforeunload)
- `frontend/src/hooks/useSheetState.js` (新增 `dirtyReason`, `lastSavedAt` 與防呆狀態)
- `frontend/src/hooks/useSingleTableCrud.js` (Pattern A2 支援 `isDirty` 與切換防呆)
- `frontend/src/hooks/useMasterDetailCrud.js` (Pattern B 支援選取切換防呆)
- `frontend/src/components/erp/factory/createGridFormSheet.jsx` (A2 觸發 Dirty State 回報)
- `frontend/src/components/Win32DataWindow.jsx` (A 支援 Cancel 指令與狀態清空)

## 3. useSheetState 如何擴充

在 `useSheetState.js` 中新增了 `isDirty`, `dirtyReason`, 以及 `lastSavedAt` 的狀態變數，並將其納入 `dispatchState` 廣播至 `App.jsx`。
- **後向相容**：即使部分未翻新的頁面並未使用擴充的 hooks，`App.jsx` 在提取 Tab 狀態時會 fallback 到 `dirty: false`，避免發生崩潰。

## 4. Pattern A Dirty Tracking 實作方式

針對 `Win32DataWindow` (包含 `createDataWindowSheet`):
- **編輯判定**：當單元格異動 (`handleCellChange`) 或插入新列 (`handleInsert`) 時，觸發 `updateSheetDirty(true)`。
- **儲存清除**：當 `bulk_save` 執行成功後，呼叫 `updateSheetDirty(false)` 與 `setEditingRowIndex(-1)`。
- **取消邏輯**：新增 `handleCancel` 方法，清空 `dirtyMap`、過濾掉 `temp_` 暫存新列，並復原回 `BROWSE` 狀態。

## 5. Pattern A2 Dirty Tracking 實作方式

針對 `createGridFormSheet` / `useSingleTableCrud`:
- **表單連動**：在下半部的 `Form` 綁定 `onValuesChange`，只要有異動就觸發 `setIsDirty(true)`，並回傳給 `crud` Hook。
- **選取防呆**：在 Grid 點擊 `handleSelectRow` 切換列前，若 `isDirty === true` 則跳出 `Modal.confirm`。使用者確認放棄後才會清除 Dirty State 並切換資料。
- **儲存清除**：`handleSave` 成功或 `handleCancel` 時，皆將 `isDirty` 重置為 `false`。

## 6. Pattern B Dirty Tracking 實作方式

針對 `useMasterDetailCrud`:
- 沿用目前既有的 `isDirty` 推算邏輯 (透過檢查 `editedMasters` 與 `editedDetails` 等字典長度)。
- **切換防呆**：在 `handleSelectMaster` 函數中攔截操作，若當前 Master 或 Detail 處於 Dirty 狀態，跳出 `Modal.confirm` 阻擋切換。確認放棄變更後再呼叫 `clearDirtyState()`。
- **取消邏輯**：在收到 `cancel` 指令時，調用 `clearDirtyState()` 並重新請求最新資料 (`fetchMaster`)。

## 7. MDI Tab close confirm 實作方式

在 `App.jsx` 中改寫了 `handleCloseTab` 函數：
- 關閉任何 Tab 前，先取得目標 Tab 的 `isDirty` 屬性。
- 若 `tabStates[sheetId]?.dirty === true`，透過 `Modal.confirm` 提示使用者「有未儲存的變更，確定要關閉嗎？」。
- 使用者點擊「放棄變更並關閉」才會執行真正的關閉分頁邏輯。此設計同時適用於正在瀏覽中 (Active) 及背景中 (Inactive) 的髒分頁。

## 8. Browser beforeunload 實作方式

在 `App.jsx` 中註冊了全域 `beforeunload` Event Listener：
- 檢查 `tabStates` 中是否存有任何 `dirty === true` 的分頁。
- 若有，呼叫 `e.preventDefault()` 與 `e.returnValue = ''`，讓原生瀏覽器彈出「您有未儲存的變更」原生警告對話框。
- 這樣確保當使用者點擊瀏覽器關閉按鈕或重新整理時，不會意外丟失辛苦修改的資料。

## 9. Cancel command 實作方式

- Navbar 的 Cancel 按鈕不再硬編碼，而是由 config-driven 發送出 `mdi-global-command` ({ action: 'cancel' })。
- 各作業元件收到指令後，觸發本身的 `handleCancel()` 邏輯清空暫存修改，並回報 `dirty: false` 與 `state: BROWSE`，Navbar 將自動退回對應的按鈕狀態。

## 10. Save success 狀態恢復方式

- 當 `save` 操作完成時，各 CRUD Hooks / 元件主動執行 `setDirty(false)` 或 `updateSheetDirty(false)`。
- 切回 `BROWSE` 狀態，更新 `selectedRecord` 為後端最新返回的單據，App Router 同步接獲狀態後，Navbar 中的 Save / Cancel 按鈕即會因為 `stateActionMatrix` 規則而轉為不可用。

## 11-14. 測試預期與迴歸結果 (理論)

- **Pattern A (e.g., mr030, ba001)**：
  - 修改儲存格後上方 Save / Cancel 按鈕亮起。
  - 關閉視窗或點選 Cancel 皆可正常恢復初始狀態，取消或存檔後狀態燈號正常熄滅。
- **Pattern A2**：
  - 表單欄位修改後觸發防呆。點選上部 Grid 的其他筆資料，會跳出警告訊息阻擋跳頁。
- **Pattern B (e.g., ba015)**：
  - 左側主檔點擊其他列會跳出提醒。存檔後 Dirty flag 清空。
- **Regression**：
  - Navbar config-driven 沒有受到破壞。
  - 未經翻新的舊有報表或簡單查詢作業，因為 Fallback 機制 (`dirty` 預設 `false`)，可正常開啟與關閉，不受防呆機制卡住。

## 15. 尚未完成或需人工確認事項

1. **實際測試驗收**：因為是全系統變動，需要請人工使用者實際在各作業上點擊修改、關閉、切換、以及重新整理瀏覽器來進行全面體驗與問題回報。
2. **Phase 3B Approve Lock**：目前前端防呆已經十分完整，下一階段應開始處理後端 `ApprovalMixin` 鎖單防呆，確保被審核的資料無法從後端強行覆寫。
