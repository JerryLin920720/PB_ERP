# Legacy Analysis Phase 2C：SA040 P/I Order Management Deep Dive

## 一、分析摘要

SA040 負責將已存在的正式訂單 (SA030 P/O 單) 拋轉並統合成 P/I (Proforma Invoice 形式發票)。
P/I 是財務應收 (FA) 與出貨押匯 (L/C) 的重要前置單據。經過分析，SA040 的結構比 SA030 簡單得多，沒有進入到尺碼 (Size) 級別的明細，而是停留在「訂單 (PO) 級別」的總雙數與總金額加總。

## 二、SA040 定位

* **作業定位**：形式發票管理。主要是供業務部產生 P/I 列印給客戶，確認總金額、銀行資訊與付款條件。
* **資料來源**：極度依賴從 SA030 (P/O 單) 拋轉，不允許手動憑空新增一整張 P/I (通常必須綁定至少一張 PO)。
* **多對一關係**：允許將多張 SA030 訂單 (例如同一個客戶、同一個交期的訂單) 合併拋轉成一張 SA040 (P/I)，以利後續客戶開立一張總額的信用狀 (L/C)。

## 三、PB Window / DataWindow 清單

| DataWindow / UI 區塊 | 對應 SRD | 資料表 | 說明 |
| --- | --- | --- | --- |
| **P/I 主檔** | `d_sa040_master` | `sa040` | P/I No, 日期, 客戶等。 |
| **訂單明細** | `d_sa040_detail_sa041` | `sa041` | 記錄這張 P/I 包含了哪些 SA030 訂單。 |
| **加扣款明細** | `d_sa040_detail_sa042` | `sa042` | 針對此 P/I 的整體加扣款。 |
| **拋轉查詢面板** | `d_sa040_reference_sa030_query` | 無 | 供使用者查詢並勾選尚未轉 P/I 的 PO 單。 |
| **P/I 報表預覽** | `d_sa040_report` (及其附屬) | 無 | 列印給客戶的正式 Invoice。 |

## 四、資料表結構與關聯

```text
sa040 (P/I 主檔)
 ├─ sa041 (P/I 明細 - 綁定 PO) [FK: sa040gkey, 關聯: sa030gkey]
 └─ sa042 (P/I 加扣款) [FK: sa040gkey]
```

* **sa040**：`pino` (P/I號碼), `ba010gkey` (客戶), `issuedate` (發出日), `custdate` (客交期)。以及來自於 `sa030` 延伸的 Bank, Payment, Mark 等資訊。
* **sa041**：主要儲存 `sa030gkey`。這是一張 Mapping 表，用來將 P/I 與 PO 連結。
* **sa042**：與 `sa035` 結構幾乎相同，用來記錄 P/I 層級的打折或外加費用 (`computemode`, `agument`, `amount`)。

## 五、拋轉流程與防呆機制 (SA030 → SA040)

1. **使用者操作**：在 SA040 中點擊「載入 PO」，系統彈出 `d_sa040_reference_sa030_query`。
2. **過濾條件**：系統會列出該客戶下，尚未完全被轉入 P/I 的 SA030 訂單。**(PB 中可能有狀態防呆，如需審核通過才能轉 P/I)**。
3. **回寫機制 (Side Effect)**：
   * 當 SA030 成功轉入 SA041 後，系統會更新 `sa030` 的某個旗標或寫入 `pino` 欄位，標示該單已經有 P/I。
   * 若在 SA040 中刪除 `sa041`，必須同步清空 `sa030` 上的標記，使其可再次被拋轉。

## 六、與 FA / SM / LC 的關聯

* **FA (財務應收)**：P/I 是向客戶請款的重要憑證，財務模組會查詢 P/I 的總金額來核對收款。
* **L/C (信用狀)**：SA096 (未收到 L/C 查詢) 高度依賴 SA040，因為通常是先發 P/I，客戶再依 P/I 的金額開立 L/C。
* **SM (出貨)**：出貨文件 (Packing List / Commercial Invoice) 會帶出對應的 P/I No，並進行出貨金額的最終核算。

## 七、前端 UI 分析 (Pattern B)

* **適用框架**：標準的 **Pattern B** (Master-Detail)。
* 比起 SA030，SA040 非常輕量，沒有尺碼網格，明細只有一層 (PO清單 與 加扣款)。
* **特殊需求**：
  * 需要一個「選擇來源單據」的 Modal (類似 MR045 的轉單視窗)。
  * 需要一個強大的「重新計算總金額」按鈕，因為 P/I 的金額是動態加總旗下所有 PO 的 `sa030.custamt` 加上 `sa042` 的加扣款。

## 八、Backend API 建議

1. **DeepSaveMixinV2**：**非常適合**。因為只有 Master 與第一層 Detail，直接套用 Mixin 即可完成 CRUD。
2. **獨立 Service**：
   * `SaPiOrderDeepSaveService`：包裝 DeepSave，加上總金額重算邏輯。
   * `SaPoToPiTransferService`：處理 SA030 -> SA040 的拋轉與 `sa030` 回寫標記的 Transaction 邏輯。
3. **報表**：P/I 列印是極為關鍵的對外文件，需投入資源開發精確的 PDF 報表模版 (`SaPiPrintService`)。

## 九、風險與待確認事項

1. **轉單防呆遺漏**：如果後端沒有鎖死「同一張 PO 不能重複轉到多張 P/I (除非有分批機制)」，會造成財務應收帳款重複計算。
2. **匯率與幣別衝突**：如果使用者將「不同幣別」的 SA030 合併成同一張 P/I，系統應如何防呆？（通常 PB 會在轉單查詢畫面鎖定只能勾選相同幣別的單據）。
