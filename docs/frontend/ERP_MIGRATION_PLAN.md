# ERP 前端架構收攏與遷移計畫 (ERP Migration Plan)

本文件提供了將現行 53 個 ERP 前端作業畫面逐步重構、合併、並對齊新建立之 UI、CSS、Toolbar、Lookup 標準的遷移步驟指南。

---

## 1. 遷移終極目標 (The Ultimate Target)

1.  **全面採用 `ERPSheetPage`**：全系統 53 個畫面最外層統一包裝於 `ERPSheetPage` 中，並對齊新標的 `.erp-sheet-*` 樣式類。
2.  **根除自定義頁頭與工具列**：移除所有 Sheet 內部手寫的標題列（Header）與 CRUD 本地按鈕。
3.  **清除行內樣式與內嵌樣式**：消滅所有 `.jsx` 中的 inline styles 與 `<style>` 標籤，以標準 CSS 與 CSS Modules 取代。
4.  **共用開窗元件**：以 `ERPLookupField` 取代各作業手寫的檢索 Modal。

---

## 2. 核心原則與例外處理 (Exception & Constraints)

> [!WARNING]
> **DP010 與 DP015 遷移限制**
> *   **禁止將 DP010 (楦頭管理) 與 DP015 (模具管理) 直接改寫為配置驅動的 Win32DataWindow**。
> *   這兩個作業必須保留手寫 JSX（Pattern B），以支撐其專屬的尺碼矩陣細表 Pivot 計算與模具分攤算法。
> *   **但是**，DP010/DP015 必須完成外層包裝 `ERPSheetPage` 改造、使用 `useMdiCrud` 勾接全域 MDI 事件，並改用全域共用的 `ERPLookupField` 元件。

---

## 3. 三階段收攏執行計畫 (Phased Roadmap)

```
┌────────────────────────┐
│ 第一階段：樣式與外殼清洗 │ ──► 移除 header/style，導入 ERPSheetPage 包裝與 erp-sheet-* 樣式
└────────────────────────┘
            │
            ▼
┌────────────────────────┐
│ 第二階段：事件與狀態標準化│ ──► 導入 useMdiCrud 與 useBulkSave Hooks，移除手寫監聽器與本地按鈕
└────────────────────────┘
            │
            ▼
┌────────────────────────┐
│ 第三階段：共用組件遷移   │ ──► 將自定義 Modal 改為統一的 ERPLookupField 與 ERPLookupModal 元件
└────────────────────────┘
```

### Phase 1: 樣式與外殼清洗 (Layout & Wrapper Sanitation)
*   **目標**：讓所有作業頁面視覺對齊。
*   **步驟**：
    1.  移除頁面頂部的 `h4`, `h3`, `div.header` 等頁頭代碼。
    2.  將最外層的 `<div>` 取代為 `<ERPSheetPage>`，套用 `.erp-sheet-page` 標準類名。
    3.  建立 `css-audit` 分支，將 JSX 內的 `style={{...}}` 行內屬性抽離。

### Phase 2: 事件與狀態標準化 (Toolbar Hooks Migration)
*   **目標**：讓所有作業的 CRUD 操作行為完全受控於 Navbar 工具列，並統整為三種模式 (`mode = 'view' | 'create' | 'edit'`)。
*   **步驟**：
    1.  實作全域 Hook `useMdiCrud` (針對 Pattern B) 與 `useBulkSave` (針對 Pattern C)。
    2.  移除作業手寫的 `window.addEventListener('mdi-global-command', ...)` 監聽邏輯（此為 legacy 寫法）。
    3.  移除作業本機的「存檔」、「新增」等 Button。

### Phase 3: 共用組件遷移 (Shared Components Rollout)
*   **目標**：消滅自定義的查詢小視窗。
*   **步驟**：
    1.  開發全域 `ERPLookupField` 與 `ERPLookupModal` 元件，並設定 `lookupRegistry`。
    2.  掃描 Pattern B 作業中的客製 Modal，將其替換為 `<ERPLookupField type="..." />`。

---

## 4. 全作業收攏路徑表 (Sheet Migration Paths)

| 當前模式 | 涵蓋作業 | 收攏與遷移方案 |
|:---|:---|:---|
| **Pattern A** | `Ba009`, `Ba020`, `Ba045`, `Ba050`, `Ba055`, `Ba065`, `Ba070`, `Ba075`, `Ba080`, `Ba090`, `Ba091`, `Ba092` | 由於完全是配置驅動，僅需確保底層工廠 `createDictSheet` 外部套用 `ERPSheetPage`，即可一鍵完成 13 個作業的清洗。 |
| **Pattern A2**| `Ba001`, `Ba002`, `Ba003`, `Ba004`, `Dp023` | 1. 移除各 Sheet 自寫的外層標題。<br>2. 直接外層包裝 `ERPSheetPage`。<br>3. 將 `Win32DataWindow` 調整為填滿整個 `.erp-sheet-body`。 |
| **Pattern B** | `Ba005`, `Ba010`, `Ba015`, `Ba025`, `Ba030`, `Ba040`, `Ba060`, `Ba061`, `Ba085`, `Dp007`, `Dp010`, `Dp015`, `Dp020`, `Dp030`, `Dp032`, `Dp035`, `Dp040`, `Dp050`, `Dp055`, `Dp060`, `Dp065`, `Dp070`, `Dp080`, `Dp095`, `Dp100`, `Es101` | 1. 套用 `ERPSheetPage`。<br>2. 引入 `useMdiCrud` 統一處理 Navbar `mdi-global-command` 廣播並更新 `mode` 狀態。<br>3. 替換雙擊 Modal 查詢為共用 `ERPLookupField`。 |
| **Pattern C** | `Dp001`, `Dp002`, `Dp003`, `Dp004`, `Dp005`, `Dp006`, `Dp008`, `Dp009`, `Dp025` | 1. 套用 `ERPSheetPage`。<br>2. 移除行內樣式，改用統一的網格樣式類 `.erp-editable-cell`。<br>3. 引入 `useBulkSave` Hook 集中處理新增/修改/刪除陣列（`upsert` 與 `delete`）與提交動作。 |
