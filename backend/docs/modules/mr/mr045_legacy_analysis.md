# Legacy Analysis Phase 2B：MR045 樣品採購單管理深度分析

## 一、Legacy PB 檔案盤點

針對 MR045 相關程式碼進行盤點，發現以下 PB 檔案：

- **Main Window**: `w_mr045.srw`
- **轉單與輔助 Window**:
  - `w_mr053_to_mr045.srw` (從 MR053 樣品需求單轉入)
  - `w_mr045_mr046_f2.srw`
  - `w_mr045_show_priceqty.srw` (點擊計價數量時彈出的子視窗)
  - `w_fa034_mr045.srw` (FA 財務應付帳款對接視窗)
- **DataWindows (Master/List)**:
  - `d_mr045_master.srd` (主檔編輯區)
  - `d_mr045_list.srd` (左側清單)
  - `d_mr045_query.srd`, `d_mr045_query_where.srd`
- **DataWindows (Detail)**:
  - `d_mr045_detail.srd` (明細表編輯區，實際對應資料表為 mr046)
- **DataWindows (轉單與更新)**:
  - `d_mr053_to_mr045*.srd` (轉單查詢用)
  - `d_mr046_update_mr053.srd` (回寫更新 MR053 狀態)
  - `d_mr105_update_mr045.srd`, `d_mr105_update_mr046.srd` (MR105 樣品入庫時更新採購單數量用)
- **DataWindows (報表)**:
  - `d_mr045_report*.srd`

> **結論**：MR045 是一支具備高度複雜關聯的作業，不僅有 Master-Detail，還涉及了「前置轉單 (MR053)」、「後置入庫 (MR105)」、「財務拋轉 (FA034)」，以及「審核與電子簽核」流程。

---

## 二、資料表與主從關係

### 1. 主表 (Master)：`mr045`
- **主鍵**：`gkey`
- **關鍵欄位**：
  - `mpono` (採購單號)
  - `issuedate` (開單日期/採購日期)
  - `ba015gkey` (供應商，對應 ba015)
  - `ba060gkey` (幣別)
  - `status` (狀態：1:採購中 / 2:入庫中 / 3:已完成 / 4:已付款)
  - `mamount` (金額)、`tax` (稅額)、`mtotalamount` (總金額)
  - `es101gkey` (建檔人/採購人員)
  - `mr045_approve` (審核狀態 Y/N)
  - `mr045_aes101gkey` (審核人)
  - `mr045_printsigner` (電子簽名 Y/N)

### 2. 明細表 (Detail)：`mr046`
- **主鍵**：`gkey`
- **主從關聯欄位**：`mr046.mr045gkey = mr045.gkey`
- **關鍵欄位**：
  - `serialno` (序號)
  - `mr035gkey` (關聯 MR035 料號主檔)
  - `material` (材料名稱/摘要)
  - `colorname` (顏色名稱)、`colorcode` (色號)
  - `quantity` (採購數量)、`unit` (單位)
  - `mprice` (單價)、`mamount` (金額)
  - `priceqty` (計價數量)
  - `dp030gkey` (樣品編號，對應 dp030)
  - `expecting` (預計交期)
  - `chk` (入庫檢查 Y/N)

---

## 三、DataWindow SQL 分析

### 1. 主表 SQL (`d_mr045_master.srd`)
```sql
SELECT mr045.gkey, mr045.mpono, mr045.issuedate, mr045.ba015gkey, ...
       ba015.factno, ba015.shortname, es101.englishname,
       mr045.mamount, mr045.tax, mr045.mtotalamount, mr045.status,
       mr045.approve, mr045.aes101gkey, es101b.englishname as approver,
       mr045.printsigner, mr045.typeid, mr045.shiptype, mr045.ba075gkey
FROM mr045
LEFT JOIN ba015 ON ba015.gkey = mr045.ba015gkey
LEFT JOIN es101 ON es101.gkey = mr045.es101gkey
LEFT JOIN es101 es101b ON mr045.aes101gkey = es101b.gkey 
...
```

### 2. 明細表 SQL (`d_mr045_detail.srd`)
```sql
SELECT mr046.gkey, mr046.mr045gkey, mr046.serialno, mr046.mr035gkey,
       mr035.mstkno, mr046.material, mr046.colorname, mr046.colorcode,
       mr046.quantity, mr046.priceqty, mr046.unit, mr046.mprice,
       mr046.mamount, mr046.expecting, mr046.chk, mr046.dp030gkey,
       dp030.sampleno, mr035.tstdqty, mr035.netqty, mr046.needqty, mr046.buckleqty
FROM mr046
LEFT JOIN mr035 ON mr035.gkey = mr046.mr035gkey
LEFT JOIN dp030 ON mr046.dp030gkey = dp030.gkey
```

---

## 四、畫面欄位分析

### 1. 必填欄位
- **Master**：`mpono` (採購單號), `issuedate` (日期), `year` (年份), `ba015_factno` (供應商)。若為 wx 客戶，額外要求 `ba075gkey` (付款方式), `shiptype` (發貨方式)。
- **Detail**：`mr046_material` (材料)。

### 2. F2 Lookup 欄位
- **Master**：
  - `ba015_factno` -> `d_ba015_query2_f2` (供應商，限定 type in '2','3')
  - `contact` -> `d_ba016_query_f2` (聯絡人，依賴 ba015gkey)
  - `payment` -> `d_ba076_query_f2` (付款條件)
- **Detail**：
  - `mr035_mstkno` -> `d_mr035_query_f2` (料號)。**選中後自動帶回 mr035 的 mstkno, material (extract), colorname, colorcode, unit, 以及 tstdqty (總庫存量)**。

### 3. 自動計算與防呆
- **Master**：`mamount` (明細金額加總) + `tax` (稅額) = `mtotalamount` (總金額)。
- **Detail**：雙擊 `mr046_priceqty` 時會彈出 `w_mr045_show_priceqty` 進行計價數量管理。

---

## 五、PB 商業邏輯分析

1. **材料價格與報價帶出邏輯 (重點)**：
   在 PB 程式碼中，當明細選定材料 (`mr035gkey`) 並有了供應商 (`ba015gkey`) 後，系統會發送一段動態 SQL 至 `mr036` 查詢該供應商針對該材料的最新報價 (`max(mr036.mprice)`)：
   ```sql
   SELECT max(mr036.mprice) FROM mr036 WHERE ba015gkey = '...' AND mr036.mr035gkey = '...' 
   ```
   並自動帶入 `mr046_mprice`。
2. **單據狀態連動 (`wf_changstatus`)**：
   系統會根據明細表的 `chk` (入庫旗標) 決定 Master 狀態：
   - 只要有一筆入庫 => 狀態變更為 `2` (入庫中)。
   - 全數入庫 => 狀態變更為 `3` (已完成)。
   - 未入庫 => 狀態變更為 `1` (採購中)。
3. **刪除限制 (`wf_checkdelete`)**：
   - 若狀態為 `3` (已完成) 或 `4` (已付款)，不允許編輯與刪除。
   - 若明細的 `priceqty > 0` (已發生入庫)，不允許刪除該明細。
4. **審核流程**：
   - `ue_check` 事件中，會將 `mr045_approve` 設為 `Y`，並記錄當前使用者為 `mr045_aes101gkey`。
   - 支援 `mr045_printsigner` (電子簽名) 旗標。
5. **外部轉單依賴**：
   - **從 MR053 轉入**：透過 `w_mr053_to_mr045`，存檔時會呼叫 `ids_mr053` 將轉出的 mr046gkey 回寫到 mr053。

---

## 六、現有 ERP 實作狀態

經檢查目前後端 (`pb_erp_system/backend`) 與前端 (`pb_erp_system/frontend`)：

| 項目 | 狀態 | 說明 |
| --- | --- | --- |
| **Backend Model** | **不存在** | 尚未建立 `Mr045` 與 `Mr046` model。 |
| **Backend Serializer**| **不存在** | 尚未建立。 |
| **Backend ViewSet** | **不存在** | 尚未建立。 |
| **Frontend Page** | **不存在** | 尚未建立 `Mr045Sheet.jsx`。 |
| **Sidebar / Menu** | **已註冊** | `Sidebar.jsx` 中有 `{ code: 'mr045', label: '樣品採購單管理' }`。 |

> **結論**：MR045 是一張完全未實作（Blank Slate）的白紙，沒有任何預留的 Model 或暫時 API。

---

## 七、Pattern 判斷

該作業具備：
1. 主表 (MR045) 與明細表 (MR046)。
2. 有明確的審核按鈕與狀態 (Approve = Y/N)。
3. 提供列印功能。
4. 具備前置轉單 (MR053 -> MR045) 的彈出視窗流程。

- **Pattern 判斷結論：Pattern B (Master-Detail) + Approval + 轉單流程 (Transfer Workflow)**。
  *(開發時可參考 DP040/DP010 的 Master-Detail + Approval 架構)*。

---

## 八、輸出結論

1. **正確 Pattern**：**Pattern B + Approval + Transfer Workflow**。
2. **主表 / 明細表**：主表為 `mr045`，明細表為 `mr046`。
3. **資料流與關聯**：
   - **來源**：MR053 樣品需求單 (可選)。
   - **依賴**：MR035 料號主檔 (帶出規格/名稱/單位)、MR036 供應商報價 (帶出單價)、BA015 供應商。
   - **去向**：作為 MR105 樣品入庫的來源單據；並作為 FA034 財務應付帳款的請款依據。
4. **實作優先級**：**P1 (高優先級)**。
   - 必須等 MR035 (料號) 與 BA015 (供應商) 完成或具備唯讀基礎後，才能進行 MR045 的開發。它會阻擋下游的入庫 (MR105) 模組。
5. **風險與待確認事項**：
   - **自動帶價邏輯**：目前 PB 是直接在前端對 `mr036` 下 SQL 撈取 max(mprice)。在翻新時，應由後端 ViewSet 提供 `get_material_price` 接口，當前端改變料號與供應商時向後端查詢。
   - **轉單介面實作**：需要在前端實作一個「轉單選擇視窗」(類似 DP040 選取來源單據的模式)，列出未完成的 MR053 供使用者勾選載入明細。
