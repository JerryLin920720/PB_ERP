# ERP Frontend V2 Views 開發指引

本目錄存放所有符合 V2 新開發框架規範的 Sheet 作業。所有新開發與重構後的作業必須遵循以下架構原則，以確保代碼收斂與風格一致。

---

## 1. 核心原則與步驟

在著手開發任何新 V2 Sheet 之前，必須完成以下判斷與設計：
1. **判定 Sheet 類型 (Sheet Type)**：
   * **SingleTableSheet**：單表維護，優先套用 [createDataWindowSheet.jsx](file:///Users/linjerry/Documents/youngnet/PB_ERP/pb_erp_system/frontend/src/components/erp/factory/createDataWindowSheet.jsx)。
   * **MasterDetailSheet**：單主檔單明細（上主下從），套用 `createMasterDetailSheet` 與 [useMasterDetailCrud.js](file:///Users/linjerry/Documents/youngnet/PB_ERP/pb_erp_system/frontend/src/hooks/useMasterDetailCrud.js)。
   * **RecordWorkbenchSheet**：工作台式多頁籤主從，未來套用 `ERPRecordWorkbench` 與 `useMultiDetailCrud`。
   * **ComplexTransactionSheet**：複合交易或複雜 BOM 樹狀作業，獨立客製控制器並對接全域 MDI 事件。
   * **BulkGridSheet**：批次編輯網格，套用 [useBulkSave.js](file:///Users/linjerry/Documents/youngnet/PB_ERP/pb_erp_system/frontend/src/hooks/useBulkSave.js)。
2. **三層架構分離**：
   * **Layer 1 (Page Shell)**：最外層，負責 MDI Tab 對接。
   * **Layer 2 (CRUD Controller)**：統一監聽 MDI 廣播並管理狀態。
   * **Layer 3 (View Renderer)**：無狀態受控組件，僅負責 UI 渲染。

---

## 2. 開發禁忌 (Anti-Patterns)

為防範架構腐化，本目錄下的程式碼**嚴格禁止**以下行為：
* ❌ **禁止手寫 Toolbar / Action Buttons**：所有頁面不得自行渲染儲存、新增、刪除或查詢等按鈕，一律由全域 Navbar MDI Toolbar 控制。
* ❌ **禁止自行監聽全域事件**：不得在 Sheet 中編寫 `useEffect` 去監聽 `mdi-global-command`，此工作必須委託給 Layer 2 控制器。
* ❌ **禁止自行實作 API 呼叫**：不得於 Sheet 頁面中手寫 `axios.post`、`axios.delete` 或 `axios.put` 等通用 CRUD 呼叫，必須使用共用 Hook 或 DataWindow 的合併儲存機制。
* ❌ **禁止新增 Sheet-level CSS 檔案**：禁止為個別作業建立私有 CSS 檔或在 JSX 中填入大量 inline-styles。版面與間距必須套用標準 class。
* ❌ **特殊業務邏輯隔離**：特別的網格行為或前端計算邏輯（如矩陣轉換、拆單公式），必須侷限在 Layer 3 View Renderer 或獨立的 domain helper 中，不可污染通用 Layer 2 控制器。
