# Phase 1 & Phase 2 實作完成報告：全系統前端基礎框架重構

本文件記錄了根據 `framework_foundation_refactor_plan.md` 進行 Phase 1 與 Phase 2 實作的結果與變更範圍。

## 一、 已註冊的作業代號 (programRegistry.js)

已在 `programRegistry.js` 中的 `PROGRAM_REGISTRY` 正式加入以下作業代號，並為每個作業設定了其對應的 `toolbarConfig`、`pattern` 以及 `permissionConfig`：

- **BA 模組**：`ba001`, `ba010`, `ba015`, `ba045`, `ba060`
- **DP 模組**：`dp030`, `dp040`, `dp050`
- **MR 模組**：`mr002`, `mr010`, `mr030`, `mr035`, `mr105`
- **SA 模組**：`sa010`, `sa030`
- **SY 模組**：`sy004`, `sy005`

> **Note**: `dp040`, `mr010`, `mr030` 等作業已依據實作規劃被補齊於登錄表中，確保全系統在動態 Toolbar 上有一致的參照點。

## 二、 Navbar 核心機制翻新

`Navbar.jsx` 的 UI 層被保留，但其底層的按鈕邏輯已完全改為 **Config-Driven (配置驅動)**。

主要修改機制包含：
1. **動態讀取 Toolbar 配置**：利用 `isActionVisible` 與 `isActionEnabled` Helper 函數，透過目前作用中 Tab (`activeTabId`) 向 `programRegistry.js` 獲取對應的作業權限與配置。
2. **權限整合封裝**：於 `Navbar` 內部建立 `_checkPermission`，直接將舊有按鈕的 action 映射到 PB 的權限系統（例如 `save` 與 `cancel` 取決於 `edit` / `new` 權限；`approve` 對應到 `check` 權限等）。
3. **消除硬編碼**：移除了先前針對不同作業代號的硬編碼判斷（如 `if (programId === 'ba015')` 等），統一使用 `isActionVisible(programId, action)`。

## 三、 SHEET_STATE 與按鈕防呆連動機制

在 `programRegistry.js` 中實作了 100% 映射 PB `is_state` 的 `SHEET_STATE` Enum，並與 `stateActionMatrix` 結合：

```javascript
export const SHEET_STATE = {
  QUERY: 'QUERY',       // is_state '1'
  BROWSE: 'BROWSE',     // is_state '2'
  EDIT: 'EDIT',         // is_state '3'
  NEW: 'NEW',           // is_state '4'
  COPY: 'COPY',         // is_state '5'
  PREVIEW: 'PREVIEW',   // is_state '6'
  DELETING: 'DELETING'  // is_state '-1'
};
```

**防呆與狀態連動實作 (`isActionEnabled`)：**
- **狀態機檢查**：按鈕是否啟用，首先根據 `stateActionMatrix[sheetState]` 判斷當前作業狀態是否允許該動作（例如：`EDIT` 狀態下，`save` 允許，`insert` 禁用）。
- **審核防呆 (is_approved)**：如果當前選中的單據 (`selectedRecord`) 的 `is_approved === 'Y'`，強制禁用 `edit`、`delete`、`save`、`approve`，僅開放 `unapprove`（若有反審權限）。未審核單據則反之。
- **紀錄選取狀態**：如果未選取任何單據 (`selectedRecord === null`)，則強制禁用 `edit`、`delete`、`approve`、`unapprove`。

## 四、 Factory 的 Fallback 與狀態傳遞處理

為了讓 Navbar 能隨時感知目前作業視窗的狀態與選中的資料，在不破壞現有架構的情況下採用了「**事件驅動**」與「**Hook 封裝**」的最小改動方案：

1. **`App.jsx` 的狀態派發**：MDI 系統監聽 `mdi-sheet-state-change` 事件，並將收到的狀態整理成 `currentSheetState` 物件傳遞給 Navbar。已更新接收欄位，支援 `selectedRecord` 傳遞。
2. **`useSheetState` 更新**：原本的 `useSheetState` 被擴充，支援儲存並廣播 `selectedRecord` 狀態給 MDI。
3. **Pattern A (`Win32DataWindow`) 實作**：針對單檔維護，於 `createDataWindowSheet` 中為 `Win32DataWindow` 傳入 `enableSheetState={true}`，由內部的 `useSheetState` 全自動回報選中列 (`selectedRowIndex`) 與編輯狀態。
4. **Pattern B1 (`createMasterDetailSheet`) 實作**：使用 `useEffect` 監聽內部 `isDirty`, `isEditing` 以及 `selectedMaster` 的變化，並動態推算對應的 `SHEET_STATE` (`NEW` / `EDIT` / `BROWSE`)，透過 `CustomEvent` 廣播 `mdi-sheet-state-change` 進行回報。
5. **Pattern A2 (`createGridFormSheet`) 實作**：同樣加入 `useEffect` 監聽 GridForm 的選取列與編輯鎖，進行狀態回報。

此方案確保了即使某些客製化舊作業尚未套用最新 Hook，Navbar 依然能退回預設的 `BROWSE` 防呆處理，不會造成全域 Crash。

## 五、 下一步 Phase 3 待辦事項

在完成 UI 防呆與狀態機配置後，下一階段 (Phase 3) 將著重於「後端與機制補齊」：

1. **實作 Approve Lock (後端鎖單)**
   - 在 Django 中建立 `ApprovalMixin` 或覆寫對應 Model 的 `clean()` / `save()`。
   - 當 `is_approved == 'Y'` 時，後端全面阻擋 DELETE 與 UPDATE 請求，確保 API 安全，而不僅僅依賴 Navbar 的前端隱藏。
2. **實作 Dirty Tracking 提示**
   - 強化前端離開頁面或關閉 Tab 時的攔截。
   - 若 `isDirty === true`，透過全域 Modal 提示「尚有未儲存的變更，確定要離開嗎？」。
3. **F2 Lookup (開窗選單) 重構準備**
   - 規劃並實作通用的 F2 搜尋彈窗，取代各個作業內零散實作的 Modal 邏輯，並對接 `programRegistry.lookupConfig`。
