# ERP Pattern A / A2 開發規範 (ERP Pattern A & A2 Standard)

本文件定義了 Pattern A (Factory-Driven 配置驅動) 與 Pattern A2 (直調 Win32DataWindow 引擎) 的開發規範與架構原則。

---

## 1. 模式定義 (Overview)

### Pattern A: Factory-Driven Dict Sheet (設定檔驅動字典作業)
*   **用途**：適用於資料結構簡單、屬於單表（Single Table）或主檔字典 CRUD 的維護作業（如：國家設定、職稱設定、部門設定等）。
*   **特性**：開發者**不需要編寫任何 JSX 佈局**，只需要提供一個宣告式的設定檔（JSON/JS），並將其傳入 `createDictSheet` 工廠函數。工廠將自動將渲染內容包裝至全域的 `ERPSheetPage` 元件中。

### Pattern A2: Direct Win32DataWindow Sheet (手動封裝 DataWindow 作業)
*   **用途**：適用於結構仍為單表，但頁面頂部或外圍需要加入額外自訂 JSX（如特定的麵包屑、靜態說明卡、或特定的條件式查詢框）的作業。
*   **特性**：手動渲染 `<Win32DataWindow>` 組件，外層必須使用 `ERPSheetPage` 包裝，並配合標準 `.erp-sheet-body` 控制排版。

---

## 2. 涵蓋作業明細 (Scanned Sheets)

### 2.1 Pattern A 涵蓋作業 (13 個)
*   `Ba009Sheet.jsx` (職位職稱設定)
*   `Ba020Sheet.jsx` (計價幣別設定)
*   `Ba045Sheet.jsx` (公司部門設定)
*   `Ba050Sheet.jsx` (職稱等級對照)
*   `Ba055Sheet.jsx` (學歷層級設定)
*   `Ba065Sheet.jsx` (人事狀態設定)
*   `Ba070Sheet.jsx` (假別分類設定)
*   `Ba075Sheet.jsx` (銀行分類設定)
*   `Ba080Sheet.jsx` (工作地點設定)
*   `Ba090Sheet.jsx` (機台類別設定)
*   `Ba091Sheet.jsx` (模具狀態設定)
*   `Ba092Sheet.jsx` (尺寸代碼規格)
*   `createDictSheet.jsx` (工廠引擎原始碼)

### 2.2 Pattern A2 涵蓋作業 (5 個)
*   `Ba001Sheet.jsx` (集團組織架構)
*   `Ba002Sheet.jsx` (國家代碼設定)
*   `Ba003Sheet.jsx` (地區與工作據點)
*   `Ba004Sheet.jsx` (辦事處區域代碼)
*   `Dp023Sheet.jsx` (大底模具明細) - *註：此作業目前混用了舊有 CSS，後續遷移必須套用 `.erp-sheet-page` 標準*。

---

## 3. Pattern A 開發實例與欄位規範 (Config Schema)

Pattern A 作業只需導出一個由 `createDictSheet` 生成的 React 元件。欄位型態必須對齊 Win32 屬性：

```javascript
import createDictSheet from './createDictSheet';

export default createDictSheet({
  // 1. 指定 Django REST API 端點
  apiUrl: 'ba020', // 將對應 http://localhost:8001/api/ba020/

  // 2. 指定視窗名稱 (用於防呆與 Navbar MDI 通訊定位)
  sheetName: '幣別設定作業 (ba020)',

  // 3. 定義 DataWindow 網格結構
  columns: [
    {
      title: '幣別代號',
      dataIndex: 'currencycode',
      width: '100px',
      editable: true,
      rules: [{ required: true, message: '請輸入幣別代號！' }]
    },
    {
      title: '貨幣名稱',
      dataIndex: 'cname',
      width: '150px',
      editable: true,
      rules: [{ required: true, message: '請輸入中文名稱！' }]
    },
    {
      title: '英文名稱',
      dataIndex: 'ename',
      width: '150px',
      editable: true
    },
    {
      title: '匯率精度',
      dataIndex: 'precision_decimals',
      width: '80px',
      type: 'number', // 支援 'number', 'string', 'date', 'select'
      editable: true
    }
  ]
});
```

---

## 4. Win32DataWindow 內建核心邏輯

`Win32DataWindow` 元件內部實作了全套的行為：
1.  **MDI 事件與狀態綁定**：自動與全域 Navbar 的動作對接，並配合模式（`mode = 'view' | 'create' | 'edit'`）控制欄位讀寫。
2.  **雙擊編輯鎖**：在 `view` 模式下表格唯讀，收到工具列 `edit` 指令後，表格轉為編輯狀態並切換 `mode`。
3.  **異動追蹤 (Dirty States Tracking)**：新增行標示為 `temp_` 臨時主鍵；修改行儲存於 `dirtyRows`；刪除行放進 `deletedGkeys`；點擊存檔時分流發送 `axios.post`、`axios.put` 與 `axios.delete`。
