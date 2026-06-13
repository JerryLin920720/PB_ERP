# Legacy Analysis Phase 2C：MR105 樣品入庫作業深度分析

## 一、Legacy PB 檔案盤點

針對 MR105 (樣品入庫作業) 相關程式碼進行盤點，發現以下核心 PB 檔案：

- **Main Window**: `w_mr105.srw`
- **轉單 (Import) DataWindows**:
  - `d_mr105_import_query.srd` (從 MR045 查詢未入庫完畢的採購明細)
  - `d_mr105_import_query_where.srd` (轉單查詢條件)
- **DataWindows (Master/List)**:
  - `d_mr105_master.srd` (主檔編輯區)
  - `d_mr105_list.srd`, `d_mr105_query.srd`, `d_mr105_query_where.srd`
- **DataWindows (Detail)**:
  - `d_mr105_detail_mr106.srd` (明細表編輯區，對應 `mr106` 資料表)
- **DataWindows (回寫與庫存更新專用)**:
  - `d_mr105_update_mr035.srd` (回寫更新料號主檔庫存量)
  - `d_mr105_update_mr038.srd` (寫入進出庫異動明細)
  - `d_mr105_update_mr045.srd` (回寫採購單主檔狀態)
  - `d_mr105_update_mr046.srd` (回寫採購單明細已入庫數量)
- **報表**:
  - `d_mr105_report.srd`, `d_mr105_report_c.srd` 等

> **結論**：MR105 沒有獨立的彈出轉單視窗 (`w_mr045_to_mr105`)，而是直接透過 `inv_Import.of_Register` 使用 `d_mr105_import_query.srd` 在原視窗內進行採購單轉入庫的動作。此外，它負責了**極為核心的庫存過帳與採購單狀態回推**邏輯。

---

## 二、資料表與主從關係

### 1. 主表 (Master)：`mr105`
- **主鍵**：`gkey`
- **關鍵欄位**：
  - `refno` (入庫單號)
  - `issuedate` (入庫日期)
  - `ba015gkey` (供應商)
  - `es101gkey` (建檔人)
  - `cfmchk` (審核旗標 Y/N，**關鍵的庫存過帳觸發點**)
  - `cfmdate`, `cmes101gkey` (審核日期與審核人)
  - `mtype` (預設為 '1'：入庫)

### 2. 明細表 (Detail)：`mr106`
- **主鍵**：`gkey`
- **主從關聯欄位**：`mr106.mr105gkey = mr105.gkey`
- **追蹤來源 (PO)**：
  - `importgkey` (存放來源採購明細的主鍵 `mr046.gkey`)
  - `mpono` (來源採購單號 `mr045.mpono`)
- **關鍵欄位**：
  - `mr035gkey` (料號)
  - `beforeqty` (入庫前庫存數量)
  - `changeqty` (本次入庫數量)
  - `afterqty` (入庫後庫存數量)
  - `priceqty` (計價數量)
  - `mprice` (採購單價), `avgprice` (結算後平均單價), `mamount` (金額)
  - `kind` (預設 '3')

---

## 三、DataWindow SQL 分析

### 1. 來源轉單 SQL (`d_mr105_import_query.srd`)
用來撈取未完全入庫的 MR046 明細：
```sql
SELECT mr045.issuedate, mr045.mpono, ba015.shortname, mr035.mstkno, mr046.material,
       mr035.tstdqty, mr046.quantity - ISNULL(mr106A.changeqty,0) as quantity,
       mr046.unit, mr046.mprice, mr045.gkey, mr046.gkey
FROM mr045
INNER JOIN mr046 ON mr046.mr045gkey = mr045.gkey
LEFT JOIN mr035 ON mr035.gkey = mr046.mr035gkey
LEFT JOIN ba015 ON ba015.gkey = mr045.ba015gkey
LEFT JOIN (
   SELECT SUM(ISNULL(mr106.changeqty,0)) changeqty, mr106.importgkey
   FROM mr106 WHERE ISNULL(mr106.importgkey,'')<>'' GROUP BY mr106.importgkey
) mr106A ON mr106A.importgkey = mr046.gkey 
WHERE mr046.chk='N' AND (mr046.quantity - ISNULL(mr106A.changeqty,0)) > 0
```
> **分析**：利用 Subquery `mr106A` 統計已入庫數量 (`changeqty`)，當 `採購量 - 已入庫量 > 0` 時才允許轉單。

---

## 四、PB 商業邏輯分析 (極度重要)

MR105 的核心邏輯集中在 **`ue_presave`** 與 **`ue_updatestock`** 事件中。當使用者勾選 `cfmchk = 'Y'` (審核/過帳) 時，系統會觸發一連串的實體庫存與狀態更新：

### 1. 庫存盤點檢查
`wf_checkstatus('3')` 會檢查系統參數 `stocktaking` 是否為 `'T'`。若系統正處於盤點狀態，則禁止存檔與更新庫存。

### 2. 更新實體庫存與平均成本 (`mr035` 料號主檔)
- 程式會將本次入庫數量 (`mr106.changeqty`) 累加至 **`mr035.tstdqty`** (總庫存量)。
- 根據系統參數 `AverageCost`，計算**移動平均成本** (Moving Average Cost)：
  ```text
  avgprice = ((入庫前總庫存 * 歷史單價) + (本次入庫量 * 本次單價)) / (入庫前總庫存 + 本次入庫量)
  ```
- 更新 `mr035.mprice = avgprice`。

### 3. 寫入庫存異動紀錄表 (`mr038`)
每筆 `mr106` 入庫明細，都會在 `mr038` 插入一筆進出庫紀錄：
- `mr038.mtype = '1'` (入庫)
- `mr038.qty = mr106.changeqty`
- `mr038.nqty = (入庫後總庫存量)`
- `mr038.refno = mr105.refno`
*(註：這顯示舊系統沒有獨立的 Inventory Transaction Service，而是由 MR105 直接硬刻 SQL 寫入 `mr038`)*

### 4. 回寫採購單狀態 (`mr045` / `mr046`)
- 將入庫數量累加至採購明細的計價數量：`mr046.priceqty = mr046.priceqty + mr106.priceqty`。
- 若 `mr046.priceqty >= mr046.quantity` (入庫數量達到採購數量)，則將明細狀態設為已結案：`mr046.chk = 'Y'`。
- 檢查整張採購單 (`mr045`) 底下的所有明細：
  - 若**所有明細**的 `chk` 皆為 `'Y'`，則 `mr045.status = '3'` (已完成)。
  - 若**尚有未結案**的明細，則 `mr045.status = '2'` (入庫中)。

---

## 五、與 MR045 的關係總結

- **高度耦合**：MR105 必須讀取 MR045/046 作為來源，且過帳時會**直接修改** MR046 的 `priceqty`, `chk` 以及 MR045 的 `status`, `pamount`。
- **無獨立 Inventory Service**：舊系統的入庫、算平均單價、寫異動 log 全都在 MR105 的 Window 事件中完成。

---

## 六、現有 ERP 實作狀態

經檢查目前後端 (`pb_erp_system/backend`) 與前端 (`pb_erp_system/frontend`)：

| 項目 | 狀態 | 說明 |
| --- | --- | --- |
| **Backend Model** | **不存在** | 尚未建立 `Mr105`, `Mr106`。 |
| **Backend API** | **不存在** | 尚未建立 Serializer, ViewSet, `approval API`。 |
| **Frontend Page** | **不存在** | 尚未建立 `Mr105Sheet.jsx`。 |
| **Sidebar / Menu** | **已註冊** | `Sidebar.jsx` 中有 `{ code: 'mr105', label: '入庫作業' }`。 |

> **結論**：這是一張完全空白的作業。

---

## 七、Pattern 判斷與輸出結論

### 1. 正確 Pattern
**Pattern B (Master-Detail) + Transfer From MR045 + Inventory Posting (審核即過帳)**。

### 2. 資料表映射
- **主表**：`mr105`
- **明細表**：`mr106`
- **關聯表 (被更新)**：`mr035` (庫存與單價)、`mr038` (庫存異動明細)、`mr045`/`mr046` (採購單狀態)。

### 3. 實作前必須補齊的底層架構 (高風險)
在未來開發 MR105 前，**絕對不能**把舊系統 `ue_updatestock` 的 100 行 PB 代碼直接塞進 MR105 的 Django ViewSet 中。這會導致嚴重的架構崩壞。
必須先在後端建立共用的 **Inventory Posting Service (或 Stock Transaction Service)**：
1. **抽象化過帳**：MR105 approval API 呼叫 `InventoryService.stock_in(material_id, qty, price, ref_no)`。
2. **封裝庫存邏輯**：由 Service 負責計算 Moving Average Cost、更新 `mr035` 庫存、並寫入 `mr038` (庫存異動紀錄)。
3. **採購單狀態回推**：發送訊號或呼叫 `PurchaseOrderService.receive_items(...)` 去更新 `mr045` 與 `mr046`。

### 4. 實作優先級
**P2**。必須等待 **MR035 (料號)** 與 **MR045 (採購單)** 實作完畢，並確立好後端庫存過帳架構後，才能開始動工 MR105。
