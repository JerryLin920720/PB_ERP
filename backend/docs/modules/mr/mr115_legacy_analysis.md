# Legacy Analysis Phase 2E：MR115 退貨管理作業深度分析

## 一、Legacy PB 檔案盤點

針對 MR115 (退貨管理) 進行盤點，確認以下核心 PB 檔案：

- **Main Window**: `w_mr115.srw` (實作了複雜的退貨扣庫存與回推邏輯)
- **轉單 (Import) DataWindows**:
  - `d_mr115_import_query.srd` (撈取已被審核、且其來源採購單尚未付款的 MR105 入庫明細)
  - `d_mr115_import_query_where.srd`
- **DataWindows (Master/List)**:
  - `d_mr115_master.srd` (主檔編輯區)
  - `d_mr115_list.srd`, `d_mr115_query.srd`, `d_mr115_query_where.srd`
- **DataWindows (Detail)**:
  - `d_mr115_detail_mr106.srd` (明細表)
- **DataWindows (回寫專用)**:
  - `d_mr115_update_mr106.srd` (未使用於程式代碼中，程式代碼直接以 ids 更新)
- **報表**:
  - `d_mr115_report.srd`, `d_mr115_report_c.srd`

---

## 二、資料表與主從關係

MR115 退貨管理作業同樣**沒有自己的專屬 Table**，而是與 MR105 (入庫) 與 MR110 (發料) 共用底層結構：

### 1. 主表 (Master)：`mr105`
- 透過 **`mtype = '3'`** 區分此為「退貨單」。
- **關聯表**：
  - `ba015` (供應商)
  - `ba005` (所屬部門)
  - `es101` (建檔人, 審核人)

### 2. 明細表 (Detail)：`mr106`
- **主從關聯**：`mr106.mr105gkey = mr105.gkey`。
- **追蹤欄位**：
  - `importgkey`：記錄該退貨明細是來自哪一筆「MR105 入庫單」的明細 (`mr106.gkey`)。
  - `mr035gkey`：退貨材料料號。

---

## 三、DataWindow SQL 分析

### 1. 來源轉單 SQL (`d_mr115_import_query.srd`)
這是退貨的資料來源，它強制使用者只能從已入庫的單據進行退貨：
```sql
SELECT mr105.refno, mr105.issuedate, ba015.shortname, mr035.mstkno, mr106.material,
       mr106.changeqty, mr035.tstdqty, mr106.mprice, mr106.priceqty ...
FROM mr105
INNER JOIN mr106 ON mr106.mr105gkey = mr105.gkey
INNER JOIN ba015 ON ba015.gkey = mr105.ba015gkey
LEFT  JOIN mr035 ON mr035.gkey = mr106.mr035gkey
LEFT  JOIN mr046 ON mr106.importgkey = mr046.gkey
LEFT  JOIN mr045 ON mr046.mr045gkey = mr045.gkey 
WHERE mr105.mtype = '1' 
  AND mr105.cfmchk = 'Y' 
  AND ((mr046.gkey is not null and mr045.status <> '4') or mr046.gkey is null)
```
> **關鍵發現**：若該批入庫單所屬的採購單 (`mr045`) 狀態為 `'4'` (已付款結案)，則**不允許退貨**！

---

## 四、畫面欄位分析

- **主檔欄位**：
  - Ref No (退貨單號)
  - Supplier (供應商 `ba015`)
  - BelongTo (部門 `ba005`)
  - IssueDate (退貨日期)
  - Maker / Examine Date / Examine Man
- **明細欄位**：
  - MaterialNo, Material, Color
  - Enter QTY (退貨數量 `changeqty`)
  - Stock (目前總庫存 `tstdqty`)
  - Price, Currency
- **特別注意**：主檔沒有 `SampleNo`。退貨是退給供應商，與開發樣品單無關。

---

## 五、PB 商業邏輯與回寫分析 (核心機制)

當使用者點擊「審核 / 過帳 (`cfmchk='Y'`)」時，觸發 `w_mr115.ue_updatestock`，這段代碼執行了 ERP 系統中最複雜的**連鎖回推 (Chain Reversal)** 邏輯：

### 1. 防呆檢查
- **盤點阻擋**：若系統參數 `stocktaking = 'T'`，阻擋退貨。
- **退貨量限制**：`退貨量 (changeqty)` 不可大於 `原入庫量 (beforeqty/inqty)`。
- **負庫存限制**：若扣減後庫存小於 0，標記紅色 (`diff=1`) 並阻擋存檔。

### 2. 回寫 MR105 (入庫單明細)
- 根據退貨數量，**反向扣減原入庫單的入庫量**：
  - `mr106(入庫).changeqty = mr106.changeqty - 退貨量`
  - `mr106(入庫).priceqty = mr106.priceqty - 退貨計價量`
  - `mr106(入庫).mamount = 更新後數量 * 單價`

### 3. 回寫 MR046 (採購單明細)
- 透過入庫單的 `importgkey` 追蹤回 `mr046`：
  - `mr046.priceqty = mr046.priceqty - 退貨計價量`
- **狀態重啟**：如果扣減後 `mr046.priceqty < mr046.quantity`，則將 `mr046.chk` 更新為 `'N'` (重啟該明細的未交貨狀態)。

### 4. 回寫 MR045 (採購單主檔)
- 若採購明細被重啟 (`chk='N'`)：
  - 更新 `mr045.status = '2'` (入庫中，表示還有未交貨數量)。
  - 若全部明細都被退回到 0，則 `mr045.status = '1'` (採購中)。
- **更新付款金額**：重新計算並更新 `mr045.pamount` (Sum of priceqty * mprice)。

---

## 六、庫存異動分析

1. **扣減實體庫存**
   - `mr035.tstdqty = mr035.tstdqty - mr106.changeqty`
2. **重新計算移動平均成本**
   - 根據系統參數 `averagecost='T'`，退貨會**反向重新計算**平均單價：
     `新平均單價 = ((原庫存量 * 原平均單價) - (退貨量 * 採購單價)) / (原庫存量 - 退貨量)`
   - 並更新回 `mr035.mprice`。
3. **寫入異動明細 (`mr038`)**
   - 新增一筆紀錄，其中 **`mtype = '3'`** (退貨數據)。
   - `qty = 退貨量`，`mprice = 計算後的平均單價`。

---

## 七、與 FA (財務) 的關係

- PB 原始碼中 `w_mr115.srw` **沒有直接寫入任何 FA 表** (如 `fa030`, `fa034`)。
- 財務的應付帳款卡控是透過：
  1. MR115 阻擋已付款 (`mr045.status = '4'`) 的入庫單進行退貨。
  2. 退貨後直接扣減 `mr045.pamount`，讓 FA 模組去讀取最新的 `mr045` 請款金額。

---

## 八、Pattern 判斷

**Pattern B + Transfer (From MR105) + Inventory Posting (Stock Out + Moving Average Recalculation) + Source Reversal (Update MR105/MR046/MR045)**

這是一個具有高度破壞性與複雜連鎖反應的 Special Pattern。

---

## 九、輸出結論

1. **極度複雜的回推機制**：MR115 不只是扣庫存，它還會**竄改已經審核的入庫單 (`mr105`)** 與 **採購單 (`mr045`)** 的歷史數據 (包含數量與狀態)。這在現代 ERP 設計中屬於高風險的「硬更新 (Hard Update)」，未來在 Django 後端實作時，這段邏輯必須包裝在嚴謹的 `Database Transaction` 中。
2. **共用 Table 但邏輯不同**：雖然 MR115 共用 `mr105` (`mtype='3'`)，但其 `ue_updatestock` 的複雜度遠超 MR110。
3. **開發先決條件**：
   - 絕對不能先開發 MR115。必須先完成：
     - `MR045` (採購單) 及其狀態機
     - `MR105` (入庫單) 及其庫存增加機制
     - `InventoryService` (移動平均成本算法)
   - 此作業為 **P3**，應排在 MR105 穩定之後。
4. **財務防呆**：必須在後端 API 嚴格實作 `mr045.status == '4'` 的阻擋機制，否則會導致財務帳戶已經付錢但材料卻被退掉的嚴重異常。
