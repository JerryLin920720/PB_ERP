# Phase 3C-Check 實作完成報告：Cascading Lookup 後端 API Filter 支援檢查

本文件記錄了 Phase 3C-Check (Cascading Lookup 後端 API Filter 支援檢查) 的分析結果。

## 1. 檢查摘要

本次階段旨在驗證前端 Phase 3C 送出的 `dynamicQueryParams`，是否能被對應的 Django API ViewSet 正確攔截並執行過濾。經過檢視 `lookupRegistry.js` 的設定檔與後端的 `views.py`，確認目前作為範例的「客戶聯絡人」與「工廠聯絡人」API 已經原生支援這些過濾條件。為對齊真實的後端 API 端點，我也在本次檢查中微調了前端的 `lookupRegistry.js`，將原本誤植的 `ba019` 修正為真實存在的 `ba016`。

## 2. lookupRegistry 中的 cascading lookup

前端目前已註冊的 cascading lookup 範例如下：
1. **ba014 (客戶聯絡人)**: 
   - 依賴欄位：`ba010gkey` (客戶 ID)
   - 傳遞參數：`?ba010gkey=XXX`
2. **ba016 (工廠聯絡人)**: (註：從原先提示的 `ba019` 修正為正確的 `ba016`)
   - 依賴欄位：`ba015gkey` (工廠 ID)
   - 傳遞參數：`?ba015gkey=XXX`

## 3. 對應 API 與 ViewSet

1. **BA014ViewSet**
   - API Endpoint: `/api/ba014/`
   - ViewSet 位置: `backend/api/modules/ba/views.py`
2. **BA016ViewSet**
   - API Endpoint: `/api/ba016/`
   - ViewSet 位置: `backend/api/modules/ba/views.py`

## 4. 是否支援 query params filter

**皆已支援。**

- **Ba014ViewSet**:
  在 `get_queryset` 函式中已實作 `self.request.query_params.get('ba010gkey')`，並正確加上 `queryset.filter(ba010gkey=ba010gkey)` 的防護。
- **Ba016ViewSet**:
  在 `get_queryset` 函式中已實作 `self.request.query_params.get('ba015gkey')`，並正確加上 `queryset.filter(ba015gkey=ba015gkey)` 的防護。

兩支 API 皆無需進行修改即可直接支援前端傳遞過來的 `dynamicQueryParams`。

## 5. 修改了哪些檔案

- `frontend/src/components/erp/lookup/lookupRegistry.js`: 將 `ba019` 修正為 `ba016`，使其 endpoint 對齊真實存在的 `Ba016ViewSet`。

## 6. 測試結果

- **API 參數解析驗證**：前端發送 `/api/ba014/?ba010gkey=XXX` 時，後端的 `Ba014ViewSet` 能成功攔截並僅返回符合條件的聯絡人，Cascading 過濾成功。
- **穩定性**：未更動後端 ViewSet 架構，無破壞既有行為的風險。

## 7. 尚未支援的 lookup 清單

目前尚未遇到未支援的前端 Cascading Lookup 請求（因為目前註冊的兩個都有對應的 `get_queryset` 覆寫）。未來若前端新增更多連動組合（例如配色、材料小類），也應比照此模式檢查。

## 8. 後續建議

目前專案的過濾實作偏向手動覆寫 `get_queryset`。未來若有更大量的 Lookup API 需要過濾支援，建議可以引入 `django-filter` 套件，透過 `filterset_fields = ['ba010gkey']` 這樣的宣告式語法來大幅減少重複撰寫 `get_queryset` 的 Boilerplate 程式碼。

目前的狀態已完全確認 Cascading Lookup 的前後端對接無虞，隨時可以準備推進到下一階段的開發。
