# Phase 5C 實作完成報告：Validation / wf_CheckData 資料邏輯檢核與必填防呆

本文件記錄了 Phase 5C (Validation / wf_CheckData) 的實作結果。針對 PB 系統中儲存前 (pfc_save, ue_presave, wf_CheckData) 的檢查邏輯，在新系統中打造了「前端攔截 + 後端死守」的雙層驗證框架。

## 1. 實作摘要

本次階段成功將 PB 的 `wf_CheckData` 機制抽象化，建立了前後端呼應的 `Validation Framework`。
前端透過 `programRegistry.js` 的 `validationConfig` 宣告，在 `useRecordWorkbenchCrud.js` 派發儲存請求前先行檢核必填與明細筆數，提供使用者即時友善的錯誤回饋。
後端透過 `ValidationMixin` 攔截 `create`、`update` 與 `deep_save` 等入口，做寫入資料庫前的最後防線檢查，並以標準化 JSON 格式拋出錯誤，確保非法資料絕對不會繞過驗證寫入。

## 2. 修改了哪些檔案

- `backend/api/modules/dp/views.py`: 於 `Dp030ViewSet` 與 `Dp040ViewSet` 中加入了 `ValidationMixin`、配置 `validation_config`，並在 `deep_save` 內呼叫 `self.check_deep_save_validation(request)`。
- `frontend/src/config/programRegistry.js`: 在 DP030 與 DP040 增加 `validationConfig` 參數設定。
- `frontend/src/hooks/useRecordWorkbenchCrud.js`: 於 `handleSaveAll` (Pattern B) 送出 API 請求前，新增對 `validationConfig` 的檢查。並改良 API `catch` 區塊，使其能精確解析並拋出後端的標準錯誤格式。

## 3. 新增了哪些檔案

- `backend/api/common/mixins/validation.py`: 通用資料驗證防呆核心模組 (`ValidationMixin`)。

## 4. ValidationMixin 設計

`ValidationMixin` 透過讀取 `validation_config` 進行以下標準驗證：
1. 主檔必填欄位 (`required_fields`)。
2. 主檔數值限制 (`numeric_fields` 的 min/max)。
3. 明細筆數限制 (`detail_rules` 的 min_rows)。

除了 Config-Driven 外，預留了 3 個客製化 Hooks 供未來更複雜的業務邏輯覆寫：
```python
def validate_master(self, data, request): return []
def validate_details(self, details, request): return []
def validate_business_rules(self, master_data, detail_data, request): return []
```

## 5. validation_config 欄位說明

後端與前端的設定參數相似，以下為後端範例：
```python
validation_config = {
    "required_fields": [
        {"field": "ba010gkey", "label": "客戶"}
    ],
    "numeric_fields": [
        {"field": "qty", "label": "數量", "min": 0}
    ],
    "detail_rules": [
        {"detail_key": "dp031", "min_rows": 1, "message": "明細至少需要一筆資料"}
    ]
}
```

## 6. 前端 validationConfig 設計

在 `programRegistry.js` 宣告：
```javascript
validationConfig: {
  requiredFields: [{ field: 'ba010gkey', label: '客戶' }],
  numericRules: [{ field: 'qty', label: '數量', min: 0 }],
  detailRules: [{ detailKey: 'dp031', minRows: 1, message: '樣品明細至少需要一筆資料' }]
}
```

## 7. 標準錯誤格式

當後端驗證失敗時，會拋出包含以下格式的 `ValidationError` (HTTP 400)：
```json
{
  "success": false,
  "errors": [
    {
      "scope": "master",
      "field": "ba010gkey",
      "label": "客戶",
      "message": "客戶 不可空白"
    }
  ]
}
```
前端 Hook 已支援解析此格式，並透過 `message.error` 將 `firstError.message` 顯示給使用者。

## 8. Pattern B 驗證方式

目前 DP030 與 DP040 屬於 Pattern B (Master-Detail)。
前端在 `useRecordWorkbenchCrud.js` 中的 `handleSaveAll` 進行驗證：
1. 呼叫 `form.validateFields()` 執行 Ant Design 內建的基本檢核。
2. 遍歷 `validationConfig`，檢查 `activeRecord` (與表單合併後的值) 中 `requiredFields` 是否都有值。
3. 檢查 `numericRules` 的上下限。
4. 檢查 `detailRules`，過濾掉 `_status == 'deleted'` 的明細後，筆數是否大於等於 `minRows`。
如果有任一不合規，立即觸發 `message.warning()` 並 `return`，完全不呼叫後端 API，同時也**不會**清除 Dirty 狀態，確保使用者可繼續修改。

## 9. 後端驗證入口

`ValidationMixin` 原生覆寫了 `perform_create` 與 `perform_update` 以保護傳統 REST 介面。
針對複雜的 Pattern B，提供了 `check_deep_save_validation` 輔助方法。試點的 ViewSet 在自訂的 `deep_save()` 一開始便呼叫此方法，若資料違規即刻引發 Exception 回傳 400，完全相容於 `transaction.atomic()`，絕不會讓髒資料入庫。

## 10. 試點作業

### DP030 樣品單主檔
- **測試重點**: 客戶 (`ba010gkey`) 必填；樣品明細 (`dp031`) 至少一筆。
- **測試結果**: 不選客戶或將明細全刪後點擊儲存，成功觸發前端提示「客戶 不可空白」或「樣品明細至少需要一筆資料」，API 未送出。模擬 API 強制送出，後端亦回傳 400 錯誤。

### DP040 樣品出貨單主檔
- **測試重點**: 年度 (`year`) 必填。
- **測試結果**: 清空年度欄位後儲存，前端成功攔截，後端雙重防護生效。

## 11. Approval / BillNo / DataConstraint 迴歸結果

這四大機制完美共存：
- **ApprovalMixin / Approve Lock**: 已審核單據從源頭就被禁用儲存，驗證機制不會與其打架。
- **BillNoMixin**: 單號是在新增當下就產生並塞入欄位，因此在儲存時的必填驗證必能順利通過。
- **DataConstraint**: 查詢時的過濾不影響單據的表單內容與儲存邏輯。

## 12. 尚未完成事項

- Pattern A (單檔 Grid) 的驗證整合：此階段專注於完成 DP030 / DP040 的 Pattern B 驗證。Pattern A (`useSingleTableCrud.js`) 尚未實作。
- DataWindow Grid 內特定 Cell 的即時錯誤反紅提示 (目前統一以右上角 Global Message 提示)。

## 13. 下一階段建議

目前框架已具備完整的 CRUD、防呆、驗證、權限控制循環。這是單據作業的全部基礎。
下一個重要的 PB 行為是 **F2 Lookup 的資料回填與 Cascading** (雖然我們在 Phase 3 做過，但或許可以進入更複雜的「連動計算」如：修改數量自動重算小計，也就是對應 PB 的 `ItemChanged`)，或者是進入 **Phase 6: Report 列印與轉出機制**。
