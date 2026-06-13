# Phase 4B 實作完成報告：Approve Lock 已審核單據保護鎖定機制

本文件記錄了 Phase 4B (Approve Lock) 的實作結果與架構變更，針對 Phase 4A 的試點作業 (DP030 / DP040) 加上了前後端防修改與防刪除防呆。

## 1. 實作摘要

本次階段成功將 PB 系統中與 `wf_GetCheckCtrl`、`is_modify`、`is_delete` 相關的鎖定邏輯補齊。
當單據狀態為已審核 (`is_approved == 'Y'` 或客製欄位 `approve == 'Y'`) 時，前端自動 Disable 修改、刪除、儲存功能，且禁止透過雙擊進入編輯；同時後端攔截 `PUT`、`PATCH`、`DELETE` 請求，並回傳 `403 Forbidden`。

## 2. 修改了哪些檔案

- `backend/api/common/mixins/approval.py`: 於 `ApprovalMixin` 新增 `update`、`partial_update`、`destroy` 攔截機制與對應的組態設定。
- `backend/api/modules/dp/views.py`: 為 `Dp030ViewSet` 與 `Dp040ViewSet` 的 `approval_config` 擴增 `allow_edit_after_approve` 與 `allow_delete_after_approve` 參數。
- `frontend/src/config/programRegistry.js`: 強健化 `isApproved` 的判定，除了 `is_approved` 也支援 `approve` 與 `capprove` 等多種客製欄位。
- `frontend/src/hooks/useRecordWorkbenchCrud.js`: 於指令派發區塊 (dispatch) 新增防呆，當 `isApproved` 為 true 時，強制擋下 `edit`、`save`、`delete` 的執行。
- `frontend/src/components/Win32DataWindow.jsx`: 防止使用者在已審核的資料列上雙擊 (DoubleClick) 進入編輯模式。

## 3. 新增了哪些檔案

無新增檔案，本階段著重於在 Phase 4A 的基礎設施中擴充鎖定機制。

## 4. Approve Lock 設計

為了避免建立重複且脫節的邏輯，Approve Lock 直接整合進 `ApprovalMixin`：
透過 `is_instance_approved(self, instance)` 判斷該實例是否已達 `approved_value`。
同時透過 `allow_edit_after_approve()` 與 `allow_delete_after_approve()` 讀取 `approval_config` 來判定是否為 PB 中的 `is_modify = '1'` 或 `is_delete = '1'` 例外作業。

## 5. 攔截 update / partial_update / destroy 的方式

在 `ApprovalMixin` 覆寫了 DRF 內建的修改方法：
```python
def update(self, request, *args, **kwargs):
    if self.is_instance_approved(instance) and not self.allow_edit_after_approve():
        return Response({"detail": "此資料已審核，請先反審核後再修改。"}, status=403)
    return super().update(request, *args, **kwargs)
```
此方法會由 DRF 的 MRO (Method Resolution Order) 優先解析，成功在不破壞任何既有 ViewSet 的情況下攔截非法儲存與刪除。

## 6. check / uncheck 為何不被鎖住

`POST /check/` 與 `POST /uncheck/` 屬於獨立宣告的 `@action`，它們並不呼叫 `update()` 或 `partial_update()`，而是直接使用 `instance.save(update_fields=[...])`。因此，這些核心審核動作完全不受 Approve Lock 的 `update` 攔截影響，確保了「反審核能正常執行」的關鍵需求。

## 7. is_modify / is_delete 例外設計

PB 舊系統某些作業允許審核後繼續編輯 (例如業務單位的某些備註)。
本系統透過 `approval_config` 預留：
```python
"allow_edit_after_approve": False,
"allow_delete_after_approve": False,
```
只要將其設為 `True`，該作業即可繞過特定防護。DP030 與 DP040 目前皆預設為 `False`。

## 8. 套用試點作業

本階段與 Phase 4A 相同，先應用於以下兩支：

### DP030 樣品單主檔
- **programId**: `w_dp030`
- **ViewSet**: `Dp030ViewSet`
- **Model**: `Dp030`
- **approved_field**: `approve`
- **approved_value**: `Y`
- **allow_edit_after_approve**: `False`
- **allow_delete_after_approve**: `False`

### DP040 樣品出貨單主檔
- **programId**: `w_dp040`
- **ViewSet**: `Dp040ViewSet`
- **Model**: `Dp040`
- **approved_field**: `approve`
- **approved_value**: `Y`
- **allow_edit_after_approve**: `False`
- **allow_delete_after_approve**: `False`

## 9. 後端測試結果

1. **PUT / PATCH / DELETE 攔截**：對 `approve = 'Y'` 的紀錄送出上述請求，系統正確回傳 `403 Forbidden` 與 `{"detail": "此資料已審核..."}`。
2. **反審核正常**：對 `approve = 'Y'` 送出 `POST /uncheck/` 依然成功執行，並將欄位改為 `'N'`。
3. **無縫銜接**：未審核單據 (`approve = 'N'`) 皆依原本邏輯正常存檔與刪除。
4. **權限不受影響**：`check` / `uncheck` 仍正確使用 `HasProgramPermission` 的權限檢查。

## 10. 前端測試結果

1. **按鈕狀態**：當 `selectedRecord` 為已審核時，Navbar 的「編輯」、「刪除」、「儲存」按鈕皆被 `isActionEnabled` 正確反白 (Disabled)。
2. **防雙擊編輯**：於 Grid 行上雙擊已審核資料，不會觸發 `setEditingRowIndex`，成功防止偷偷進入編輯態。
3. **指令阻擋**：即便透過熱鍵 (F5/F6/Ctrl+S)，`useRecordWorkbenchCrud.js` 派發指令時會跳出 `message.warning('此資料已審核，請先反審核後再修改。')` 並阻擋執行。
4. **狀態復原**：點擊「反審」成功後，選取資料的狀態更新為 `'N'`，所有被鎖定的修改功能隨之恢復。

## 11. Dirty / F2 / Cascading Lookup 迴歸結果

- **Dirty Tracking**：由於禁止進入 Edit 狀態，表單無法輸入，因此完美避開了被標記為 Dirty 的可能，不影響 Close Confirm 防呆。
- **F2 / Cascading Lookup**：因為無法觸發 Input OnChange 與表單變更，這兩個機制也受到鎖定保護，未遭到破壞。

## 12. 尚未完成事項

- `is_print` 的保護 (ReportModal)：目前尚未實作 Report 列印相關的保護與行為，需留待報表模組翻新時處理。
- 單據產生 (Bill No API) 或更深層的 DeepSave 限制。

## 13. 下一階段建議

目前框架已具備 Navbar 狀態驅動、Dirty Tracking、F2 / Cascading Lookup、ApprovalMixin (共用審核與防呆)。
**建議下一階段可進行：**
- **Bill No API (單號自動產生器)**：統一處理 `w_xx000` 類單據在新增時的單號發放機制，解決前端需要手動輸入單號的麻煩，也是 PB `wf_GetBillNo` 的基礎設施。
