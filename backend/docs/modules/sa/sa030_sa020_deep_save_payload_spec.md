# Legacy Analysis Phase 2A-D：SA030 / SA020 DeepSave Payload 規格設計

## 一、DeepSave 設計摘要

SA030 / SA020 面臨著極高複雜度的前端狀態同步問題。使用者在前端 `OrderWorkbench` 可能會新增十個型體（`sa031`），每個型體再產生三個裝箱配比（`sa033`），並且同時修改訂單主檔（`sa030`）的麥頭與包裝指示。
為確保 ACID 特性與減少 API 呼叫次數，我們設計單一的 DeepSave API Endpoint，並規劃了高度結構化的 Payload 來傳遞整張訂單的增刪改狀態。

## 二、Endpoint 方案比較

* **方案 A (各自獨立 endpoint)**：`/api/sa020/deep_save/` 與 `/api/sa030/deep_save/`。完全隔離，但可能導致後端程式碼大量重複。
* **方案 B (各自 ViewSet, 共用 Service)**：最佳解。保留 `w_sa020` 與 `w_sa030` 的權限管控彈性，並由同一支 `SaOrderDeepSaveService` 進行處理。
* **方案 C (完全共用訂單 endpoint)**：`/api/sa-order/deep_save/`。雖乾淨，但打破了既有系統依賴 `program_id` 授權的原則，不建議。

**最終建議：採用方案 B。**

## 三、建議 Payload 結構

考慮到 `DeepSaveMixinV2` 的架構限制與 SA 訂單的 Sub-Detail 特性，建議的 Payload 如下：

```json
{
  "order_type": "po", 
  "master": {
    "_tempId": "temp_master_123",
    "gkey": "existing-uuid-or-empty",
    "pono": "PO-2026-0001",
    "ba010_custno": "CUST001",
    "mark": "MAIN MARK...",
    "memo": "REVISE MEMO...",
    "pack": "PACK INST..."
  },
  "details": {
    "sa031": {
      "upsert": [
        {
          "_tempId": "temp_sa031_1",
          "gkey": "existing-uuid-or-empty",
          "styleno": "STYLE-A",
          "color": "RED",
          "pairs": 1000,
          "custom_children": {
            "sa032": {
              "upsert": [
                {
                  "_tempId": "temp_sa032_1",
                  "sizerun": "US 7-12",
                  "price": 15.5
                }
              ],
              "delete": []
            },
            "sa033": {
              "upsert": [
                {
                  "_tempId": "temp_sa033_1",
                  "assortment": "1",
                  "size1": "7", "pairs1": 50,
                  "size2": "8", "pairs2": 50
                }
              ],
              "delete": ["uuid-to-delete"]
            }
          }
        }
      ],
      "delete": ["uuid-sa031-delete-1"]
    },
    "sa034": {
      "upsert": [
        {
          "_tempId": "temp_sa034_1",
          "accessory": "HANGTAG",
          "qprp": 1
        }
      ],
      "delete": []
    },
    "sa035": {
      "upsert": [],
      "delete": []
    }
  }
}
```

## 四、核心設計策略解析

### 1. Master Extensions 合併寫入
主檔的附屬 Tab（例如 Mark、SayTotal、Memo、PackInstruction、Banking）**並非獨立的資料表**，而是 `sa030` 本身的欄位。
因此，前端送出 Payload 時，不應將這些放到 `details` 陣列中，而是**直接平鋪在 `master` 物件內**。

### 2. Client ID / Gkey 對應策略
* 新增資料時，前端產生前綴為 `temp_` 的 UUID 作為 `_tempId`。
* 後端存檔成功後，在 response 中回傳 `sync_map`，將 `temp_` 對應到資料庫正式生成的 `gkey`。
* 前端接收後，遍歷 Zustand State 將 `_tempId` 替換為正式 `gkey`，以利後續的修改。

### 3. Replace-All vs. Upsert
* `sa031`, `sa032`, `sa033`, `sa034`, `sa035` 皆採用 **Upsert + Explicit Delete** 策略。前端必須明確告知哪些 row 要更新 (`upsert`)，哪些要刪除 (`delete` 給予 UUID)。
* 由於資料量龐大且帶有關聯，切勿使用 Replace-All (先刪全表再重建)，這會導致嚴重的效能問題與 FK 斷裂。

### 4. 巢狀子明細 (custom_children) 處理
目前的 `DeepSaveMixinV2` 預設只處理一層 Detail。
為了解決 Sub-Detail (`sa032`, `sa033`) 的問題，利用 Mixin 的 `custom_children` 參數。
前端將 Sub-Detail 放在 `sa031.custom_children` 中，Mixin 會忽略該欄位，接著我們在 `post_detail_save_hook` 中手動攔截並進行第二層的 DeepSave 遞迴解析。

### 5. 刪除與儲存順序
**刪除順序 (Bottom-Up):**
1. 刪除 `sa035`, `sa034` (Master 的獨立明細)
2. 刪除 `sa033` (裝箱)
3. 刪除 `sa032` (價格與尺碼)
4. 刪除 `sa031` (型體)
5. 刪除 `sa030` (主檔 - 若有整單刪除的需求)

**儲存順序 (Top-Down):**
1. 儲存 `sa030` 取得/確認 Master PK
2. 儲存 `sa034`, `sa035` (帶入 Master PK)
3. 儲存 `sa031` (帶入 Master PK)，取得 Detail PK
4. 針對剛存入的 `sa031`，儲存其下的 `sa032` (帶入 Master PK 與 Detail PK)
5. 針對剛存入的 `sa032`，儲存其下的 `sa033` (帶入 Master PK, Detail PK, SubDetail PK)

### 6. Transaction Rollback 條件
* 任何一張表的 ORM 驗證失敗。
* Sub-Detail (`sa032`, `sa033`) 解析失敗。
* DP Adopted 狀態同步失敗。
* QC 模組同步寫入失敗。
上述任何一項發生，整個 Request 必須 Atomic Rollback。

### 7. Response Payload 建議
由於訂單包含大量的後端自動計算 (如總金額、各型體雙數加總)，前端若自行計算容易產生小數點誤差。
建議後端在存檔完畢後，**立刻重新執行一次 Retrieve**，將最新、最完整的資料表結構包裝回 Response 的 `data` 節點中，前端直接用此資料刷新畫面。

```json
{
  "success": true,
  "message": "資料儲存成功",
  "action": "update",
  "data": { /* 最新完整的 SA030 巢狀 JSON */ },
  "sync_map": {
    "master": { "tempId": "temp_master_123", "gkey": "real-uuid" },
    "details": {
      "sa031": {
        "upsert": [ { "_tempId": "temp_sa031_1", "gkey": "real-uuid-2" } ]
      }
    }
  }
}
```
