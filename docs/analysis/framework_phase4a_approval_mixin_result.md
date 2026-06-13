# Phase 4A 實作完成報告：ApprovalMixin 審核 API 共用化

本文件記錄了 Phase 4A (ApprovalMixin) 的實作結果與架構變更。

## 1. 實作摘要

本次階段成功將 PB 系統中與 `wf_SetupCheck` 相關的後端審核寫入邏輯抽象化為 `ApprovalMixin`，並在前端完成對 `check` 與 `uncheck` API 的呼叫對接。
此階段**僅包含審核狀態與審核相關時間、人員的寫入**，不會鎖定表單，保留給後續的 Phase 4B (Approve Lock) 階段實作。

## 2. 修改了哪些檔案

- `backend/api/modules/dp/views.py`: 將 `ApprovalMixin` 套用於 `Dp030ViewSet` 與 `Dp040ViewSet`。
- `frontend/src/hooks/useRecordWorkbenchCrud.js`: 修正 `approve` / `unapprove` command 派發的 API 請求對齊後端的 `/check/` 與 `/uncheck/`。

## 3. 新增了哪些檔案

- `backend/api/common/mixins/approval.py`: 全新的審核共用邏輯抽象層。

## 4. ApprovalMixin 設計

在 `approval.py` 中實作了 `ApprovalMixin`，該類別預設套用 `HasProgramPermission`，並提供標準的 `check` 與 `uncheck` action。只要在 ViewSet 定義好 `approval_config`，Mixin 就能動態地找出該 model 的審核相關欄位並進行資料寫入。

## 5. approval_config 欄位說明

ViewSet 需定義：
```python
approval_config = {
    "approved_field": "approve",             # 記錄審核狀態的欄位 (例如 is_approved 或 approve)
    "approved_value": "Y",                   # 審核通過的值
    "unapproved_value": "N",                 # 未審核的值
    "approver_field": "approver",            # 記錄審核者帳號字串的欄位 (可選)
    "approver_gkey_field": "aes101gkey",     # 記錄審核者關聯外鍵的欄位 (可選)
    "approve_date_field": "approvedate",     # 記錄審核時間的欄位 (可選)
    "modify_date_field": "modifydate",       # 記錄最後修改時間的欄位 (可選)
}
```
**相容性保證**：若 model 缺少某些可選欄位，`hasattr()` 的安全檢查將會跳過該欄位，不會引發 Exception (Crash)。

## 6. check action 行為

- **權限**：由 `HasProgramPermission` 解析 `action == 'check'` 並驗證。
- **欄位寫入**：寫入 `approved_value`，自動填入當前請求者的 username (`approver_field`) 與 `Es101` gkey (`approver_gkey_field`)。同時更新 `approve_date_field` 與 `modify_date_field` 為當下時間。
- **Transaction**：全程使用 `with transaction.atomic():` 包覆。

## 7. uncheck action 行為

- **權限**：由 `HasProgramPermission` 解析 `action == 'uncheck'`，自動對應到 `recheck` 權限。
- **欄位寫入**：寫入 `unapproved_value`。為了保守起見且相容 PB 的不確定性，並未強制清空 `approver_field` 與 `approve_date_field`，只更新 `modify_date_field`。
- **Transaction**：全程使用 `with transaction.atomic():` 包覆。

## 8. Hook 設計

提供了四個預設不作任何事的 Hook 函式，供未來過帳或狀態連動使用：
- `pre_check_hook(self, instance, request)`
- `post_check_hook(self, instance, request)`
- `pre_uncheck_hook(self, instance, request)`
- `post_uncheck_hook(self, instance, request)`

## 9. 權限檢查方式

使用現有系統的 `HasProgramPermission`：
- `/check/` API 的 action 會被判定為 `check` 操作。
- `/uncheck/` API 的 action 會被判定為 `recheck` 操作。
此設計完美繼承現有 PB 權限底層遮罩，無需另建機制。

## 10. 試點作業

### 試點 1：DP030 樣品單主檔
- **programId**: `w_dp030`
- **Model**: `Dp030`
- **ViewSet**: `Dp030ViewSet`
- **Serializer**: `Dp030Serializer`
- **審核欄位**: `approve`, `aes101gkey`
- **API Endpoint**: `/api/dp030/{id}/check/`, `/api/dp030/{id}/uncheck/`
- **approval_config**:
  ```python
  approval_config = {
      "approved_field": "approve",
      "approved_value": "Y",
      "unapproved_value": "N",
      "approver_gkey_field": "aes101gkey",
      "modify_date_field": "modifydate",
  }
  ```
- **測試結果**: 成功寫入 `approve='Y'` 與審核人關聯。

### 試點 2：DP040 樣品出貨單主檔
- **programId**: `w_dp040`
- **Model**: `Dp040`
- **ViewSet**: `Dp040ViewSet`
- **Serializer**: `Dp040Serializer`
- **審核欄位**: `approve`, `aes101gkey`
- **API Endpoint**: `/api/dp040/{id}/check/`, `/api/dp040/{id}/uncheck/`
- **approval_config**:
  ```python
  approval_config = {
      "approved_field": "approve",
      "approved_value": "Y",
      "unapproved_value": "N",
      "approver_gkey_field": "aes101gkey",
      "modify_date_field": "modifydate",
  }
  ```
- **測試結果**: 成功寫入 `approve='Y'` 與審核人關聯。

## 11. 後端測試結果

1. **狀態寫入**：POST check 後 `approved_field = 'Y'`，POST uncheck 後為 `'N'`。
2. **時間紀錄**：`modifydate` 在兩動作皆有正確更新。
3. **錯誤防護**：若 `Model` 無法對應設定的欄位時，將安全略過不 crash；重複 check 或重複 uncheck 將被攔截並返回 400 提示。
4. **Transaction 支援**：操作皆受到 `transaction.atomic()` 的保護。

## 12. 前端測試結果

1. **Command 對接**：Navbar 的 `approve` / `unapprove` 指令已正確對接到 `/check/` 與 `/uncheck/` API。
2. **Selected Record 更新**：API 回傳成功後觸發 `fetchList()`，使 `selectedRecord` 在不破壞畫面的前提下更新。
3. **Navbar 動態切換**：`selectedRecord` 更新後驅動 `sheetState.approved` 的變更，使得按鈕能在「審核」與「反審核」間完美切換。
4. **無副作用干擾**：Dirty Tracking 維持不變，`isDirty` 為 `false`，Sheet 依然維持在 `BROWSE` 模式；F2 Lookup 等操作未受影響。

## 13. 尚未完成事項

1. **更多作業的套用**：目前僅在 DP030 與 DP040 試點成功。接下來若有更多具備審核機制的作業（如 MR / SA），只要將 `ApprovalMixin` 混入其 ViewSet 即可快速達成。

## 14. Phase 4B Approve Lock 前置注意事項

本次 Phase 4A 已完整實作了寫入動作。但在進入 Phase 4B 時需注意：
- 必須擴展 Django REST Framework 的 `BasePermission` 或是 `Serializer.validate` 來攔截已經 `is_approved == 'Y'` 的單據上的 PUT / PATCH / DELETE 請求。
- 前端的 Navbar `edit` 與 `delete` 按鈕，也必須與 `sheetState.approved` 掛鉤，實現前端 Disable 防呆機制。
