# ERP 全域工具列整合規範 (ERP Toolbar Standard)

本文件定義了 ERP 系統中頂部工具列（Navbar Toolbar）與各作業視窗（Sheets）之間的通訊標準、動作行為、以及狀態鎖定機制。

---

## 1. 核心規範 (Core Rules)

> [!IMPORTANT]
> **禁止自行實作 Toolbar**
> *   各作業畫面**禁止**在組件內手動繪製「檢索」、「新增」、「儲存」等操作按鈕。
> *   所有的功能按鈕統一由系統頂部 `Navbar` 工具列進行中央渲染。
> 
> **標準動作列表 (Standard Toolbar Actions)**
> 工具列僅支援以下 8 個標準動作：
> 1.  `retrieve` (檢索) - 重新載入資料或載入 F3 條件下的資料。
> 2.  `insert` (新增) - 在主表或單表上開立一筆新資料。
> 3.  `edit` (編輯) - 解除欄位鎖定，使當前資料可供修改。
> 4.  `delete` (刪除) - 刪除當前選取的項目。
> 5.  `save` (儲存) - 提交新增或修改的資料至後端。
> 6.  `cancel` (取消) - 放棄當前的修改，回復至唯讀模式。
> 7.  `export` (匯出) - 將當前網格資料匯出為 Excel 或 CSV。
> 8.  `print` (列印) - 叫用報表列印或 PDF 預覽。

---

## 2. 狀態鎖定模式 (Toolbar Mode State Machine)

為了確保資料編輯的一致性，作業畫面必須將狀態機統一為三種模式 (`mode = 'view' | 'create' | 'edit'`)，不要使用自創的多重布林開關。

各模式下的工具列按鈕可用狀態（Enabled / Disabled）對照表如下：

| Mode | retrieve | insert | edit | delete | save | cancel | export | print |
|---|---|---|---|---|---|---|---|---|
| **view** (檢索唯讀) | **enabled** | **enabled** | **enabled** | **enabled** | disabled | disabled | **enabled** | **enabled** |
| **create** (新增中) | disabled | disabled | disabled | disabled | **enabled** | **enabled** | disabled | disabled |
| **edit** (編輯中) | disabled | disabled | disabled | disabled | **enabled** | **enabled** | disabled | disabled |

### 模式狀態說明：
1.  **view**：頁面載入或剛點擊 `retrieve` 後的預設狀態。此時表單與輸入欄位為唯讀狀態。
2.  **create**：點擊 `insert` 動作解鎖並建立空白資料時進入的狀態。
3.  **edit**：選取既有資料點擊 `edit`（或雙擊解鎖）時進入的狀態。

---

## 3. 事件通訊機制 (Event Protocol)

Navbar 工具列與各 Sheet 作業之間採用全域 `mdi-global-command` 自訂事件進行廣播。

### 3.1 舊有監聽寫法 (Legacy Pattern)
> [!WARNING]
> 以下手動在視窗組件內寫 `window.addEventListener('mdi-global-command', ...)` 的作法屬於 **Legacy/Transitional**，僅作為現行程式碼相容過渡期使用。新開發或經重構後的 Pattern B 頁面**嚴禁**使用此寫法。
```javascript
// ❌ Legacy 監聽器寫法
useEffect(() => {
  const handleGlobalCommand = (e) => {
    const { action, targetSheet } = e.detail;
    if (targetSheet === 'ba010' && action === 'save') {
      handleSave();
    }
  };
  window.addEventListener('mdi-global-command', handleGlobalCommand);
  return () => window.removeEventListener('mdi-global-command', handleGlobalCommand);
}, [dataList]);
```

### 3.2 新標準：React Custom Hook (Modern Pattern)
新開發或重構之作業，必須統一使用全域的 **`useMdiCrud`** (Pattern B) 或 **`useBulkSave`** (Pattern C) 來進行 Navbar 通訊與狀態對齊，底層會自動接管事件綁定與生命週期。

#### Pattern B 使用 `useMdiCrud` 範例：
```javascript
import { useMdiCrud } from '../hooks/useMdiCrud';

const MyCustomSheet = () => {
  const { mode, activeRecord, handleRetrieve, handleSave } = useMdiCrud({
    sheetId: 'ba010',
    apiUrl: 'ba010',
    onRetrieveSuccess: (data) => console.log(data)
  });

  return (
    <ERPSheetPage sheetId="ba010" mode={mode}>
       {/* 頁面內容根據 mode 控制欄位 disabled */}
    </ERPSheetPage>
  );
};
```
