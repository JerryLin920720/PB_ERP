# ERP 彈窗檢索元件規範 (ERP Lookup Standard)

本文件定義了 ERP 系統中各輸入表單的「雙擊檢索開窗 (Double-click Lookup Modal)」開發標準，藉此根除在多個頁面中重複撰寫 Modal 查詢與 API 請求的冗餘程式碼。

---

## 1. 核心規範 (Core Rules)

> [!IMPORTANT]
> **全域共用 Lookup 元件**
> *   **禁止**在各自訂作業畫面（Pattern B）手動實作獨立的 Lookup 查詢 Modal、載入 Lookup API 以及點選事件。
> *   全系統必須統一使用 **`ERPLookupField`** 與 **`ERPLookupModal`** 元件，並依賴 **`lookupRegistry`** 來動態配置不同的檢索對象。
> 
> **建議存放路徑**
> *   元件主體：`frontend/src/components/erp/lookup/ERPLookupField.jsx`
> *   彈窗容器：`frontend/src/components/erp/lookup/ERPLookupModal.jsx`
> *   設定檔註冊表：`frontend/src/components/erp/lookup/lookupRegistry.js`
> 
> **標準操作行為**
> *   **點擊/Focus**：輸入框呈唯讀狀態，右側顯示放大鏡圖示。
> *   **按 F2 或滑鼠雙擊 (Double-Click)**：自動彈出對應的 `ERPLookupModal` 查詢對話框。
> *   **對話框內部**：必須提供一組模糊篩選輸入框，以及具備分頁的唯讀 Table。雙擊資料列或點擊「確認」後自動帶回主表單，並關閉 Modal。

---

## 2. 元件設計規格 (Component Spec)

### 2.1 ERPLookupField 屬性 (Props)
*   `type` (string)：註冊於 `lookupRegistry` 中的字典型態（例如 `'customer'`, `'department'`）。
*   `value` (string)：綁定的 Gkey 或代碼值。
*   `onChange` (function)：點選完畢時的 callback，回傳選取物件。
*   `disabled` (boolean)：控制是否鎖定輸入，配合 `mode` 狀態使用。

### 2.2 lookupRegistry 註冊表配置範例
`lookupRegistry.js` 負責將類型對照到對應的 Django API 與 Table 欄位：
```javascript
export const lookupRegistry = {
  customer: {
    title: '客戶檢索開窗',
    apiUrl: 'ba010',
    columns: [
      { title: '客戶代號', dataIndex: 'customerno', width: '120px' },
      { title: '客戶名稱', dataIndex: 'cname' }
    ],
    searchFields: ['customerno', 'cname']
  },
  department: {
    title: '部門檢索開窗',
    apiUrl: 'ba045',
    columns: [
      { title: '部門代碼', dataIndex: 'serialno', width: '120px' },
      { title: '部門名稱', dataIndex: 'department' }
    ],
    searchFields: ['serialno', 'department']
  }
};
```

### 2.3 使用範例 (Form Integration)
```jsx
import ERPLookupField from '../components/erp/lookup/ERPLookupField';

// 在 Pattern B 畫面中的 Form.Item 整合
<Form.Item name="ba010gkey" label="主要客戶">
  <ERPLookupField 
    type="customer" 
    placeholder="雙擊選擇客戶..." 
    disabled={mode === 'view'} 
  />
</Form.Item>
```

---

## 3. 各類型開窗 API 對照與映射表

未來新增檢索型態時，必須統一註冊於 `lookupRegistry`：

| Lookup Type | 對應 Ba/Dp 模組 API | 對話框顯示欄位 | 帶回主表的值 |
|:---|:---|:---|:---|
| `customer` | `/api/ba010/` | 客戶代號 (`customerno`)、名稱 (`cname`) | `gkey` (主鍵)、`cname` (顯示) |
| `department`| `/api/ba045/` | 部門代碼 (`serialno`)、部門名稱 (`department`) | `gkey` (主鍵)、`department` |
| `currency` | `/api/ba020/` | 幣別代號 (`currencycode`)、名稱 (`cname`) | `currencycode` (主鍵) |
| `location` | `/api/ba004/` | 地點代碼 (`areacode`)、區域名稱 (`carea`) | `gkey` (主鍵)、`carea` |
| `mold` | `/api/dp015/` | 模具編號 (`moldno`)、模具名稱 | `gkey` (主鍵)、`moldno` |
| `last` | `/api/dp010/` | 楦頭編號 (`lastno`)、楦頭名稱 | `gkey` (主鍵)、`lastno` |

---

## 4. 淘汰的過渡期做法 (Legacy Pattern)
*   ❌ 各 Sheet 頁面手動編寫 Ant Design `Modal` 用以處理 Lookup 彈窗。
*   ❌ 各 Sheet 頁面各自使用 `axios.get` 對接查詢字典介面。
