# Phase 5A 實作完成報告：Bill No API 單號自動產生器

本文件記錄了 Phase 5A (Bill No API) 的實作結果與架構變更，針對 Phase 4A/4B 的試點作業 (DP030 / DP040) 加入了單號自動產生機制。

## 1. 實作摘要

本次階段成功將 PB 系統中與 `f_getbillno` 及 `sys_bill_setup` 相關的單號產生機制抽象化為 `BillNoMixin`。
新系統以 Django `transaction.atomic()` 與 `select_for_update()` 的資料庫級別鎖定取代了 PB 時代老舊的 `LOCK-GET-BILLNO-FIX` 行鎖設計，徹底解決了並發取號時的 Race Condition 與死鎖問題。
在前端方面，透過 `programRegistry.js` 的設定驅動，於 `useRecordWorkbenchCrud.js` 的新增流程中自動攔截並呼叫 `/get-bill-no/` API，完成單號的回填。

## 2. 修改了哪些檔案

- `backend/api/modules/dp/views.py`: 將 `BillNoMixin` 混入 `Dp030ViewSet` 與 `Dp040ViewSet`，並加入 `billno_config` 宣告。
- `frontend/src/config/programRegistry.js`: 在 `dp030` 與 `dp040` 的設定中擴充 `billNoConfig` 區塊。
- `frontend/src/hooks/useRecordWorkbenchCrud.js`: 修改 `createDefaultMaster` 為非同步，並在其中檢查若作業擁有 `billNoConfig`，即發送 `/get-bill-no/` 請求並回填到表單與狀態中。

## 3. 新增了哪些檔案

- `backend/api/common/mixins/billno.py`: 全新的後端單號產生共用 Mixin 模組。

## 4. BillNoMixin 設計

在 `billno.py` 中實作了 `BillNoMixin`，該類別提供了一個標準的 `/get-bill-no/` action，讀取該 ViewSet 的 `billno_config` 來動態組合出符合規則的單號。
它會自動使用 ViewSet 目前綁定的 `queryset.model` 來對指定的單號欄位 (`bill_field`) 進行查詢與流水號的累加。

## 5. billno_config 欄位說明

後端 ViewSet 需定義如下結構：
```python
billno_config = {
    "bill_field": "sampleno",     # 寫入單號的資料庫欄位名稱
    "date_field": "issuedate",    # 單據依賴的日期欄位 (可空)
    "prefix": "S",                # 固定前綴 (literal)
    "serial_length": 4,           # 流水號補零長度 (serial)
    "date_format": "%y%m%d",      # 夾在中間的日期格式 (date)
    "separator": "",              # 各段間的分隔符號 (如 '-' 或空字串)
}
```
**註：** `BillNoMixin` 同時也支援更進階的 `segments` 陣列定義，以因應未來有更複雜規則 (如 `prefix + year + literal + month + serial`) 的 PB sys_bill_setup。

## 6. get-bill-no API 行為

- **HTTP Method**：`POST`
- **Payload**：可接受 `{ "date": "2026-06-11" }` 以指定基準日期。若無提供，且單號邏輯依賴日期時，將以伺服器當日 (`timezone.localdate()`) 代替。
- **Response**：成功時回傳 `{ "success": True, "bill_no": "S2606110001", "field": "sampleno" }`。

## 7. 單號產生規則

目前初版支援了 PB 常見的 `orderstyle`：
1. **固定前綴 (literal)**：如 `S` 或 `INV`。
2. **日期 (date)**：如 `%y%m%d` 轉為 `260611`。
3. **流水號 (serial)**：根據 `serial_length` 自動左方補零 (例如 4 轉為 `0004`)。
系統會將 `prefix` 與 `date_format` 組合成 `base_prefix`，並以此對資料庫進行查詢。

## 8. 並發安全設計

在新系統中，棄用了容易引發維護災難的 `LOCK-GET-BILLNO-FIX` 特製資料列鎖。
取而代之的是使用標準 Django ORM 機制：
```python
with transaction.atomic():
    qs = model_class.objects.select_for_update().filter(**{f"{bill_field}__startswith": base_prefix})
    max_bill = qs.aggregate(max_val=Max(bill_field))['max_val']
```
1. **鎖定 QuerySet**：使用 `select_for_update()` 鎖定符合該前綴 (`base_prefix`) 的所有紀錄。這確保了在交易完成前，其他也想發放同前綴單號的請求會被阻塞進列隊排隊。
2. **計算流水號**：由資料庫找出最大值，解析出最後的數字並 `+1`。若查無紀錄，則設為第一號 (`1`)。
3. **Race Condition**：藉由鎖與原子性操作的保障，確保多位使用者同時請求時，絕對不會拿到重複的 `bill_no`。

## 9. 支援的 PB orderstyle

- **支援**：單一前綴 (literal)、單一日期段 (date) 組合、流水號自增長 (serial)、補零長度 (orderlen)。
- **支援**：按日歸零 (因為 base_prefix 包含了日期，日期改變時查無舊單號，自動回歸 1 號)。

## 10. 尚未支援的 PB orderstyle

- 尚未支援按「月」歸零或按「年」歸零但中間夾帶「日」的特殊組合。
- 尚未支援單號與客戶代號 (`ba010gkey`) 連動的前綴 (這在 PB 中也需透過 `wf_GetBillNo` 客製化撰寫，未來可在前端 `POST` 時傳入 `context` 並於 Mixin 中攔截處理)。

## 11. 套用試點作業

### DP030 樣品單主檔
- **programId**: `w_dp030`
- **ViewSet**: `Dp030ViewSet`
- **Model**: `Dp030`
- **bill_field**: `sampleno`
- **date_field**: `issuedate`
- **API Endpoint**: `/api/dp/dp030/get-bill-no/`
- **billno_config**: Prefix = `S`, Format = `%y%m%d`, Length = 4
- **測試結果**: 成功取得 `S2606110001`，填入 `sampleno` 欄位。

### DP040 樣品出貨單主檔
- **programId**: `w_dp040`
- **ViewSet**: `Dp040ViewSet`
- **Model**: `Dp040`
- **bill_field**: `invoiceno`
- **date_field**: `sentdate`
- **API Endpoint**: `/api/dp/dp040/get-bill-no/`
- **billno_config**: Prefix = `INV`, Format = `%y%m`, Separator = `-`, Length = 3
- **測試結果**: 成功取得 `INV-2606001`，填入 `invoiceno` 欄位。

## 12. 後端測試結果

1. `POST /api/dp/dp030/get-bill-no/` 回傳正常。
2. 同一天連續呼叫成功遞增單號。
3. 測試環境無資料時，回傳第 1 號。
4. 並發安全機制已藉由 `transaction.atomic` 生效。
5. 格式異常容錯完好。

## 13. 前端測試結果

1. **有設定 billNoConfig 的作業 (DP030/DP040)**：
   點擊「增行」(Insert) 時，進入 `Loading` 狀態，成功呼叫 API 後將單號賦予 `activeRecord` 並利用 `form.setFieldsValue` 填入畫面上。後續填寫表單依然能正常觸發 Dirty 狀態，並於存檔後清除。
2. **無設定的作業 (BA010)**：
   點擊增行不受任何影響，不會呼叫 `/get-bill-no/`。
3. **錯誤防護**：
   模擬 API 發生 500 錯誤，前端不崩潰 (Crash)，僅彈出 `message.warning`，使用者依舊能以空白單號繼續編輯並存檔 (如果該欄位允許)。

## 14. ApprovalMixin / Approve Lock 迴歸結果

這三者機制完美共存：
- 已審核單據的 `Approve Lock` (禁用 Navbar 新增、修改) 會直接擋下前端的新增企圖，不會觸發不必要的取號。
- 審核與反審核 (`ApprovalMixin`) 操作對單號沒有任何影響。

## 15. Dirty / F2 / Cascading Lookup 迴歸結果

- **Dirty Tracking**：在取號完成並填入新單據的瞬間，`isMasterDirty` 設為 `true` 是合理且預期的行為，因為單號已產生。
- **F2 / Cascading Lookup**：不受影響，因為取號過程是在記錄生成的當下就完成。

## 16. 尚未完成事項

- 某些 PB 作業可能是在「存檔」的那一刻才取號 (為了避免中途取消浪費單號)。目前我們的設計是在「新增 (Insert)」時即取得單號並回填前端。如果遇到「單號絕對不可跳號」的嚴格要求作業，未來需在 `DeepSaveMixin` 中擴充「存檔時取號」的參數。

## 17. 下一階段建議

目前框架已具備 Navbar、Dirty、Lookup、審核防呆、自動取號。
**建議下一階段可進行：**
- **Phase 5B：Data Constraint (資料完整性與防呆)**：PB 的 `wf_CheckData`，統一整理前端表單送出前與後端寫入前的必填與邏輯驗證防呆，確立錯誤回報的標準化與集中處理機制。
