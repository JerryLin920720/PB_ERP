# ERP Pattern C 網格批次儲存規範 (ERP Pattern C Standard)

本文件定義了 Pattern C (Editable Grid-Only with Bulk Save / 網格直接編輯與批次存檔) 的開發規範。

---

## 1. 模式定義 (Overview)

Pattern C 適用於結構為單表、欄位數量中等，且使用者需要像操作 Excel 般在網格中**直接輸入、快速增刪多筆列資料**的作業。

### 1.1 核心流程
1.  **直接編輯**：表格儲存格內直接渲染編輯元件（如 Input、InputNumber），無須切換唯讀/編輯狀態。
2.  **變更暫存**：
    *   新增列：在記憶體中生成一個帶有 `temp_` 前綴 Gkey 的空白物件。
    *   修改列：直接更新本機 React 陣列狀態。
    *   刪除列：若刪除的是資料庫已存在的列，將其 Gkey 暫存至 `deletedGkeys` 陣列。
3.  **整批提交**：點擊 Navbar 的「儲存」按鈕時，整理所有異動資料，向後端的 `bulk_save/` API 發送一次性 POST 請求。

---

## 2. 涵蓋作業明細 (Scanned Sheets)

目前系統中共有 9 個作業採用 Pattern C 模式：

*   `Dp001Sheet.jsx` (開發樣品單維護)
*   `Dp002Sheet.jsx` (樣品進度狀態)
*   `Dp003Sheet.jsx` (鞋型類別配置)
*   `Dp004Sheet.jsx` (配色代號設定)
*   `Dp005Sheet.jsx` (材料分類代碼)
*   `Dp006Sheet.jsx` (供應商評等設定)
*   `Dp008Sheet.jsx` (楦頭類型管理)
*   `Dp009Sheet.jsx` (大底類型規格)
*   `Dp025Sheet.jsx` (開發進度追蹤) - *註：此為 Outlier，目前混用了 MD 舊佈局樣式，後續必須對齊新標準*。

---

## 3. 前端實作與狀態追蹤規範 (State Implementation)

### 3.1 新標準：`useBulkSave` Hook 接管
Pattern C 網格作業不應手動管理 dirty arrays 與 API 發送，必須統一使用 **`useBulkSave`** 自訂 Hook。

使用 `useBulkSave` 範例：
```javascript
import React from 'react';
import ERPSheetPage from '../components/erp/ERPSheetPage';
import { useBulkSave } from '../hooks/useBulkSave';

export default function Dp001Sheet() {
  const { dataSource, handleCellChange, handleAddRow, handleDeleteRow, mode } = useBulkSave({
    sheetId: 'dp001',
    apiUrl: 'dp001'
  });

  const columns = [
    {
      title: '樣品編號',
      dataIndex: 'sampleno',
      render: (value, record) => (
        <Input
          value={value}
          className="erp-editable-cell"
          onChange={(e) => handleCellChange(record.gkey, 'sampleno', e.target.value)}
        />
      )
    }
  ];

  return (
    <ERPSheetPage sheetId="dp001" mode={mode}>
      <div className="erp-sheet-body">
        <Table 
          dataSource={dataSource} 
          columns={columns} 
          className="erp-query-grid"
          pagination={false}
          rowKey="gkey"
        />
      </div>
    </ERPSheetPage>
  );
}
```

---

## 4. Bulk Save 統一 API 傳輸協定 (API Protocol)

當點擊工具列 Save 按鈕時，`useBulkSave` 內部會攔截廣播並調用 API 路由的 `bulk_save/` 端點。

### 4.1 資料庫 payload 包裝規格
```javascript
// 內部封裝的資料整理規格：
const payload = {
  upsert: upsertList, // 已過濾掉 temp_ 前綴 gkey 的待增修資料列表
  delete: deletedGkeys // 待刪除之 gkey 主鍵列表
};

// 提交 API：
// axios.post(`${API_URL}dp001/bulk_save/`, payload);
```
