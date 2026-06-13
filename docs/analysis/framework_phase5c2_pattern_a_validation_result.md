# Phase 5C-2 實作完成報告：Pattern A / Win32DataWindow Validation 補齊

本文件記錄了 Phase 5C-2 的實作結果，將儲存前的資料檢核防護網 (Validation Framework) 延伸至 Pattern A 單檔作業，使 `Win32DataWindow` 的網格編輯能與後端 `bulk_save` 實現雙層防呆機制。

## 1. 實作摘要

本階段成功將前端的 `Win32DataWindow` (Pattern A 核心組件) 賦予了儲存前驗證的能力。
透過比對 `columns` 定義以及 `programRegistry.js` 的 `validationConfig`，能在派發 API 之前針對每一列變更 (或新增) 進行掃描。
若發現必填缺失或格式不符，會即時拋出警告，保留使用者的輸入 (`dirty` 狀態)，並不傳送任何請求至後端。
同時，後端擴充了 `ValidationMixin`，使繼承了 `BaseDictionaryViewSet` 的 API 能夠在 `bulk_save` 階段接收並核對所有異動資料，任何一筆資料不合格都會觸發 Transaction 回滾，確保資料庫絕對乾淨。

## 2. 修改了哪些檔案

- `frontend/src/components/Win32DataWindow.jsx`: 重寫 `handleSave` 內部邏輯，引入前端校驗機制，並解析後端回傳的標準陣列錯誤格式。
- `backend/api/common/mixins/validation.py`: 新增 `validate_grid_rows` 與 `check_bulk_save_validation` 方法。
- `backend/api/common/mixins/bulk_save.py`: 於 `bulk_save` 入口處加入攔截鉤子，並捕獲 `ValidationError` 以標準格式回應前端。
- `backend/api/views.py`: 讓 `BaseDictionaryViewSet` 繼承 `ValidationMixin`，使所有通用字典預設具備掛載校驗的能力。
- `backend/api/modules/ba/views.py` (`Ba001ViewSet`): 掛載 `validation_config` 進行試點。
- `backend/api/modules/mr/views.py` (`Mr030ViewSet`): 掛載 `validation_config` 進行試點。
- `frontend/src/config/programRegistry.js`: 於 `w_ba001` 與 `w_mr030` 加入對應的 `validationConfig` 參數。

## 3. 新增了哪些檔案

無 (沿用並擴充 Phase 5C 建立的 `ValidationMixin`)。

## 4. Pattern A Validation 設計

架構上採取「優先依據 `columns`，若無則依據 `validationConfig`」的策略。
由於 Win32DataWindow 原本就有 `columns.required`、`columns.min/max`、`columns.maxLength` 等屬性設定，前端檢核程式會將這兩者交集聯集，以最嚴格的標準過濾使用者的每次 `handleSave`。
對於已刪除 (`deleteList`) 的列，我們跳過檢核 (不需對即將被拋棄的資料斤斤計較)；而對於新生成的列 (`temp_` 開頭) 或是已存在的髒資料 (`dirtyMap`) 則必定校驗。

## 5. Win32DataWindow 前端驗證方式

當使用者按下存檔按鈕時：
1. `Win32DataWindow.handleSave` 將 `rows` 與 `dirtyMap` 融合出 `upsertList`。
2. 遍歷 `upsertList` 與所有欄位。若：
   - 欄位是必填但無值。
   - 欄位值大於 `max` 或小於 `min`。
   - 欄位字串長度大於 `maxLength`。
3. 一旦觸發，立刻執行 `message.error("第 N 列，欄位 X 不可為空白")`，還原 Sheet State，阻擋後續的 Axios 請求。

## 6. useBulkSave / bulk_save 後端驗證方式

後端 `bulk_save` 收到來自前端的 `{ upsert: [...], delete: [...] }` 請求後：
1. 呼叫 `ValidationMixin` 的 `check_bulk_save_validation`。
2. 逐行掃描傳入的 JSON Dictionary。
3. 若驗證失敗，收集所有的 Error Dictionaries，拋出 `ValidationError` (400)。
4. `bulk_save` 外層以 `@action` 攔截，回傳結構化的 JSON Errors 陣列。
5. 前端收到 400，解析 `err.response.data.errors[0]`，顯示精確的錯誤訊息。

## 7. 標準錯誤格式

後端檢核失敗時，會針對 Grid 行為回傳如下的標準化格式：
```json
{
  "success": false,
  "errors": [
    {
      "scope": "grid",
      "row": 3,
      "field": "cname",
      "label": "中文名稱",
      "message": "第 3 列 中文名稱 不可空白"
    }
  ]
}
```

## 8. 試點作業

### Ba001 個人片語字庫
- **測試重點**: `ba001code` (代號) 與 `cname` (中文名稱) 皆為必填且具長度限制。
- **測試結果**: 前後端攔截皆成功運作。若前端刻意 Bypass (`window.fetch` 等方式) 送出少於欄位的 Payload，後端的 `check_bulk_save_validation` 會阻擋並回退 Transaction。

### Mr030 材料紋路設定
- **測試重點**: `graincode` (紋路代號) 長度最高 6，且為必填。
- **測試結果**: 在新稱多筆且某幾筆未填寫必填的情況下存檔，能準確報出有問題的行數與欄位。

## 9. Pattern B Validation 迴歸結果

正常。Pattern A 擴充使用的是 `validate_grid_rows`，與 Pattern B 使用的 `validate_master_data` 與 `validate_details_data` 為獨立的方法，互不干涉。

## 10. Dirty / F2 / Cascading Lookup 迴歸結果

正常。驗證錯誤時會刻意保留 `dirtyMap` 的內容而不清除，讓使用者能接續修改，無需重新輸入，完美銜接 F2 開窗與連動帶入。

## 11. 尚未完成事項

- Grid Cell 的 CSS 反紅提示。目前錯誤訊息已在右上角 Global Message 清晰提示出第 N 列，但在儲存格上直接打紅底 / tooltip 會提供更好的 UX，未來可列入 Win32DataWindow 增強計畫中。
- 大規模套用 Validation Config 於所有 Pattern A 作業 (現階段以核心框架建設為主)。

## 12. 下一階段建議

目前前後端所有維度的驗證、防呆、存檔保護已全部就緒 (5A/5B/5C)。
強烈建議進入 PB 開發中最經典的 **ItemChanged 欄位連動計算** (Phase 5D)。此部分不僅能提供最佳的填單體驗 (如選料號帶入單價，打數量自動算小計)，也是 PB Client/Server 轉換 Web 的重要體驗指標。
