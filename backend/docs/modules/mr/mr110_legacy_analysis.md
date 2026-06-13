# Legacy Analysis Phase 2D：MR110 樣品發料作業深度分析

## 一、Legacy PB 檔案盤點

針對 MR110 (樣品發料管理) 進行盤點，發現以下核心 PB 檔案：

- **Main Window**: `w_mr110.srw`
- **轉單 (Import) DataWindows**:
  - `d_mr110_import_query.srd` (用來從「已入庫的 MR105」撈取可發料明細)
  - `d_mr110_import_query_where.srd`
- **DataWindows (Master/List)**:
  - `d_mr110_master.srd` (主檔編輯區)
  - `d_mr110_list.srd`, `d_mr110_query.srd`, `d_mr110_query_where.srd`
- **DataWindows (Detail)**:
  - `d_mr110_detail_mr106.srd` (明細表編輯區)
- **DataWindows (回寫與庫存更新專用)**:
  - 由於發料只扣庫存，不回推來源單據，因此只用到：
  - `d_mr105_update_mr035.srd` (扣減 `mr035` 總庫存)
  - `d_mr105_update_mr038.srd` (寫入 `mr038` 異動明細)
- **報表**:
  - `d_mr110_report.srd`, `d_mr110_report_c.srd`

> **結論**：MR110 與 MR105 高度對稱，兩者甚至共用了同一個底層 Table 架構，只是入庫與出庫的方向不同。

---

## 二、資料表與主從關係

這是一個極度重要的發現：**MR110 並沒有自己的實體 Table，而是完全與 MR105 (入庫) 共用 `mr105` 與 `mr106` 資料表！**

### 1. 主表 (Master)：`mr105`
- 透過 **`mtype = '2'`** 來區分這是一張「發料單」 (入庫單的 `mtype = '1'`)。
- **關鍵欄位**：
  - `dp030gkey`：對應開發樣品單號 (`dp030`)，這是發料專用的屬性。
  - `pkes101gkey`：領料人 (Requested By)，指向員工主檔 `es101`。
  - `cfmchk`：審核過帳旗標 (Y/N)。

### 2. 明細表 (Detail)：`mr106`
- **主從關聯欄位**：`mr106.mr105gkey = mr105.gkey`。
- **關鍵欄位**：
  - `mr035gkey` (料號)
  - `changeqty` (本次發料/領出數量)
  - `beforeqty` (發料前現有庫存)
  - `afterqty` (發料後結餘庫存)

---

## 三、DataWindow SQL 分析

### 1. 來源轉單 SQL (`d_mr110_import_query.srd`)
MR110 可以從已經入庫的單據直接轉成發料單，其 SQL 如下：
```sql
SELECT mr105.refno, mr105.issuedate, mr035.mstkno, mr106.material,
       mr106.changeqty, mr035.tstdqty, mr106.mprice, ...
FROM mr105
INNER JOIN mr106 ON mr106.mr105gkey = mr105.gkey
LEFT JOIN mr035 ON mr035.gkey = mr106.mr035gkey
WHERE mr105.mtype = '1' and mr105.cfmchk='Y'
```
> **分析**：這表示發料可以透過「直接選取一張已審核完成的入庫單 (`mtype=1`)」來帶入明細，這通常發生在「樣品室指定要領取昨天剛入庫的那批材料」的情境。

---

## 四、畫面欄位分析

- **主檔編輯欄位**：
  - Ref No (發料單號)
  - IssueDate (發料日期)
  - FTY (廠別)
  - SampleNo (樣品編號，`dp030.sampleno`)
  - StyleNo (型體編號，`dp030.styleno`)
  - Requested By (領料人，`es101.englishname`)
- **明細欄位**：
  - MaterialNo (F2 開窗選取 `mr035`)
  - Current QTY (現有庫存)
  - Requisite QTY (領出量 / `changeqty`)
  - Last QTY (結餘量 / `afterqty`)
  - Price, Amount (單價與金額)

---

## 五、PB 商業邏輯分析 (庫存扣減)

當使用者勾選 `cfmchk = 'Y'` (審核/過帳) 時，觸發 **`ue_updatestock`** 事件：

1. **庫存盤點檢查**：呼叫 `wf_checkstatus('3')`，若 `stocktaking = 'T'` 則阻擋發料。
2. **負庫存防呆檢查**：
   - 程式會檢查 `現有庫存 (orgqty) - 發料量 (changeqty) < 0`。
   - 若發生負庫存，PB 畫面會將該筆明細標記紅色 (`diff = '1'`)，並跳出警告「領出量不能大于現有庫存量」，**中斷存檔，禁止發料**。
3. **無回推來源單據邏輯**：
   - 不同於 MR105 會回推採購單，MR110 **不會**去更新 `dp030` (樣品) 的狀態，它單純只是一個出庫憑證。

---

## 六、庫存異動分析

與 MR105 完全對稱，MR110 的過帳執行了：

1. **扣減實體庫存 (`mr035`)**
   - `mr035.tstdqty = mr035.tstdqty - mr106.changeqty`。
2. **單價處理 (不重新計算)**
   - 發料動作**不改變**移動平均成本。程式直接讀取 `mr035.mprice` 作為本次發料成本。
3. **寫入異動明細 (`mr038`)**
   - `mr038.mtype = '2'` (代表發料出庫)。
   - `mr038.qty = changeqty`。
   - `mr038.nqty = (發料後結餘量)`。

---

## 七、與 MR105 / MR035 的關係總結

- **Table Level 共享**：MR105(入庫) 與 MR110(發料) 在 Django Model 層面**必須是同一個 Model (`Mr105`)**，只是用 `mtype` choices 來區分。
- **Service Level 共用**：兩者寫入庫存的邏輯完全一致 (加減號相反而已)，因此未來在實作時，這兩者絕對必須依賴同一個 **`InventoryService`** (例如 `InventoryService.post_transaction(type, qty, ...)`)。

---

## 八、現有 ERP 實作狀態

| 項目 | 狀態 | 說明 |
| --- | --- | --- |
| **Backend Model** | **不存在** | `Mr105` 與 `Mr106` 尚未建立。 |
| **Backend API** | **不存在** | 無 Serializer, ViewSet, `approval API`。 |
| **Frontend Page** | **不存在** | 尚未建立 `Mr110Sheet.jsx`。 |
| **Sidebar / Menu** | **已註冊** | `Sidebar.jsx` 中有 `{ code: 'mr110', label: '發料管理' }`。 |

---

## 九、Pattern 判斷

**Pattern B (Master-Detail) + Transfer (From MR105) + Inventory Posting (Stock Out)**。

---

## 十、輸出結論

1. **高度對稱與共用 Model**：MR110 發料單在底層完全沿用 MR105 的 Table 架構。後端在設計 Model 時，請建立 `Mr105` 並加上 `mtype = models.CharField(choices=[('1', '入庫'), ('2', '發料')])`。
2. **阻擋條件**：MR110 的防呆機制非常明確——不允許負庫存 (`beforeqty < changeqty`)。這必須在後端的 Approval API 或 Service 層嚴格實作。
3. **沒有外部單據回推**：相較於 MR105 的複雜度，MR110 非常單純，只需扣減 `mr035` 並寫入 `mr038`，不需回推 DP 開發單。
4. **實作優先級與建議**：
   - 開發優先級為 **P2**。
   - **強烈建議將 MR105 與 MR110 排在同一個 Sprint 中開發**，因為它們共用相同的 Model 與 InventoryService。分開開發極易導致底層庫存邏輯不一致。
