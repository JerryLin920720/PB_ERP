# Legacy Analysis Phase 2E：SA Pattern R Report Programs Analysis

## 一、分析摘要

SA 模組包含了 12 支重要的查詢與報表作業 (Pattern R)。這些作業橫跨了預告單、客戶訂單、工廠訂單、利潤預估、接單統計與 L/C 查詢。
經過總體分析，這些報表高度依賴 `sa030` (訂單主檔) 與 `sa032` (型體/尺碼明細) 的資料。部分作業需串接 `sm` (出貨) 或 `fa` (財務) 模組以取得未出貨數或押匯狀態。
在未來的重構中，強烈建議建立統一的 **Report Framework**，利用標準化的 Query Panel 與可配置的 DataGrid 來大幅減少重複開發。

## 二、報表作業清單與規格

| 作業代號 | 作業名稱 | PB Window | Pattern | 依賴 SA030 | 依賴 SA040 | 依賴 SM / FA |
| --- | --- | --- | --- | --- | --- | --- |
| SA048 | 預接訂單查詢 | `w_sa048` | R | 是 | 否 | 否 |
| SA050 | 退貨訂單查詢 | `w_sa050` | R | 是 | 否 | 是 (SM) |
| SA055 | 客戶訂單查詢 | `w_sa055` | R | 是 | 否 | 是 (SM) |
| SA058 | Outstanding Order | `w_sa058` | R | 是 | 否 | 是 (SM) |
| SA060 | 工廠訂單查詢 | `w_sa060` | R | 是 | 否 | 否 |
| SA065 | 利潤預估查詢 | `w_sa065` | R | 是 | 否 | 否 |
| SA070 | 型體接單統計查詢 | `w_sa070` | R | 是 | 否 | 否 |
| SA075 | 客戶接單統計查詢 | `w_sa075` | R | 是 | 否 | 否 |
| SA080 | 工廠接單統計查詢 | `w_sa080` | R | 是 | 否 | 否 |
| SA085 | 客戶索樣與接單統計 | `w_sa085` | R | 是 (與 DP) | 否 | 否 |
| SA090 | 暢銷型體查詢 | `w_sa090` | R | 是 | 否 | 否 |
| SA096 | 未收到 LC 查詢 | `w_sa096` | R | 是 | 是 | 是 (FA/LC) |

## 三、查詢條件總整理

絕大多數報表共用以下查詢維度，建議在前端實作 `CommonReportQueryPanel`：
* **時間區間**：Date Range (通常對應 `sa030.issuedate` 或 `custdate` / `factdate`)。
* **對象過濾**：`ba010_custno` (客戶 F2 Lookup), `ba015_factno` (工廠 F2 Lookup), `agentcustno` (代理商 F2 Lookup)。
* **產品過濾**：`styleno` (型體), `dp010_lastno` (楦頭), `dp023_groupname` (Size Group)。
* **單號與狀態**：`pono` (訂單號), `status` (訂單狀態，如下拉選單)。

## 四、主要資料表依賴總整理

* **核心依賴**：`sa030` (主), `sa031` (明細), `sa032` (尺碼明細)。幾乎所有雙數加總與單價計算都來自這三張表。
* **Outstanding 計算**：如 SA058 需關聯 `sm` (出貨單) 模組，計算公式通常為 `sa032.pairs - 已出貨雙數`。
* **利潤預估 (SA065)**：依賴 `sa032.price` (客單價) 減去 `sa032.cost` (工廠成本) 與其他費用 (`sa035`)。
* **SA096 依賴**：查詢 `sa040` (P/I) 且尚未關聯 L/C 號碼的資料。

## 五、Excel / PDF / Print 需求

* **Excel 匯出**：**100% 需要**。所有的統計與清單查詢 (如 SA055, SA060, SA070 等) 業務部門一定會要求匯出 Excel 進行二次加工。
* **PDF / Print**：需求較低。除正式報價單 (SA010) 或 P/I (SA040) 需要精確的 PDF 外，一般的統計報表 (SA065, SA075) 在現代 ERP 中通常以網頁 DataGrid 呈現即可，不一定需要強硬排版列印。

## 六、Report Framework Gap (底層框架需求)

目前專案中尚未看到統一的報表匯出與查詢框架，建議補齊以下機制：
1. **動態查詢 API 引擎**：後端需要提供一套能接收 JSON 條件並自動組裝 Django ORM `filter()` 的基礎類別 (例如使用 `django-filter`)。
2. **Server-side Excel 匯出**：對於十萬筆等級的接單統計，不可依賴前端匯出，後端需提供 `ExportExcelService` 結合 Celery 進行背景匯出，或即時 Streaming 寫出 xlsx。
3. **DataGrid 元件**：前端需要具有「拖拉欄位、自訂排序、動態小計 (Subtotal) 與總計 (Grand Total)」的高階 Table 元件 (如 Ant Design ProTable 或 AG Grid)。

## 七、風險與待確認事項

1. **出貨狀態即時性**：Outstanding List (SA058) 需要即時跨模組 JOIN 出貨資料，如果出貨資料表非常龐大，可能會遇到嚴重的 Slow Query，需確認是否要在 `sa030` 維護冗餘的 `shipped_pairs` 欄位以加速查詢。
2. **權限管控**：利潤查詢 (SA065) 涉及工廠底價與公司毛利，必須嚴格控管能查閱的帳號與角色，這不能僅靠 Program Permission，可能需要 Row-level 或 Column-level permission。
