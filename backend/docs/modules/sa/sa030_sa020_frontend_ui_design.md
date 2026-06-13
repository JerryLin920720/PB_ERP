# Legacy Analysis Phase 2A-C：SA030 / SA020 Frontend UI 與 Assortment / Size Grid 分析報告

## 一、分析摘要

本次深度分析針對 SA 業務模組最核心的作業 **SA030 (P/O訂單資料管理)** 與 **SA020 (預告訂單資料管理)** 的 PowerBuilder 原始碼及 DataWindow 結構進行解構。
分析確認 SA030 採用了高複雜度的 **Master -> Detail -> Sub-Detail** 階層架構，並將主檔的過多欄位（如 Mark、Memo、Bank）拆分至明細 Tab 頁籤中。
此外，最關鍵的 **Assortment (裝箱) 與 Size Grid (尺碼網格)** 採用了橫向 16 碼 (size1 ~ size16) 的固定矩陣設計。
基於其複雜度，現有的 Pattern B (Master-Detail) 架構不足以支撐，建議未來前端實作時定義全新的 **Pattern B-Order** 專屬樣板，並共用 SA020 與 SA030 的前端元件。

## 二、SA030 / SA020 畫面定位

* **SA030 (P/O訂單)**：業務部門建立與維護客戶正式訂單的核心作業。
* **SA020 (預告單)**：業務部門建立預告訂單，兩者資料表與操作邏輯幾乎 100% 重疊，僅狀態與用途不同。
* **前端共用建議**：SA020 與 SA030 **強烈建議共用同一套 React Page 元件 (`OrderWorkbench`)**，透過 Router Config 傳入 `orderType="PO"` 或 `orderType="Forecast"` 區分。

## 三、PB Window / DataWindow 清單與對應

經過 PB 程式碼 (`w_sa030.srw`) 分析，DataWindow 控制項的對應如下：

| UI 區塊 / Tab | DataWindow Control | DataObject (SRD) | 對應資料表 | 說明 |
| :--- | :--- | :--- | :--- | :--- |
| **查詢條件** | `dw_where` | `d_sa030_query_where` | 無 | 查詢面板 |
| **查詢結果** | `dw_query` | `d_sa030_query` | `sa030` | 查詢結果清單 |
| **編輯區 - 左側** | `dw_list` | `d_sa030_list` | `sa030` | 多筆編輯時的左側導覽列 |
| **主檔 (Master)** | `dw_root` | `d_sa030_master` | `sa030` | 訂單主檔上半部表單 |
| **型體清單 (Detail)**| `dw_1` | `d_sa030_detail_sa031_list` | `sa031` | 該訂單下的型體/顏色清單 |
| **型體編輯 (Detail)**| `dw_2` | `d_sa030_detail_sa031` | `sa031` | 型體/顏色單筆編輯區 |
| **Tab 1: Size & Price**| `dw_3` | `d_sa030_detail_sa032` | `sa032` | (Sub-Detail) 該型體的尺碼與價格 |
| **Tab 2: Assortment**| `dw_4` | `d_sa030_detail_sa033` | `sa033` | (Sub-Detail) 裝箱設定 Header |
| **Tab 2: Size Grid** | `dw_5` | `d_sa030_detail_sa033_size` | `sa033` | (Sub-Detail) 裝箱尺碼矩陣輸入區 |
| **Tab 3: Pack Acc.** | `dw_6` | `d_sa030_detail_sa034` | `sa034` | (Sub-Detail) 包裝配件 |
| **Tab 4: Add & Sub** | `dw_7` | `d_sa030_detail_sa035` | `sa035` | (Sub-Detail) 加扣款 |
| **Tab 5: Mark** | `dw_8` | `d_sa030_master_mark` | `sa030` | (Master 延伸) 麥頭設定 |
| **Tab 6: Say Total** | `dw_9` | `d_sa030_master_saytotal` | `sa030` | (Master 延伸) 總計與備註 |
| **Tab 7: Revise Memo** | `dw_10` | `d_sa030_master_memo` | `sa030` | (Master 延伸) 修改紀錄 |
| **Tab 8: Pack Inst.**| `dw_11` | `d_sa030_master_pack` | `sa030` | (Master 延伸) 包裝指示 |
| **Tab 9: Banking** | `dw_12` | `d_sa030_master_bank` | `sa030` | (Master 延伸) 銀行資料 |

## 四、UI Layout 文字圖

基於上述分析，原本 PB 的介面呈現高度擁擠的上下分割，未來的 React 前端建議採用更現代化的 **Order Workbench (訂單工作台)** 佈局：

```text
+-----------------------------------------------------------------------------------------+
| [Header Toolbar] Save, Approve, Delete, Print, Copy...                                  |
+-----------------------------------------------------------------------------------------+
| [Master Form (sa030)] (可摺疊 Accordion)                                                  |
| P/O No: _______  Customer: [F2] _______  Agent: [F2] _______  Currency: [F2] _______  |
| Dest Port: [F2]_______  Payment: [F2] _______ Order Date: _______  Total Pairs: ______|
| [Tab: Basic] [Tab: Mark] [Tab: Say Total] [Tab: Revise Memo] [Tab: Bank] (Master延伸)  |
+-----------------------------------------------------------------------------------------+
| [Split Panel - Left] (sa031 List)      | [Split Panel - Right] (sa031 Edit & Sub-Details)|
|                                        |                                                 |
| +-----------------------------------+  | [Style/Color Form (sa031)]                      |
| | Style No | Color     | Pairs      |  | Style: [F2]_____  Outsole: [F2]_____            |
| |-----------------------------------|  | Last: [F2]______  Group: [F2]_______            |
| | ABC-123  | Black     | 1,200      |  | Upper: __________ Lining: __________            |
| | ABC-123  | Red       | 800        |  |                                                 |
| | XYZ-999  | White     | 2,000      |  | [Sub-Detail Tabs]                               |
| +-----------------------------------+  |  [Size & Price (sa032)]                         |
|                                        |  [Assortment & Grid (sa033)] <--- 核心操作區   |
|                                        |  [Pack Accessory (sa034)]                       |
|                                        |  [Add & Sub (sa035)]                            |
+-----------------------------------------------------------------------------------------+
```

## 五、重要 DataWindow 欄位分析

### 1. Master 欄位表 (sa030)
* **主鍵**: `gkey`
* **重要欄位**: `pono` (單號), `ba010_custno` (客戶), `agentcustno` (代理商), `ba070gkey` (幣別), `cpayment` (付款條件), `term` (交易條件), `shipfrom` (出貨港), `shipto` (目的港), `factdate` (廠交期), `custdate` (客交期).
* **狀態控制**: `approve` (審核狀態).
* **唯讀/計算**: `pairs` (總雙數), `custamt` (客總額), `factamt` (廠總額) 由系統動態加總。

### 2. Detail 1 欄位表 (sa031 - 型體/顏色)
* **主鍵**: `gkey`
* **外鍵**: `sa030gkey`
* **重要欄位**: `styleno` (型體編號), `dp015_bottomno` (大底), `dp010_lastno` (楦頭), `dp020_heelno` (鞋跟), `dp023_groupname` (Size Group), `color` (顏色), `pairs` (雙數).
* **下拉選單 (Dropdown)**: `sa031_dp004gkey` (Gender), `sa031_dp003gkey` (ShoeType).

### 3. F2 Lookup 清單

SA030 高度依賴 F2 開窗，需確保對應的基礎資料 API 已完成：
1. **客戶 / 代理商**: `ba010_custno` -> F2 `ba010`
2. **工廠**: `ba015_factno` -> F2 `ba015`
3. **基礎部位**: `dp015` (大底), `dp010` (楦頭), `dp020` (鞋跟) -> F2 開窗 (連動 DP 模組)
4. **Size Group**: `dp023_groupname` -> F2 `dp023`
5. **港口/地點/交易條件**: `shipfrom`, `shipto`, `term` -> F2 `ba065`
6. **付款條件**: `cpayment`, `fpayment` -> F2 `ba076`
7. **片語 (Phrase)**: `remark`, `piremark`, `revisememo` -> F2 `sa001` (業務片語)
8. **裝箱設定**: `code` (sa033) -> F2 `sa005` (Assortment)
9. **人員**: `es101` -> F2 人事資料
10. **銀行**: `banking` -> F2 `ba040`

---

## 六、Assortment 與 Size / Color Grid 深度分析 (核心關鍵)

透過分析 `d_sa030_detail_sa033` 與 `d_sa030_detail_sa033_size`，確認其機制如下：

### 1. Assortment (裝箱模式) 設定
* 在 `sa033` 中，欄位 `assortment` 定義了四種經典的鞋業裝箱模式：
  * `1`：單色單碼裝 (Solid Color, Solid Size)
  * `2`：單色混碼裝 (Solid Color, Assorted Size)
  * `3`：混色單碼裝 (Assorted Color, Solid Size)
  * `4`：混色混碼裝 (Assorted Color, Assorted Size)
* 使用者可透過 F2 呼叫 `sa005` (Assortment 設定作業) 帶入預設比例。

### 2. Size Grid (尺碼網格) 結構
* 資料庫採用 **固定橫向 16 碼** 設計。
* 欄位為 `size1` ~ `size16` (存放尺碼名稱，如 7, 7.5, 8...)。
* 對應數量為 `pairs1` ~ `pairs16` (存放各尺碼數量)。
* 計算欄位：
  * `ctnpairs` (Pairs/Ctn，每箱雙數)
  * `ctns` (Ctns，總箱數)
  * `totalpairs` (TotalPairs，總計雙數)
* **動態唯讀保護**：Grid 內的欄位會依照 `outpairs` (已出貨數量) 或不同 `assortment` 模式，動態切換可編輯或唯讀。例如單色單碼時，某些加總欄位是由系統自動計算 (`pairs1` * `ctns` 等)，不允許手動輸入。

### 3. 前端實作建議 (Size Grid)
由於資料結構是固定的 `size1` ~ `size16`，建議前端 **不需** 使用複雜的動態 EditableMatrix。
可以實作一個專屬的 `<FixedSizeGrid columns={16} />` 元件：
* 表頭顯示對應的 `sizeX` 名稱。
* 內容顯示 `pairsX` 的 InputBox。
* 失去焦點 (onBlur) 時即時觸發前端合計邏輯，更新 `totalpairs`。
* 此元件非常適合利用 Ant Design 的 Table 實作，將 16 個 size 欄位設定為 `editable: true`。

---

## 七、狀態與權限控制分析

* **狀態 (Status)**：`sa032` 帶有狀態欄位 `status` (1:進行中, 2:出貨中, 3:已出貨, 4:押匯, 5:結案, A:取消, 0:預告)。
* **唯讀鎖定**：
  * 當 `outpairs > 0` (已有出貨) 且狀態為特定值時，`sa033` 的尺碼與數量欄位將被強制保護 (Protect=1)，禁止修改。
  * `sa030` 主檔若處於 `approve='Y'` (已審核)，原則上不允許直接修改型體數量，需透過特定的修改權限或變更單。
* **跨模組連動**：SA030 存檔時，後端必定會去更新 DP 模組的 `adopted` 狀態，以及 QC 模組的檢驗排程。這必須在 Backend 的 `DeepSave` 中利用 Transaction 處理。

---

## 八、React 前端元件設計建議 (新 Pattern)

現有的 Pattern A / Pattern B 無法支撐此複雜度，建議定義 **Pattern B-Order**：

1. **`OrderWorkbench` (新 Page)**：取代傳統的 Master-Detail，提供左側 Tree/List 選單，右側為可展開的主檔與多層 Sub-Detail Tabs 的大型工作台。
2. **`OrderMasterForm` (Component)**：支援多 Tab 的主檔表單（包含原本的 Mark, Memo, Bank）。
3. **`OrderAssortmentGrid` (Component)**：針對 SA033 專門開發的 16 碼橫向輸入 Grid，需封裝自動加總 (Pairs * Ctns) 與裝箱比例展開邏輯。
4. **狀態管理**：強烈建議在前端使用 Zustand 或 Context API 來管理 `sa030` -> `sa031` -> `sa032/sa033` 的龐大 Dirty State，避免過度頻繁的 API 呼叫，統一由右上角的「Save」呼叫一次 Backend 的 `DeepSave` API。

## 九、結論與下一階段待確認事項

1. **已確認**：SA030/SA020 共用架構、Master-Detail 階層、Assortment 的四種模式、Size Grid 的 16 碼固定資料表設計。
2. **強烈建議**：新增 Pattern B-Order 作為未來的開發樣板。
3. **下一階段必須確認的事項 (Backend)**：
   * SA030 的 `DeepSave` API 設計：一次要存入 `sa030, sa031, sa032, sa033, sa034, sa035` 六張表，Payload 結構會非常龐大，需與後端工程師協調嵌套 JSON 格式。
   * SA030 儲存時觸發 DP (型體 adopted) 與 QC (驗貨單) 的連動邏輯，需從 PB 原始碼中完整提取至 Python Backend。
