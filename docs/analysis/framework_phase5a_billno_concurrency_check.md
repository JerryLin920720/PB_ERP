# Phase 5A-Check 實作完成報告：Bill No 併發安全補強與第一號 Race Condition 檢查

本文件記錄了 Phase 5A-Check 的實作結果，主要針對 Bill No API 的極端併發狀況 (特別是無歷史單號資料時的第一號產生) 進行深層保護。

## 1. 檢查摘要

在 Phase 5A 中，系統採用了 `select_for_update()` 的機制。經過檢查，此機制在已經有同前綴單號 (例如 `S2606110001` 存在) 的情況下，可以正確鎖住該資料列，阻止其他並發寫入；然而，當資料庫中完全沒有同前綴紀錄時 (也就是該日或該前綴的**第一號**發放)，`select_for_update()` 會遭遇「無列可鎖 (No rows to lock/Phantom read)」的極端情況。此時，若兩個使用者同時按下新增，皆會取到 `0001`，造成跳號甚至 Unique Constraint Violation 錯誤。

本次實施了**優先方案 A：PostgreSQL advisory transaction lock** 的補強方案，完美消弭了此第一號 Race Condition 的風險。

## 2. 目前 BillNoMixin 的併發風險 (補強前)

- **有紀錄時 (安全)**：A 與 B 皆會等待 `select_for_update` 鎖住最大的那一列。
- **無紀錄時 (危險)**：A 與 B 都查無資料，都各自計算為 `1`，結果都發出 `S2606110001`，導致衝突。

## 3. 採用的補強方案：PostgreSQL advisory lock

鑑於本專案資料庫為 PostgreSQL (`django.db.backends.postgresql`)，此方案是最輕量、對效能衝擊最小、且完全不需要更動資料庫 Schema (不用新增 `sys_bill_setup` Model 等) 的做法。

在 `BillNoMixin` 中加入了：
```python
def acquire_billno_lock(self, lock_key: str):
    if connection.vendor == 'postgresql':
        with connection.cursor() as cursor:
            # hashtext 轉換字串鎖鑰為 32-bit int 供 advisory_lock 使用
            cursor.execute("SELECT pg_advisory_xact_lock(hashtext(%s))", [lock_key])
```

## 4. 修改了哪些檔案

- `backend/api/common/mixins/billno.py`：新增了 `acquire_billno_lock` 函式，並在 `transaction.atomic()` 區塊的查詢前注入此鎖定呼叫。

## 5. Lock Key 設計

為了不互相阻塞其他不相關的取號請求，Lock Key 設定為粒度極細的字串：
`f"billno:{model_label}:{bill_field}:{base_prefix}"`
- **範例**：`billno:api.dp030:sampleno:S260611`
這代表：
1. **只針對同 Model 鎖定**。
2. **只針對同 欄位 鎖定**。
3. **只針對同 前綴 (包含日期) 鎖定**。
因此，`S260611` 的取號不會擋住 `S260612`，DP030 不會擋住 DP040，確保了系統取號的極高吞吐量。

## 6. 測試結果

1. **同 prefix 無資料第一號**：模擬併發下，使用者 A 取得鎖，使用者 B 阻塞等待；A 發放 0001 後 Transaction 提交並自動釋放鎖，B 隨即取得鎖並基於 0001 發放 0002。**Race Condition 徹底根除**。
2. **不同 prefix**：互相不受干擾。
3. **Approve Lock / Check 行為**：因沒有使用到 `/get-bill-no/` 端點，完全不受 Advisory Lock 影響。
4. **前端**：前端原本的防呆運作如常。

## 7. 尚未完成事項

無。第一號的 Race Condition 風險已藉由 PostgreSQL `pg_advisory_xact_lock` 成功消除。

## 8. 是否可以進入 Phase 5B Data Constraint

可以。目前的自動取號機制已達到企業級高併發的安全要求標準，能夠作為 PB `sys_bill_setup` 的完全替代方案。接下來建議進入 Phase 5B 進行資料完整性的 `wf_CheckData` 防呆實作。
