# Phase 6A 實作完成報告：ReportModal + reportConfig 報表列印基礎建設

本文件記錄了 Phase 6A 報表列印基礎建設的實作結果，將 PB 舊系統的 Print / Preview / Excel 匯出功能對接到全新的 Navbar 按鈕，並建立了通用的前、後端報表管線。

## 1. 實作摘要

本階段實作了以 `reportConfig` 為核心的驅動模型。當使用者在 `Navbar` 點選【列印】或【Excel】按鈕時，系統會從目前的作業中提取 `reportConfig` 並跳出 `ReportModal`，讓使用者選擇報表類型與輸出格式 (PDF / Excel)。後端則由 `ReportMixin` 接手，支援單筆選取模式 (`selectedRecord`) 與清單查詢模式 (`currentQuery`)，並自動套用 Data Constraint 等權限過濾機制，確保使用者只能列印自己有權限看到的資料。

## 2. 修改了哪些檔案

- `frontend/src/config/programRegistry.js`：為 `dp030` 與 `dp040` 加上 `reportConfig` 設定檔。
- `frontend/src/hooks/useRecordWorkbenchCrud.js`：加入處理 `mdi-global-command` 廣播來的 `print`, `export`, `preview` 事件。
- `frontend/src/components/erp/factory/createRecordWorkbenchSheet.jsx`：注入 `ReportModal` 供 Pattern B 標準作業使用。
- `frontend/src/components/Win32DataWindow.jsx`：注入 `ReportModal` 供 Pattern A 標準作業使用。
- `frontend/src/views/Dp030Sheet.jsx` 與 `frontend/src/views/Dp040Sheet.jsx`：針對這兩支試點作業手動加入 `ReportModal` 與事件攔截。
- `backend/api/views.py`：將 `ReportMixin` 繼承至 `BaseDictionaryViewSet` 供全域使用。

## 3. 新增了哪些檔案

- `frontend/src/components/erp/report/ReportModal.jsx`：共用報表選取對話方塊。
- `backend/api/common/mixins/report.py`：提供統一 `/report/` 後端產生器 API 的 Mixin。
- `docs/analysis/framework_phase6a_reportmodal_result.md`：本結果報告。

## 4. reportConfig 設計

定義在 `programRegistry.js` 中：

```javascript
reportConfig: {
  enabled: true,
  endpoint: '/api/dp/dp030/report/',
  defaultFormat: 'pdf',
  reports: [
    { key: 'sample_order', label: '樣品單列印', type: 'document', formats: ['pdf', 'excel'], mode: 'selectedRecord', requiresSelection: true },
    { key: 'sample_list', label: '樣品清單', type: 'list', formats: ['excel'], mode: 'currentQuery', requiresSelection: false }
  ]
}
```

## 5. ReportModal 設計

位於 `ReportModal.jsx`：
1. 自動讀取傳入的 `reportConfig.reports`。
2. 允許使用者選擇報表格式 (pdf/excel)。
3. 當 `requiresSelection: true` 時，若使用者未選取資料會跳出警告阻擋。
4. 當 `isDirty: true` 時，會跳出 Warning，提醒使用者報表可能非最新資料 (但不會強制阻擋，保持彈性)。
5. 點擊產生時，發送 `POST /report/` 並透過 `Blob` 自動執行 PDF 瀏覽器預覽或 Excel 下載。

## 6. Navbar 對接方式

Navbar 內建的物理按鈕點擊後，發送 `mdi-global-command` 事件（帶有 `action='print' | 'export'`）。
由各自的 DataWindow 或 Sheet Hook (`useRecordWorkbenchCrud.js`) 監聽並攔截。因為有共用 `getProgramConfig` 解析，完全不需要對 Navbar 做 Hard Code，純 Config-driven。

## 7. ReportMixin / report endpoint 設計

位於 `report.py` 中，提供統一介面：

1. `mode="selectedRecord"`：利用 `self.filter_queryset()` 搭配 `record_id` 找尋單一單據。
2. `mode="currentQuery"`：利用 `self.filter_queryset()` 把目前的列表當作查詢清單（預設擷取上限，防止記憶體超載）。
3. 自動依賴 DRF 原生 `filter_queryset`，完美融合 DataConstraint，無法匯出無權限的資料。

## 8. PDF 產生方式

本階段使用 Python 原生的 `reportlab` 進行打樣 (Stub)。產出基本的單據 ID、標題、查詢模式與 20 筆內文的字串結構作為確認流程走通的憑據。未來可替換為 WeasyPrint HTML 轉檔，或是掛接 JasperReport。

## 9. Excel 產生方式

本階段使用 Python 原生的 `openpyxl` 打樣。
擷取 DRF 的 Serializer JSON 後，自動抽取出首層字串與數字的 Key，動態組裝 Header，並遞迴塞入所有 Rows 產生 xlsx，作為快速清單的替代方案。

## 10. DataConstraint 與報表權限

由於 `ReportMixin` 內部強制呼叫了 `self.filter_queryset(self.get_queryset())`，所有的查詢行為都會通過 `DataConstraintFilterBackend`。報表引擎只能撈取到被 User Domain Filter 過的 QuerySet，100% 杜絕越權列印風險。

## 11. 試點作業

- **DP030 (樣品單)**：
  - PDF 預覽：使用 `selectedRecord` 產生樣品單打樣 PDF。
  - Excel 匯出：使用 `currentQuery` 產生清單 Excel 檔。
- **DP040 (正式訂單)**：
  - PDF 預覽：使用 `selectedRecord` 產生出貨單打樣 PDF。
  - Excel 匯出：使用 `currentQuery` 產生清單 Excel 檔。

## 12. 前後端測試結果

- [x] 無 reportConfig 時，點擊 Navbar 會正確提示尚未設定。
- [x] requiresSelection 生效，沒點選就列印會被擋。
- [x] isDirty 警告機制正常運作。
- [x] Data Constraint 正常套用，越權紀錄直接被 NotFound 擋掉。
- [x] 審核鎖單與報表解耦，列印不影響防呆機制。

## 13. 下一階段建議

目前 Phase 6A 以 Stub 的形式走通了列印與匯出的基礎設施與管道，後續視實務開發可以：
1. 實作更精緻的 HTML -> PDF 轉譯器。
2. 進行最後的 **DeepSaveMixin 架構重構與效能優化** (這是所有基礎建設的最後一哩路)。
