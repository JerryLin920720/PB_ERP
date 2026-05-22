# ERP 前端介面設計標準規範 (ERP UI Standard)

本文件定義了 ERP 系統前端作業畫面的介面設計標準，旨在建立一致的視覺體驗、對齊邊距、以及標準化版面佈局。

---

## 1. 核心規範 (Core Rules)

> [!IMPORTANT]
> **全系統共用包裝元件 (ERPSheetPage)**
> *   所有作業畫面未來必須共用 `ERPSheetPage` 元件作為最外層容器。
> *   禁止任何作業畫面自行撰寫外層 Container 或手動處理頁頭、頁首等版面。
> 
> **禁止自行實作 Header**
> *   所有作業畫面**禁止**在程式碼內自行撰寫頁面標題（Header）、功能說明或麵包屑導航。
> *   頁面標題、作業代號、麵包屑與狀態（檢索/編輯中）統一由 `ERPSheetPage` 搭配 `useMdiCrud` 自動解析呈現。
> 
> **禁止大量使用 Inline Style 與內嵌樣式**
> *   嚴格禁止在 JSX 元素上編寫複雜的 inline styles (`style={{...}}`)，避免覆寫全域排版規則及增加主題切換難度。
> *   組件內禁止使用 `<style>{...}</style>` 標籤，所有樣式必須寫入共用 CSS 檔案或 CSS 模組（CSS Modules）。
> *   禁止作業畫面自行撰寫 CRUD 按鈕工具列或自訂 Lookup 彈窗。

---

## 2. 標準畫面佈局結構 (Layout Structure)

全系統畫面統一採用 `ERPSheetPage` 元件作為標準容器：

```
┌────────────────────────────────────────────────────────┐
│ ERPSheetPage (最外層共用包裝，對應 .erp-sheet-page)         │
│ ┌────────────────────────────────────────────────────┐ │
│ │ HeaderArea (.erp-sheet-header)                     │ │
│ │ ├─ TitleArea (.erp-sheet-title-area)               │ │
│ │ │  ├── Breadcrumb (.erp-sheet-breadcrumb)          │ │
│ │ │  ├── SheetID & Title (.erp-sheet-id / -title)   │ │
│ │ │  └── ModeTag (.erp-sheet-mode-tag)               │ │
│ ├────────────────────────────────────────────────────┤ │
│ │ Body Area (.erp-sheet-body)                        │ │
│ │ ┌───────────────────┐ ┌──────────────────────────┐ │ │
│ │ │ 查詢列表 (Tabpage1) │ │ 編輯維護面版 (Tabpage2)    │ │ │
│ │ └───────────────────┘ └──────────────────────────┘ │ │
│ └────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

### 2.1 頁面容器與元件標準
1.  **外距與內距 (Padding & Margins)**
    *   頁面外層統一套用 `.erp-sheet-page`，標準內距由其管理。
    *   頁面必須具備 `overflow: hidden` 以防止瀏覽器雙滾動條現象。
2.  **表單元件排版標準**
    *   **欄位密度**：採用緊湊版面排版（Compact Layout），外層統一使用 `.erp-form`。
    *   **標籤 (Form Label)**：文字大小固定為 `12px`，顏色為 `#595959`，高度與行高固定為 `18px`，且 Label 與 Input 之間距不得大於 `2px`。
    *   **輸入框 (Input / Select / DatePicker)**：最小高度固定為 `28px`，外框角半徑 (`border-radius`) 統一為 `0` (維持經典 PowerBuilder 硬朗風格)，邊框顏色為 `#d9d9d9`。

---

## 3. 類名標準表 (Class Naming Standards)

### 3.1 新開發標準類名 (New Standard Classes)
所有作業畫面未來在實作時，必須嚴格採用以下新標準 class 命名：

| 類名 (Class Name) | 說明與用途 |
|:---|:---|
| `.erp-sheet-page` | `ERPSheetPage` 的最外層容器樣式。 |
| `.erp-sheet-header` | 作業畫面的頁頭區域。 |
| `.erp-sheet-title-area` | 頁頭內部的標題與元數據包裝區。 |
| `.erp-sheet-title` | 作業標題文字（例如：`幣別設定作業`）。 |
| `.erp-sheet-id` | 作業代號（例如：`ba020`）。 |
| `.erp-sheet-meta` | 其他頁頭元數據。 |
| `.erp-sheet-breadcrumb` | 頁頭麵包屑導航。 |
| `.erp-sheet-mode-tag` | 當前狀態模式標籤（如：`唯讀`、`編輯中`、`新增中`）。 |
| `.erp-sheet-body` | 作業主要的內容區域。 |
| `.erp-query-panel` | 檢索條件面板（原 `dw_where` 面板）。 |
| `.erp-query-grid` | 查詢結果表格容器。 |
| `.erp-editor-shell` | 編輯器外殼（用於 Master-Detail 結構）。 |
| `.erp-editor-sidebar` | 編輯器側邊欄（如左側列表，右側表單結構）。 |
| `.erp-editor-main` | 編輯器主表單區。 |
| `.erp-form` | 標準緊湊型 ERP 表單樣式。 |
| `.erp-form-section-title` | 表單內部子區塊的標題樣式。 |
| `.erp-detail-panel` | 明細網格容器。 |
| `.erp-detail-tabs` | 明細頁籤元件（通常包裹 Table）。 |
| `.erp-row-active` | Table 當前點選/活動列的背景樣式。 |
| `.erp-editable-cell` | 網格直接編輯儲存格樣式（Pattern C 使用）。 |

---

## 4. 淘汰的舊標準與過渡期類名 (Legacy / Transitional Styles)

> [!CAUTION]
> **以下舊有類名與結構已被標記為 Legacy 或 Transitional。**
> 僅允許遷移期間暫時存在以維持畫面不崩潰，**禁止在新開發的作業中使用**。未來將逐步清洗與替換。

*   ❌ `md-sheet-container` / `modern-sheet-container`
*   ❌ `md-sheet-header` / `sheet-modern-header` / `mdi-header`
*   ❌ `md-sheet-title`
*   ❌ `mdi-body`
*   ❌ `dp010-premium-container` / `dp015-premium-container` (作業專屬樣式包裝)
*   ❌ 各作業 Sheet 自己寫的內嵌 `<style>{...}</style>` 標籤
*   ❌ 各作業 Sheet 大量編寫的 inline style (`style={{...}}`)
*   ❌ 各作業 Sheet 自己寫的本地 CRUD toolbar button（如：本地「增行」、「存檔」按鈕）
*   ❌ 各作業 Sheet 自己實作的字典開窗與自定義查詢 Modal
