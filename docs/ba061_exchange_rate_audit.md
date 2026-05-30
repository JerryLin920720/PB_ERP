# BA061 匯率換算邏輯稽核與分析報告

本文件整理 PowerBuilder 原始碼 `w_ba061.srw` 中關於交叉匯率設定（交叉匯率對與歷程設定）的連動換算邏輯，並對比目前 React / Django 系統的實作差異與改善方案。

---

## 一、原始 PowerBuilder 邏輯稽核

### 1. 原始 PB 檔案清單
- **主視窗元件**：[w_ba061.srw](file:///Users/linjerry/Documents/youngnet/PB_ERP/YNE/YNE.CODE/ba.pbl/w_ba061.srw)
- **主檔 DataWindow**：`d_ba061_master` (對應資料表 `ab230`)
- **明細檔 DataWindow**：`d_ba061_detail_ab231` (對應資料表 `ab231`)

### 2. 匯率與幣別相關欄位
- **主檔 (`ab230`) 欄位**：
  - `ba060gkey1`：來源原始幣別 (ForeignKey 關聯至 `ba060`)
  - `ba060gkey2`：目標兌換幣別 (ForeignKey 關聯至 `ba060`)
  - `exrate`：當前啟用之財務匯率
- **明細歷史檔 (`ab231`) 欄位**：
  - `exrate`：歷史兌換匯率值
  - `effectivedate`：生效日期時間
  - `chk`：是否啟用為當前財務匯率 (`'Y'` / `'N'`)

### 3. 欄位觸發連動與換算公式

#### A. 主檔幣別變更事件 (`dw_master::ue_postitemchanged`)
*   **觸發欄位**：`ba060gkey1` 或 `ba060gkey2`。
*   **防呆校驗**：
    1. 判斷幣別組合是否重複（同一個來源/目標組合已存在於其他列），若重複則跳出訊息並回復原值。
    2. 若 `ba060gkey1 === ba060gkey2` (來源與目標相同)，則將主檔 `exrate` 自動設定為 `1.0`，且將所有明細列的匯率也強制設定為 `1.0`。
*   **鏡像/相反對處理**：
    1. 當 `ba060gkey1 != ba060gkey2` 時，自動搜尋是否存在相反對幣別（例如已有一筆為 `A ➔ B`，當前正在異動為 `B ➔ A`）：
       - 若相反對已存在，則將相反對的啟用匯率與所有明細匯率設為互數倒數：`1 / exrate`。
       - 若相反對不存在，則自動在主檔與明細中新增一列鏡像相反對，並自動將匯率代入 `1 / exrate`。
    *(註：此「相反對」與「鏡像/倒數匯率」在 Django 後端的 `models.py` 中的 `save()` 與 `delete()` 方法中已得到完整、健壯的實作，因此前端無須強行實作這套複雜的多列與跨主檔連動新增，只需交給後端存檔時自動生成與更新即可)*

#### B. 明細欄位變更事件 (`dw_1::ue_postitemchanged` - 即明細 DataWindow)
*   **觸發欄位 `chk` (啟用狀態)**：
    *   若設為 `'Y'`：
        1. 取得該明細列的 `exrate`，同步更新到主檔的 `exrate` 欄位。
        2. 將同一個主檔下的其他明細列 `chk` 設為 `'N'`。
    *   若設為 `'N'`：
        1. 重新搜尋同主檔下，生效日期 (`effectivedate`) 最大的那一列明細。
        2. 將該列設為 `chk = 'Y'`，並將其 `exrate` 同步更新到主檔的 `exrate` 欄位。
*   **觸發欄位 `effectivedate` (生效時間)**：
    1. 重新評估所有明細列。
    2. 自動尋找 `effectivedate` 最大的那列明細並設為 `chk = 'Y'`，將其餘列設為 `chk = 'N'`。
    3. 將該最新列的 `exrate` 同步到主檔的 `exrate` 欄位。
*   **觸發欄位 `exrate` (匯率值)**：
    1. 若目前被修改匯率的明細列 `chk` 為 `'Y'`，則同步將修改後的匯率值更新到主檔的 `exrate` 欄位。

### 4. 匯率資料來源
*   **核心來源**：使用者在歷程明細中登錄的 `exrate`。
*   **對照幣別**：來自全域幣別主檔 `ba060`。
*   **計算方式**：由前端 DataWindow 即時運算，並利用 f_gkey 賦予主鍵，隨後透過資料庫 Update 儲存。

---

## 二、現行 React / Django 實作現況與缺漏

### 1. 畫面欄位對照
*   **主檔表單/表格**：來源原始幣別 (`ba060gkey1`)、目標兌換幣別 (`ba060gkey2`)、當前匯率 (`exrate`，唯讀)。
*   **明細表格**：兌換匯率值 (`exrate`)、生效時間日期 (`effectivedate`)、當前財務匯率 (`chk`，開關/Switch)。

### 2. Django 後端邏輯
後端 `Ab230` 和 `Ab231` 的 `save` 觸發器已正確處理了倒數匯率、相反對（鏡像對）的自動更新或刪除。因此：
*   如果前端正確送出啟用明細，後端會自動把相反對的明細與主檔同步倒數更新。
*   若同幣別被保存，後端會重設 exrate 為 1.0。

### 3. 前端目前缺漏的邏輯 (React 畫面未換算問題)
當使用者在 React 的 `Ba061Sheet.jsx` 編輯狀態下，進行以下互動時，畫面完全沒有任何即時連動，必須等手動存檔並重新載入後才被動由後端更新：
1.  **修改明細啟用開關 (`chk`)**：
    *   目前點擊 Switch 開啟 `'Y'`，同主檔其他明細的 `'Y'` 不會自動取消，且主檔的「當前匯率」也沒有即時更新。
2.  **修改生效日期 (`effectivedate`)**：
    *   目前修改生效日期，不會自動將最大日期的那一列標記為 `chk = 'Y'`，且主檔當前匯率也沒更新。
3.  **修改明細匯率 (`exrate`)**：
    *   在已經是啟用狀態 (`chk = 'Y'`) 的明細列上修改匯率，主檔當前匯率欄位不會即時同步變更。
4.  **主檔幣別相同限制**：
    *   主檔中若來源原始幣別等於目標兌換幣別，雖然有 validateAll 攔截，但在畫面輸入時，未即時將 `exrate` 預設為 `1.0`。

---

## 三、優化修正策略

1.  **擴充 `createMasterDetailSheet.jsx` 通用工廠函數**：
    *   安全地在 `detail` 配置中支援 `onFieldChange` 回呼函數。
    *   在 detail cell 欄位異動 (`handleDetailFieldChange`) 時，呼叫該回呼，並傳遞 `row`, `field`, `value`, `nextRow`, `detailRows`, `masterRows`, `selectedMaster` 以及 `handleMasterFieldChange` (可用於更新主檔欄位)。
2.  **在 `Ba061Sheet.jsx` 實作 `detail.onFieldChange` 連動邏輯**：
    *   當 `chk` 改變時，連動更新同主檔下其他明細的 `chk` 與主檔 `exrate`。
    *   當 `effectivedate` 改變時，找出最大生效日期明細設定 `chk = 'Y'` 並連動更新主檔 `exrate`。
    *   當 `exrate` 改變且 `chk === 'Y'` 時，更新主檔 `exrate`。
3.  **在 `Ba061Sheet.jsx` 實作 `master.onFieldChange` 連動邏輯**：
    *   當 `ba060gkey1 === ba060gkey2` 時，自動將主檔 `exrate` 設為 `1.0`。
4.  **加入 Debug Log**：
    *   依照要求加上 `[BA061 EXCHANGE]` 前綴的詳細 debug log。

---

## 四、細節確認與機制稽核

### 1. 幣別相同時同步所有明細匯率為 1.0 之 PB 原始碼確認
在原始 PB 檔案 [w_ba061.srw](file:///Users/linjerry/Documents/youngnet/PB_ERP/YNE/YNE.CODE/ba.pbl/w_ba061.srw) 第 248 至 256 行的 `dw_master::ue_postitemchanged` 事件中：
```powerbuilder
			If idw[1].RowCount() > 0 Then
				For M = 1 To idw[1].RowCount()
					idw[1].Object.ab230_ba060gkey1[M] = ls_ba060gkey1
					idw[1].Object.ab230_ba060gkey2[M] = ls_ba060gkey2
					If ls_ba060gkey1 = ls_ba060gkey2 Then
						idw[1].SetItem(M,'exrate',1)
					End If
				Next
			End If
```
這證實了**當主檔來源原始幣別等於目標兌換幣別時，原本 PB 確實會遍歷所有明細歷史列，並強制將其 `exrate` 設為 `1`**。React 版本的 `master.onFieldChange` 實作完全契合此原始邏輯。

### 2. `replaceDetailRows` 的髒資料 (Dirty) 追蹤機制
在 React 共享 CRUD Hook `useMasterDetailCrud.js` 中，`replaceDetailRows(newRows)` 的實作如下：
1. 它會將傳入的 `newRows` (已被 `detail.onFieldChange` 調整過 `chk` 或 `exrate` 的最新明細列陣列) 全部對齊寫入 `detailRows` 狀態。
2. 只要預設 `{ markDirty: true }`，它會遍歷所有明細列，將每列的 `gkey` 作為 key 塞入 `editedDetails` 暫存物件中。
3. `editedDetails` 包含了變更後的最新明細欄位值。這會觸發 `isDirty = true`，使儲存按鈕解鎖。
4. 當點擊存檔時，`handleSaveAll` 會遍歷 `editedDetails` 的所有列，並為每筆明細行發送一個 `PUT /api/ab231/{gkey}/` 請求。
5. 這確保了**不只畫面狀態被更新，所有被自動從 `'Y'` 改成 `'N'` 的 rows、被啟用的 row，以及 master 狀態皆會被標記為 dirty，並在存檔時全部透過 API 送出保存**。

---

## 五、最終驗證記錄

### 1. 測試資料範例與修改前狀態
*   **全域幣別**：
    *   `USD` (美金) Gkey: `"2605280456424258614A"`
    *   `EU` (歐元) Gkey: `"2605280457170236662A"`
*   **交叉匯率主檔 (`ab230`)**：
    *   Gkey: `"2605280510415793671A"` (USD ➔ EU)
    *   當前匯率 (`exrate`)：`0.80000000` (修改前)
*   **歷史明細檔 (`ab231`)**：
    *   Row 1：Gkey `"2605280510447432447A"`, 匯率 `0.80000000`, 生效時間 `2026-05-28 12:00`, `chk = Y` (修改前為啟用)
    *   Row 2：Gkey `"2605280510474484072A"`, 匯率 `0.82000000`, 生效時間 `2026-05-28 14:00`, `chk = N` (修改前為未啟用)

### 2. 修改後畫面狀態 (將 Row 2 啟用切換為 'Y')
*   **明細列變更**：
    *   Row 1 的 `chk` 自主改為 `'N'`。
    *   Row 2 的 `chk` 自主改為 `'Y'`。
*   **主檔連動**：
    *   主檔「當前匯率」從 `0.80000000` 自動變更為 `0.82000000`。
*   **Dev 控制台日誌 (Vite 開發模式)**：
    ```text
    [BA061 EXCHANGE] changed field: chk
    [BA061 EXCHANGE] currency: 2605280456424258614A -> 2605280457170236662A
    [BA061 EXCHANGE] rate: 0.82
    [BA061 EXCHANGE] foreign amount: null
    [BA061 EXCHANGE] local amount: null
    [BA061 EXCHANGE] calculated values: {masterExrate: 0.82, activeDetailGkey: "2605280510474484072A", totalDetailRows: 2}
    ```

### 3. 實際送出的 Save Payload (前端發送的 HTTP 請求)
當點擊「存檔」時，前端將依序發送三個 HTTP 請求至後端 API，這完整包含了所有被自動改動的明細與主檔：

1.  **更新主檔 (PUT `/api/ab230/2605280510415793671A/`)**
    ```json
    {
      "ba060gkey1": "2605280456424258614A",
      "ba060gkey2": "2605280457170236662A",
      "exrate": 0.82000000
    }
    ```

2.  **更新明細一 (PUT `/api/ab231/2605280510447432447A/`)**
    ```json
    {
      "ab230gkey": "2605280510415793671A",
      "exrate": 0.80000000,
      "effectivedate": "2026-05-28T12:00:00.000Z",
      "chk": "N"
    }
    ```

3.  **更新明細二 (PUT `/api/ab231/2605280510474484072A/`)**
    ```json
    {
      "ab230gkey": "2605280510415793671A",
      "exrate": 0.82000000,
      "effectivedate": "2026-05-28T14:00:00.000Z",
      "chk": "Y"
    }
    ```

### 4. 儲存與重新載入結果
-   資料儲存成功，頁面自動重新 Retrieve 載入。
-   **資料庫一致性驗證**：
    -   主檔 `ab230` 中 `exrate` 被更新為 `0.82000000`。
    -   明細檔 `ab231` 中 Row 1 的 `chk` 為 `'N'`，Row 2 的 `chk` 為 `'Y'`。
    -   Django 後端 `save()` 觸發器已被觸發，自動更新了相反鏡像主檔 (EU ➔ USD, `exrate` = `1.21951220`) 以及其下的鏡像明細 (Row 2 鏡像, `exrate` = `1.21951220`, `chk` = `'Y'`)。
    -   重新整理載入後，主從啟用狀態、數值與資料庫完全一致。

