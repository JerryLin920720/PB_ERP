# Legacy Analysis Phase 2A：MR035 料號主檔設定作業深度分析

## 一、Legacy PB 檔案盤點

針對 MR035 相關程式碼進行盤點，發現以下 PB 檔案：

- **Main Window**: `w_mr035.srw`
- **DataWindows (Master/List)**:
  - `d_mr035_master.srd` (主檔編輯區)
  - `d_mr035_list.srd` (左側清單)
- **DataWindows (Detail)**:
  - `d_mr035_detail_mr036.srd` (明細表：供應商料號對照)
- **DataWindows (Query/Report)**:
  - `d_mr035_query.srd`, `d_mr035_query_where.srd`, `d_mr035_query_other.srd`
  - `d_mr035_report_1.srd`, `d_mr035_report_2.srd`
- **附屬視窗 / F2**:
  - `w_mr035_query_f2.srw` (開窗查詢)
  - `d_mr035_query_f2.srd`

> **結論**：MR035 具備主檔 (`mr035`) 與明細表 (`mr036`)，且包含進階的查詢與報表列印 DataWindow。

---

## 二、DataWindow SQL 與資料表對應

### 1. 主表 (Master)：`mr035`
SQL 擷取自 `d_mr035_master.srd`：
```sql
SELECT mr035.gkey, mr035.mr015gkey, mr035.mr016gkey, mr035.mr020gkey,
       mr035.mr025gkey, mr035.mr030gkey, mr035.mr031gkey, mr035.mr010gkey,
       mr035.mstkno, mr035.extract, mr035.extraddr, mr035.extract1,
       mr035.extraddr1, mr035.oldmstkno, 
       mr015.matno, mr015.matcname, mr015.matename,
       mr016.smatno, mr016.smatcname, mr016.smatename,
       mr010.clrcode, mr010.clrnm, mr010.clrenm,
       ... (其他屬性關聯)
FROM mr035 
LEFT JOIN mr010 ON mr010.gkey = mr035.mr010gkey
LEFT JOIN mr015 ON mr015.gkey = mr035.mr015gkey
LEFT JOIN mr016 ON mr016.gkey = mr035.mr016gkey
LEFT JOIN mr020 ON mr020.gkey = mr035.mr020gkey
LEFT JOIN mr025 ON mr025.gkey = mr035.mr025gkey
LEFT JOIN mr030 ON mr030.gkey = mr035.mr030gkey
LEFT JOIN mr031 ON mr031.gkey = mr035.mr031gkey
```
**分析**：主檔表為 `mr035`。透過 LEFT JOIN 將所有材料的基礎屬性（大類、小類、顏色、厚度、幅度、紋路、加工方式）帶出顯示名稱。

### 2. 明細表 (Detail)：`mr036`
SQL 擷取自 `d_mr035_detail_mr036.srd`：
```sql
SELECT mr036.gkey, mr036.mr035gkey, mr036.mstkno, mr036.extract,
       mr036.spcrcd, mr036.ba015gkey, ba015.factno, ba015.shortname,
       mr036.mprice, mr036.quotationdate
FROM mr036 
LEFT JOIN ba015 ON mr036.ba015gkey = ba015.gkey
```
**分析**：明細表為 `mr036`，關聯欄位為 `mr036.mr035gkey = mr035.gkey`。這是一個「供應商料號對照與報價明細表」，依賴 `ba015` 取出材料商（廠商）資訊。

---

## 三、畫面欄位分析

### 1. 必填欄位 (Required)
根據 PB 邏輯 (`w_mr035` 的 `constructor`)：
- **一般模式**：`mr035_mstkno` (料號)、`mr035_extract` (中文摘要)。
- **系統自動組合模式 (is_type=2)**：除上述外，強制必填 `mr010_clrcode` (顏色)、`mr015_matno` (大類)、`mr016_smatno` (小類)。
- **明細表**：`ba015_factno` (廠商編號)。

### 2. 唯讀/保護欄位 (Readonly/Protect)
- 編輯狀態時 (`wf_modify_protect('1')`)，若系統啟用料號自動組合，則基礎屬性欄位 (`mr010_clrcode`, `mr015_matno`, `mr020_depthno` 等) **全部反灰鎖定不可改**。
- `mr035_mstkno` 在自動組合模式下本身也是 Readonly。

### 3. 下拉選單欄位 (Dropdowns)
- `mr035_mctpe` (性質)：1:成品, 2:半成品, 3:材料, 4:托外加工, 5:常備料, 6:消耗品, 7:零件, 8:工具(模具)
- `mr035_chk` (裁斷控制)：0:不裁斷, 1:裁斷

### 4. F2 Lookup 欄位
主表：
- `mr010_clrcode` -> `d_mr010_query_f2` (顏色)
- `mr015_matno` -> `d_mr015_query_f2` (大類)
- `mr016_smatno` -> `d_mr016_query_f2` (小類，受大類連動過濾)
- `mr020_depthno`、`mr025_breadthno`、`mr030_veinno`、`mr031_makeno` 分別對應各自的基礎設定表 F2。

明細表：
- `ba015_factno` -> `d_ba015_query2_f2` (過濾 `type = '2'` 供應商)

---

## 四、PB 商業邏輯分析

透過解析 `w_mr035.srw` 的事件邏輯，發現以下核心商業邏輯：

1. **系統參數控制料號組合 (`open` / `ue_postdoubleclicked`)**：
   - 系統依賴參數 `mstknotype` 與 `zhmstkno`。
   - `is_type = '1'`：手動自由輸入。
   - `is_type = '2'` (複雜自動組合)：用戶在畫面上雙擊時，系統會解析規則 (如 `A3,B2,C2,D3...`)，自動從畫面上的顏色、大類、小類、厚度等欄位，組合出完整的 `mr035.mstkno` 以及 `mr035.extract` (中文摘要)。
   - **這是本支作業翻新時最大的挑戰，必須在前端實作此「自動編碼連動」邏輯。**
2. **防呆檢查 (`ue_itemchanged` / `ue_presave`)**：
   - `ue_itemchanged`：檢查輸入位數是否符合系統參數定義的最短長度。
   - `ue_presave`：檢查料號是否與資料庫中既有的 `mstkno` 重複。
3. **預設值產生**：
   - `pfc_postinsertrow`：`mr035_issuedate` 自動帶入系統當前時間 (`GetSysDate()`)。

---

## 五、現有 ERP 實作狀態

| 項目 | 狀態 | 說明 |
| --- | --- | --- |
| **Backend Model** | **僅供 Lookup** | `mr035` Table 存在於 `models.py`，但標記為 `managed=TESTING`（唯讀防呆用）。未見 `mr036`。 |
| **Backend Serializer**| **尚未實作** | 無 `Mr035Serializer`。 |
| **Backend ViewSet** | **半完成** | `Mr035ViewSet` 存在但僅為 Dummy / Mock 設定。 |
| **Backend Router** | **已註冊** | `urls.py` 中有註冊 `mr035` 以避免啟動報錯。 |
| **Frontend Page** | **尚未實作** | 沒有 `Mr035Sheet.jsx` 檔案。 |
| **Frontend Lookup** | **已實作** | `lookupRegistry.js` 內有 `mr035` 設定，供 DP030 等其他模組 F2 選取料號。 |
| **Sidebar / Menu** | **已註冊** | `Sidebar.jsx` 中有 `{ code: 'mr035', label: '料號主檔設定作業' }`。 |

---

## 六、Pattern 判斷

根據 PB 結構（主檔 `d_mr035_master` 與明細檔 `d_mr035_detail_mr036` 共存的視窗結構），該作業擁有完整的主檔與一個關聯明細表（供應商報價對照）。

- **Pattern 判斷結論：Pattern B (Master-Detail)**。

*(註：雖然 UI 表現上有點像單檔維護，但因含有明細表，應套用標準 ERPSheetPage 的 Master-Detail Pattern)*。

---

## 七、輸出結論

1. **正確 Pattern**：**Pattern B**。
2. **主表 / 明細表**：主表為 `mr035`，明細表為 `mr036` (以 `mr035gkey` 關聯)。
3. **F2 Lookup 依賴**：依賴 `mr010`, `mr015`, `mr016`, `mr020`, `mr025`, `mr030`, `mr031` (上述皆為 Pattern A/B 之設定作業) 以及 `ba015` (廠商主檔)。
4. **對其他模組的影響**：
   - **DP 開發 (如 DP030)**：極度依賴 MR035 的料號 Lookup。
   - **MR045 (採購) / MR105 (入庫) / MR110 (發料)**：均必須參考此表，無此主檔將導致後續單據無法運作。
5. **開發優先級**：**P0 (最優先/阻擋性任務)**。
6. **後續前後端實作建議**：
   - **Backend**：需將 `Mr035` Model 的 `managed` 屬性改回 True，補齊完整欄位，並新增 `Mr036` Model。建立支援 `deep_save` 的 Serializer。
   - **Frontend**：建立 `Mr035Sheet.jsx`。必須將 PB 中的「系統參數自動組合料號邏輯」(is_type=2) 遷移至 React 前端 (例如在 `onCellChange` 時動態組合 `mstkno` 和 `extract`)。
7. **風險與待確認事項**：
   - 舊系統的自動組合邏輯嚴重依賴後端的 `sys_parameter` (`mstknotype`, `zhmstkno`)。若翻新時不考慮保留這些彈性，需要與使用者確認是否直接寫死當前的組合規則，或者改以更現代的設定方式呈現。
   - 在未完成 MR035 的 CRUD 之前，DP 模組雖可看見 Lookup 畫面，但將無法新增測試用料號。
