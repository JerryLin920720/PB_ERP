# ERP Pattern B 客製作業規範 (ERP Pattern B Standard)

本文件定義了 Pattern B (客製化佈局 / Master-Detail / Form) 的開發規範。此模式適用於業務邏輯複雜、表頭與明細需要高度聯動、或含有特殊計算算力的作業。

---

## 1. 核心規範與設計哲學 (Core Philosophy)

> [!IMPORTANT]
> **保留邏輯，共用框架**
> *   Pattern B 畫面**允許保留特殊的業務邏輯與客製化算力元件**。
> *   但是，其**外層 Layout、Toolbar 事件整合、Lookup 彈窗機制與 CSS 樣式必須統一共用**，嚴禁各行其是。
> 
> **DP010 與 DP015 專屬規範**
> *   **禁止將 DP010 (楦頭管理) 與 DP015 (模具管理) 直接改造成配置驅動的 Win32DataWindow**。
> *   這兩個作業包含複雜的 Shoe Size Matrix（尺碼段 Pivot 矩陣計算）與二級關聯 Lookup Cascades（模具分攤級聯），必須維持 Pattern B 手寫 JSX。
> *   但其外層必須使用 `ERPSheetPage` 包裝，且必須改用全域的 `ERPLookupField` 與 `useMdiCrud` 進行狀態接管，禁止自行實作本地 CRUD 按鈕與自製查詢視窗。

---

## 2. 涵載作業明細 (Scanned Sheets)

目前系統中共有 26 個作業屬於 Pattern B 模式：

*   **BA 基本資料模組**：`Ba005` (公司法人設定), `Ba010` (客戶管理主檔), `Ba015BaseSheet`/`Ba015` (供應商工廠主檔), `Ba025` (專案設定), `Ba030` (業務流程), `Ba040` (銀行資料), `Ba060` (假別細部對照), `Ba061` (津貼設定), `Ba085` (鞋業尺碼增量)。
*   **DP 開發部門管理模組**：`Dp007`, `Dp010` (楦頭管理), `Dp015` (模具管理), `Dp020`, `Dp030`, `Dp032`, `Dp035`, `Dp040`, `Dp050`, `Dp055`, `Dp060`, `Dp065`, `Dp070`, `Dp080` (含 `Dp085` 路由), `Dp095`, `Dp100`。
*   **ES 人事模組**：`Es101` (人事管理卡)。

---

## 3. 標準佈局與狀態維護 (Layout & State Rules)

Pattern B 作業必須使用 `ERPSheetPage` 元件，並將主要內容包覆於二頁式 Tabs 結構中：

```
Tab 1: 查詢列表 (Tabpage 1)
  ├── 頂部 .erp-query-panel 條件查詢面板
  └── 中間 .erp-query-grid 標準 Antd Table 唯讀列表 (支援雙擊載入明細並切換 Tab 2)

Tab 2: 編輯維護面版 (Tabpage 2)
  ├── 上半部 .erp-editor-main 表頭區塊 (Antd Form，支援 Freeform 欄位)
  └── 下半部 .erp-detail-panel 子明細區塊 (Antd Table 搭配 .erp-detail-tabs)
```

### 3.1 狀態變數命名與模式標準
為了能無縫與 Hook 接軌，客製作業必須：
1.  統一使用狀態模式：`mode = 'view' | 'create' | 'edit'`。
2.  綁定狀態屬性：
    *   `activeRecord`：當前選取/編輯中的主檔 JSON。
    *   `sheetTabKey` ('1' | '2')：當前活動的 Tab Key。
    *   `subDetails` (Array / Object)：存放子明細的狀態。

### 3.2 淘汰手寫事件監聽 (Legacy vs Modern Toolbars)
*   ❌ **Legacy**：手寫 `window.addEventListener('mdi-global-command', ...)` 去接收 Toolbar 指令。
*   🟢 **Modern**：統一使用 **`useMdiCrud`** Hook。
```javascript
import { useMdiCrud } from '../hooks/useMdiCrud';
import ERPSheetPage from '../components/erp/ERPSheetPage';
import ERPLookupField from '../components/erp/lookup/ERPLookupField';

export default function Dp010Sheet() {
  const { mode, activeRecord, handleRetrieve, handleSave } = useMdiCrud({
    sheetId: 'dp010',
    apiUrl: 'dp010'
  });

  return (
    <ERPSheetPage sheetId="dp010" mode={mode}>
      <div className="erp-sheet-body">
        {/* 表頭欄位 disabled 邏輯一律根據 mode === 'view' 控制 */}
        <Form.Item name="customerno" label="客戶代號">
          <ERPLookupField type="customer" disabled={mode === 'view'} />
        </Form.Item>
      </div>
    </ERPSheetPage>
  );
}
```

---

## 4. 業務邏輯特殊處理 (Special Outliers Guideline)

對於像 `Dp010` 的尺碼計算、`Ba085` 的增量算法，開發者必須：
1.  將純計算邏輯抽離至獨立的 Utility function (如 `src/utils/shoeMath.js`)，禁止與 JSX UI 混雜。
2.  UI 組件僅負責調用算力並重繪網格，確保視圖與商業邏輯分離。
