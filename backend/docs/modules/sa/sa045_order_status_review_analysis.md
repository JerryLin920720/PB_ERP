# Legacy Analysis Phase 2D：SA045 Order Status Review Deep Dive

## 一、分析摘要

SA045 是業務部門用來**批次**更新訂單狀態 (Status) 與審核標記 (Approve) 的管理作業。
經過對 PB 原始碼與 DataWindow 的分析，確認 SA045 並非單純的狀態文字修改，它牽涉到了跨模組的資料連動，特別是開發模組 (DP) 中基礎資料的 `adopted` 狀態，以及可能引發對 QC、出貨等後續流程的鎖定。未來在實作上，強烈建議建立專屬的 `SaOrderStatusService` 來封裝這些業務邏輯，確保資料一致性。

## 二、SA045 定位

* **作業定位**：訂單狀態批次審核與變更管理。
* **修改對象**：主要修改 `sa030` (訂單主檔) 以及 `sa032` (型體/尺碼明細) 的狀態欄位。
* **作業模式**：Pattern Special (批次查詢、多筆勾選、批次更新)。
* **包含單別**：同時涵蓋 SA030 (P/O單) 與 SA020 (預告單)，透過不同的按鈕或查詢條件進行狀態切換 (例如：預告轉正式)。

## 三、PB Window / DataWindow 清單

| DataWindow | 資料表 | 說明 |
| --- | --- | --- |
| `d_sa045_query_where` | 無 | 查詢面板 (依據客戶、交期、狀態查詢) |
| `d_sa045_query` | `sa030` / `sa032` | 查詢結果清單，供使用者打勾選取 |
| `d_sa045_update_sa030` | `sa030` | 用於批次更新 `sa030.status` 與 `sa030.approve` |
| `d_sa045_update_sa032` | `sa032` | 用於批次更新 `sa032.status` |
| `d_sa045_update_dp010` | `dp010` | 連動更新 楦頭 的 adopted 狀態 |
| `d_sa045_update_dp015` | `dp015` | 連動更新 大底 的 adopted 狀態 |
| `d_sa045_update_dp020` | `dp020` | 連動更新 鞋跟 的 adopted 狀態 |
| `d_sa045_update_dp025` | `dp025` | 連動更新 型體 的 adopted 狀態 |

## 四、狀態欄位與狀態流

### 狀態欄位
1. `sa030.approve`：審核標記 (`Y`/`N`)。決定該張訂單是否能再次進入 SA030 被業務員修改。
2. `sa030.status` / `sa032.status`：訂單執行狀態。

### 狀態流文字圖 (PB 預設語意)
```text
(0)預告單
   │ 轉為正式訂單
   ↓
(1)進行中 (Approve='Y' 後可拋 P/I 或開始生產)
   │ 出貨拋轉
   ↓
(2)出貨中
   │ 出貨確認
   ↓
(3)已出貨
   │ 押匯
   ↓
(4)押匯
   │ 財務結清
   ↓
(5)結案
```
* **特殊狀態**：`A` (取消 / Cancelled)。預告單或進行中的訂單可被手動變更為取消。

## 五、批次更新流程與 DP Adopted 關聯

### DP Adopted 更新邏輯
這是 SA045 最核心的 Side Effect：
1. **預告轉正式 (0 → 1)**：系統不僅更新 `sa030.status`，更會抓取該訂單關聯的 `dp010`, `dp015`, `dp020`, `dp025` 內碼，並透過 `d_sa045_update_dp*` 將其 `adopted` 設為 `Y`。這代表該開發樣品已經被正式訂單「採用」，開發部不應再隨意修改其 BOM 結構。
2. **正式轉預告 (1 → 0) 或 取消 (A)**：系統會將這些訂單標記為無效，並下 SQL 檢查這些 DP 項目是否還有被**其他狀態 != 0 且 != A 的訂單**使用。若無，則將 `adopted` 退回 `N`。

## 六、與 QC / SM / FA 的關係

* **(待驗證)** SA045 修改狀態時，若訂單已處於「出貨中 (2)」或「已出貨 (3)」，通常會阻擋反審核 (Un-Approve) 的動作。
* 狀態改變 (特別是取消訂單) 可能會觸發檢查是否已有 `qc030` 驗貨紀錄或 SM 出貨紀錄。
* 在 PB 中這類檢查可能是寫在 `w_sa045` 的 `ue_save` 或自訂 event 中，利用 `select count(*)` 判斷並阻擋。

## 七、權限與 ApprovalMixin 分析

1. **現有 ApprovalMixin 不足**：系統現有的 `ApprovalMixin` 僅支援單一資料表簡單的 `approve` 欄位切換，無法應付 SA045 **「同時更新主檔與明細檔狀態」** 且 **「牽涉跨模組 DP Adopted 連動」** 的複雜邏輯。
2. **權限管控**：SA045 是一支獨立的 program (`program_id = 'w_sa045'`)。它必須嚴格控制誰有權限執行「結案」、「反審核」。

## 八、Backend API / Service Layer 建議

1. **Endpoint 建議**：
   不應該塞在 SA030 的 ViewSet 內。應建立獨立的 `Sa045ViewSet`。
   ```python
   POST /api/sa045/batch_update_status/
   ```
2. **Payload 草案**：
   前端將使用者勾選的訂單打包送出。
   ```json
   {
     "target_status": "1",
     "target_approve": "Y",
     "orders": [
       { "sa030gkey": "uuid-1", "sa032gkeys": ["uuid-1-a", "uuid-1-b"] },
       { "sa030gkey": "uuid-2", "sa032gkeys": ["uuid-2-a"] }
     ]
   }
   ```
3. **專屬 Service Layer**：
   必須建立 `SaOrderStatusService`。
   ```python
   class SaOrderStatusService:
       def batch_update_status(self, payload):
           with transaction.atomic():
               # 1. 驗證 (例如：已出貨不可反審核)
               # 2. 更新 sa030 與 sa032 狀態
               # 3. 呼叫 SaOrderDpAdoptedService.sync_adopted_status(...) 處理 DP 連動
   ```
   透過共用 `SaOrderDpAdoptedService`，可以確保 SA030 存檔時與 SA045 批次審核時，DP 狀態同步的邏輯一致。

## 九、風險與待確認事項

1. **DP Adopted 鎖表風險**：批次更新 50 張訂單的狀態，可能同時觸發成百上千筆 DP 基礎資料的 `adopted` 重算。若此段 SQL 未加上適當的索引與 ORM 優化，將導致資料庫嚴重 Lock。
2. **狀態回溯漏洞**：若使用者將「已拋轉 P/I」的訂單手動改回「預告」，是否會造成財務報表失真？需確認是否要加入「已存在 SA041 明細者禁止轉為預告」的防呆檢查。
