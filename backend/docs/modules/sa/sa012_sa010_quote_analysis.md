# Legacy Analysis Phase 2B：SA012 / SA010 Quote Management Deep Dive

## 一、分析摘要

本次分析釐清了鞋貿 ERP 業務報價流程。經過原始碼比對，確認 `SA012` 與 `SA010` 實為同一套作業系統的延伸與誤傳，PB 實際的 Entry Point 僅有 `w_sa010`，其底層資料表為 `sa010 ~ sa014`。
SA010 報價單具有與 SA030 P/O 單相似的「Master-Detail-SubDetail」三層巢狀結構，但重點在於「客戶報價」與「工廠成本」的維護，而非尺碼網格與裝箱分配。前端架構需要類似 Pattern B-Order 的變體（Pattern B-Quote），並依賴於後端整合 DP (開發模組) 的樣品成本。

## 二、SA012 / SA010 定位與差異

* **是否為不同版本？** 否，只有一個 `w_sa010` 視窗。`SA012` 只是在部分文件或選單中對應到 `sa012` (報價尺碼表) 所產生的名稱混淆。
* **定位**：負責在客戶下正式訂單前，對單一或多個型體進行報價與成本估算。提供報價單列印，並能將報價結果轉入後續的訂單。

## 三、PB Window / DataWindow 清單

| DataWindow / UI 區塊 | 對應 SRD | 資料表 | 說明 |
| --- | --- | --- | --- |
| **查詢條件** | `d_sa010_query_where` | 無 | 查詢面板 |
| **查詢清單** | `d_sa010_query` | `sa010` | 查詢結果清單 |
| **左側選單** | `d_sa010_list` | `sa010` | 編輯區的左側導覽列 |
| **主檔 (Master)** | `d_sa010_master` | `sa010` | 報價主檔 |
| **型體清單 (Detail)**| `d_sa010_detail_sa011` | `sa011` | 型體/顏色明細 |
| **尺碼價格 (Sub-Detail)**| `d_sa010_detail_sa012` | `sa012` | 型體對應的尺碼範圍與報價 |
| **工廠成本 (Sub-Detail)**| `d_sa010_detail_sa013` | `sa013` | (掛在 `sa012` 下) 對應工廠的成本 |
| **附加費用 (Sub-Detail)**| `d_sa010_detail_sa014` | `sa014` | (掛在 `sa011` 下) 該型體其他費用加總 |
| **報表預覽** | `d_sa010_report` 等 | 無/多表 | 列印報價單給客戶 (Proforma Invoice) |

## 四、資料表與欄位結構

```text
sa010 (報價主檔)
 ├─ sa011 (型體/顏色) [FK: sa010gkey]
 │   ├─ sa012 (尺碼/報價) [FK: sa011gkey, sa010gkey]
 │   │   └─ sa013 (工廠/成本) [FK: sa012gkey, sa011gkey, sa010gkey]
 │   └─ sa014 (附加費用) [FK: sa011gkey, sa010gkey]
```

* **sa010**：`qno` (報價單號), `issuedate`, `ba010_custno` (客戶)。
* **sa011**：`styleno` (型體), `color` (顏色), `dp004_gender`, `dp003_shoetype`。
* **sa012**：`sizerun` (尺碼範圍), `price` (報價金額)。
* **sa013**：`ba015_factno` (工廠), 對應成本與毛利結構。
* **sa014**：`typename` (費用名稱), `agument` (+/-)。

## 五、報價流程與 DP 依賴關係

* **建立**：可手動新增，或從 DP 模組的樣品單拋轉。
* **與 DP 成本關聯**：
  * 在 PB 中，SA010 會讀取 `dp030`, `dp031` (DP成本單) 或是 `dp025` (型體資料) 來帶出初期成本作為參考。
  * **(待驗證)** 報價模組通常允許修改單價與成本，修改結果**不會**直接寫回 DP BOM 表，而是保存在 `sa012` / `sa013` 供報價使用。

## 六、與 SA030 / SA020 轉單關係

* PB 中透過 `SA018` 或者是前端功能，可將報價直接轉為 SA020 (預告單) 或 SA030 (P/O 單)。
* 轉換時，`sa010` -> `sa030`, `sa011` -> `sa031`, `sa012` -> `sa032`。
* 此流程可大幅減少 SA030 的輸入負載。

## 七、前端 UI 分析 (Pattern B-Quote)

前端同樣無法使用簡單的 Pattern B。
建議建立 **Pattern B-Quote**，與 Pattern B-Order 相似，但 Tab 區塊不同：
* 取消 `Assortment` 與 `Size Grid` (報價階段無須裝箱)。
* 新增 **Cost Breakdown (成本結構)** 區塊 (`sa013`, `sa014`)。
* 需要一個醒目的 **Print Quotation (預覽報價單)** 按鈕。

## 八、Backend API / Service Layer 建議

1. **DeepSave 需求**：同 SA030，強烈需要 `DeepSaveMixinV2` 加上 Sub-Detail 的客製化解析。
2. **服務分層**：
   * `SaQuoteDeepSaveService`：處理 `sa010 ~ sa014` 的存檔。
   * `SaQuoteToOrderTransferService`：負責將 SA010 資料拋轉至 SA020/SA030，這會是一支獨立的 API Endpoint。
3. **報表服務**：需要實作 `QuotePrintService` 產生 PDF 報價單。

## 九、風險與待確認事項

1. **成本同步風險**：當 DP 成本發生異動時，已建立但尚未 Confirm 的報價單是否需要自動更新？（PB 舊版通常不自動更新，需手動重抓，建議與使用者確認）。
2. **多工廠報價**：`sa013` 允許一個報價單對同一個型體記錄多家工廠的成本，這在前端 UI 顯示上需要做橫向比較 (Cost Comparison) 介面。
