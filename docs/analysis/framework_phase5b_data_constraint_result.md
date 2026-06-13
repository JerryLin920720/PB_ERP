# Phase 5B 實作完成報告：Data Constraint 資料範圍限制

本文件記錄了 Phase 5B (Data Constraint / sys_constraint) 的實作結果，主要負責對 PB 舊系統中 `is_constraint` 與資料可見度過濾機制的翻新與收斂。

## 1. 實作摘要

本次階段成功將 PB 的 `wf_GetConstraint()` 資料範圍限制機制，以 Django DRF 的 `BaseFilterBackend` 架構進行了實作。
新機制完全集中於後端 QuerySet 層級進行過濾，前端只負責在 `programRegistry.js` 中加上文件註記 (`dataConstraintConfig`)。
此設計達成了「即便使用者惡意在前端攔截或偽造 API 請求，也無法跨越資料權限範圍」的安全目標。

## 2. 修改了哪些檔案

- `backend/api/modules/dp/views.py`: 於 `Dp030ViewSet` 與 `Dp040ViewSet` 中加入了 `DataConstraintFilterBackend` 並配置了 `data_constraint_config`。
- `frontend/src/config/programRegistry.js`: 為 `dp030` 與 `dp040` 加上 `dataConstraintConfig` 以供前端開發者識別此作業受資料範圍保護。

## 3. 新增了哪些檔案

- `backend/api/common/filters/data_constraint.py`: 全新的通用資料範圍過濾機制 `DataConstraintFilterBackend`。

## 4. sys_constraint 是否已有 Model

經過盤點與搜尋，目前專案的 `models.py` 中**尚未存在**對應 PB `sys_constraint` 的資料表 Schema (無 `SysConstraint` 實體類別)。
因此，本階段實作為**「Framework 版 Config-Driven」**。所有的規則改由 ViewSet 內宣告 `data_constraint_config` 取代硬碟上的資料庫表，既能滿足現階段試點需求，亦嚴守了「不修改資料庫 Schema」的原則。未來若有需要，可隨時將 `rules` 改由資料庫動態載入。

## 5. DataConstraintFilterBackend 設計

`DataConstraintFilterBackend` 繼承自 `rest_framework.filters.BaseFilterBackend`。
DRF 會在執行 `list()` 與 `retrieve()` (透過 `get_object()`) 時，自動呼叫 `filter_queryset`。這保證了：
1. `GET /api/dp030/` (列表) 會被過濾，只回傳有權限的資料。
2. `GET /api/dp030/{gkey}/` (單筆) 若不屬於該使用者的資料範圍，會直接拋出 `404 Not Found` (因為被過濾掉找不到 Object)。

## 6. data_constraint_config 欄位說明

ViewSet 宣告範例：
```python
data_constraint_config = {
    "enabled": True,             # 總開關
    "mode": "by_maker",          # 辨識用名稱
    "field": "es101gkey",        # 資料庫/Model 欄位名稱
    "source": "es101gkey",       # 登入者身分來源 (支援 username, es101gkey, departmentgkey)
    "rules": [ ... ]             # (進階) 支援複合多條件過濾陣列
}
```

## 7. admin / superuser bypass 規則

在 `filter_queryset` 的最前端加入了管理員例外：
```python
account = get_current_sys_account(request)
if is_admin(account):
    return queryset
```
若當前使用者擁有最高權限 (Superuser / Admin)，系統將無視所有 Constraint，回傳原始的完整 QuerySet，完美對應 PB 中最高權限者的「看全資料」行為。

## 8. source 取值邏輯

目前初版支援三種對應來源：
1. `username`: 直接對應系統帳號 `account.accounts_id`。
2. `es101gkey`: 透過 `get_current_es101gkey(request)` 解析出員工主檔的 Gkey。
3. `departmentgkey`: 透過 `get_current_es101(request)` 解析出所屬部門的 Gkey。

若設定之欄位在目標 Model 內不存在，Filter 會自動防呆並寫入 Logger Warning，而不會導致系統 Crash (HTTP 500)。

## 9. 套用試點作業

### DP030 樣品單主檔
- **Constraint 欄位**: `es101gkey` (Maker)
- **Source 來源**: `es101gkey`
- **測試結果**: 一般登入者僅能查閱自己開立的樣品單；管理員登入則可查閱全公司樣品單。

### DP040 樣品出貨單主檔
- **Constraint 欄位**: `es101gkey` (Maker)
- **Source 來源**: `es101gkey`
- **測試結果**: 邏輯同上，過濾機制正常運作，單筆查詢超出範圍時會回傳 404。

## 10. 後端測試結果

1. **無 Config 的 ViewSet**：不受影響，如舊。
2. **列表 (List)**：被過濾，回傳數量減少為個人範圍。
3. **單筆 (Retrieve)**：越權存取他人資料會因 `get_object()` 無法從被 Filter 的 QuerySet 找出資料而拋出 `404 Not Found`。
4. **異常容錯**：配置錯誤的欄位不引發 Server Error。

## 11. 前端測試結果

- 前端完全無須修改，所有的查詢動作 (`fetchList`、`loadDetails`) 自動獲得安全的短表單回應。
- Frontend Dirty Tracking 正常。
- Navbar config-driven 正常。

## 12. HasProgramPermission 關係說明

`HasProgramPermission` 與 `DataConstraintFilterBackend` 分工明確：
- **`HasProgramPermission`**：管「門禁」。判斷該使用者能不能按 `[Query]` 鈕，有沒有權限呼叫 `/api/dp030/`。
- **`DataConstraint`**：管「抽屜」。進門後，決定該使用者能看到哪些抽屜裡的單據。

## 13. ApprovalMixin / Approve Lock 迴歸結果

正常運作。兩者的防呆與攔截邏輯在不同層面 (`update/destroy` 攔截 vs QuerySet 過濾)，互不干擾。由於使用者只能看到自己的資料，自然也只能對自己的資料進行審核/反審核 (若他們具有 check/recheck 權限)。

## 14. BillNoMixin 迴歸結果

正常運作。`/get-bill-no/` 使用的是整個 Table (或同 Prefix) 的資料來計算最大值，這是系統級的操作；`BillNoMixin` 中刻意使用了原始 `model_class.objects.select_for_update()`，繞過了 `DataConstraintFilterBackend`，確保取號時不會因為「只看到自己的單據」而導致從 `0001` 重複取號。

## 15. 尚未完成事項

- `sys_constraint` 資料表的重建與 GUI 管理介面，以及透過 DB 讀取動態 `rules` 的功能。

## 16. 下一階段 Phase 5C wf_CheckData 建議

Data Constraint 已完成，系統的「資料防護網」成型。
接下來建議進入 **Phase 5C：wf_CheckData 資料邏輯檢核與必填防呆**。這將是 PB 舊系統最重要的存檔前防護機制，我們需要確立前後端該如何分工 (例如前端使用 Antd Form `validateFields`，後端使用 DRF Serializer `validate`)，以達成體驗最好且防禦最嚴密的儲存驗證。
