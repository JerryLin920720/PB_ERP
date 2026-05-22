# ERP 前端 CSS 樣式規範 (ERP CSS Standard)

本文件定義了 ERP 系統前端的 CSS 撰寫規範，旨在根除目前的樣式碎片化現象，並確保系統具備全域主題（Theme）調整的能力。

---

## 1. 核心規範 (Core Rules)

> [!IMPORTANT]
> **嚴格禁止 Inline Style**
> *   禁止在 JSX 元素上編寫複雜的 inline styles（如 `style={{ width: '100%', padding: '12px 6px', margin: '4px 0px' }}`）。
> *   僅在計算動態寬度或高度（例如透過 Resizable 取得的動態像素）時，才允許使用 inline style 計算式。
> 
> **禁止內嵌 `<style>` 標籤**
> *   禁止在 `.jsx` 文件中直接撰寫內嵌的 `<style>` 標籤來覆寫樣式。
> *   所有視窗作業（Sheets）的排版樣式必須使用外部 CSS 檔案導入，或使用 CSS 模組（CSS Modules）。
> 
> **樣式檔案共用與引入**
> *   客製化表單（Pattern B）與網格（Pattern C）應統一導入全域 UI 提供的樣式（如對齊後之 `erp-sheet-*`）並包裝在 `ERPSheetPage` 元件內。

---

## 2. 系統 CSS 變數定義 (CSS Custom Properties)

全系統的配色與間距應對齊 `frontend/src/index.css` 與全域標準樣式中定義的 CSS 變數：

```css
:root {
  /* 品牌與狀態色 */
  --primary-color: #1890ff;       /* 主顏色 */
  --primary-hover: #40a9ff;       /* 主顏色 Hover */
  --success-color: #52c41a;       /* 成功狀態 */
  --warning-color: #faad14;       /* 警告狀態 */
  --error-color: #f5222d;         /* 錯誤/刪除狀態 */

  /* 3D PowerBuilder 經典浮雕邊框變數 */
  --win32-border-light: #ffffff;
  --win32-border-dark: #808080;
  --win32-border-shadow: #404040;
  --win32-face: #f0f0f0;          /* PB 底色 */

  /* 排版尺寸 */
  --font-size-base: 12px;         /* 全系統基底字型大小 */
  --border-radius-base: 0px;      /* 網格與輸入框圓角 (統一為 0) */
  --padding-small: 8px;           /* 緊湊間距 */
  --padding-base: 12px;           /* 標準間距 */
}
```

---

## 3. 共用樣式類與版面元件範例 (Usage Guidelines)

為了避免每個作業自創樣式類，所有手寫 JSX 作業（Pattern B/C）應採用下列標準 CSS Class：

### 3.1 外層佈局與邊框
1.  `.erp-sheet-page`
    *   全域標準頁面 wrapper。用於將整個作業畫面限制於主視窗高度內，並控制內邊距。
2.  `.pb-panel-3d`
    *   套用 PB 經典凹下浮雕樣式（類似 `Win32DataWindow` 的底層卡片）。

### 3.2 網格微調 (Ant Design Table Customization)
*   **禁止**自行撰寫 `.ant-table-row-selected td { background-color: #e6f7ff !important; }`，全域樣式已將選取顏色設定為標準選取樣式。
*   如果表格包含可編輯儲存格（Pattern C），必須為欄位或輸入項套用 `.erp-editable-cell` 類名，用以移除輸入框的外圍粗框線，並於 Focus 時維持標準黃色背景浮雕。

---

## 4. 淘汰的舊標準與過渡期類名 (Legacy / Transitional Styles)

> [!CAUTION]
> **以下舊有類名與結構已被標記為 Legacy 或 Transitional。**
> 僅允許遷移期間暫時存在，**禁止在新開發的作業中使用**：

*   ❌ `md-sheet-container` / `modern-sheet-container` (請改用 `ERPSheetPage` / `.erp-sheet-page`)
*   ❌ `md-sheet-header` / `sheet-modern-header` / `mdi-header` (請改用 `.erp-sheet-header`)
*   ❌ `md-sheet-title` (請改用 `.erp-sheet-title`)
*   ❌ `mdi-body` (請改用 `.erp-sheet-body`)
*   ❌ `dp010-premium-container` / `dp015-premium-container` (自訂容器)
*   ❌ 各作業內手寫的 `<style>{...}</style>` 與 inline styles
*   ❌ 各作業內手寫的本地 toolbar button 與自定義的 lookup modals

---

## 5. 程式碼規範範例 (Code Style Guide)

### 🔴 錯誤寫法 (Bad Practice)
```jsx
// 內含大量 inline-style 且有內嵌 style 標籤與自訂 Container 類名
export default function MySheet() {
  return (
    <div className="modern-sheet-container" style={{ padding: '12px', background: '#fff', display: 'flex' }}>
      <h3 style={{ fontSize: '14px', color: '#13c2c2', margin: '0 0 10px 0' }}>基本資料</h3>
      <Table style={{ marginTop: '8px' }} />
      <style>{`
        .ant-table-thead > tr > th { background: #fafafa !important; }
      `}</style>
    </div>
  );
}
```

### 🟢 正確寫法 (Good Practice)
```jsx
import React from 'react';
import ERPSheetPage from '../components/erp/ERPSheetPage';
import './MySheet.css'; // 只允許必要的局部覆寫

export default function MySheet() {
  return (
    <ERPSheetPage sheetId="ba005" sheetName="公司法人設定">
      <div className="erp-sheet-body">
        <h3 className="erp-form-section-title">基本資料</h3>
        <Table className="erp-query-grid" />
      </div>
    </ERPSheetPage>
  );
}
```
