# BA015 Golden Sample 標準化報告

## 1. Executive Summary

本階段選定 **BA015 (工廠資料管理)** 作為第一支 **Golden Sample 作業**。透過套用 Phase 1 ~ 7A 的 Framework Baseline，我們徹底將 BA015 從舊有半手刻狀態，轉換為 100% Config-driven 與 Factory-driven 的標準 Pattern B (Master-Detail) 作業。

此 Golden Sample 將作為未來 DP / MR / SA 等大型業務作業翻新時，最具權威性的參考範本。

---

## 2. 為何選 BA015 作為 Golden Sample

1. **結構具代表性**：它是標準的 Pattern B (Master `Ba015` + Detail `Ba016`)，涵蓋了主檔與多明細的聯動需求。
2. **複雜度適中**：相比於 DP030 / DP040，BA015 邏輯較單純，沒有過於複雜的成本或加總回算，適合乾淨地展示 Factory 與 Mixin 的純粹用法。
3. **已驗證過深層儲存**：BA015 於 Phase 6B 已經接入 `DeepSaveMixinV2` 試點，具有完備的後端測試基礎。

---

## 3. BA015 Pattern 分類

- **前端 Pattern**：Pattern B (Record Workbench / Master-Detail 編輯台)
- **前端 Factory**：`createRecordWorkbenchSheet`
- **後端 API**：`/api/ba/ba015/` (Master) 與 `/api/ba/ba016/` (Detail)
- **後端 Mixin**：`DeepSaveMixinV2`, `ValidationMixin`

---

## 4. BA015 前端架構檢查

| 檢查項目 | 原本狀態 | 修正後狀態 (Golden Sample) |
| :--- | :--- | :--- |
| **手刻 UI 元件** | 有 (使用 `Ba015BaseSheet.jsx` 刻畫面) | **無**，全面改用 `createRecordWorkbenchSheet` |
| **狀態管理 (State)** | 手動 `useState` 控制 `entities` | **無**，交由 `useRecordWorkbenchCrud` 接管 |
| **Dirty Tracking** | 無 / 手動攔截 | **有**，內建於 Factory |
| **儲存 Payload** | 手工組裝 | **Config-driven** (`buildDeepSavePayload`) |
| **Grid 欄位定義** | 寫死在 JSX 中 | **Config-driven** (`detailTabs[].columns`) |

---

## 5. BA015 後端架構檢查

| 檢查項目 | 原本狀態 | 修正後狀態 (Golden Sample) |
| :--- | :--- | :--- |
| **DeepSave 引擎** | 舊版 `DeepSaveMixin` 且 config 格式混亂 | **標準化**，全面使用 `DeepSaveMixinV2` |
| **Validation 整合** | 未明確接入 | **已接入** (`ValidationMixin`) |
| **資料儲存迴圈** | 由 `DeepSaveMixin` 處理 | **由 `DeepSaveMixinV2` 處理** (含 tempId mapping) |
| **Transaction** | 有 | **有**，且具備完整的 Rollback 安全網 |

---

## 6. programRegistry 設定總覽

前端 `programRegistry.js` 與 Factory 設定檔已標準化：
- **`masterKey`**: `'gkey'`
- **`createDefaultRecord`**: 提供 `{ type: '1' }` 預設值。
- **`detailTabs`**: 透過 JSON 陣列定義 `ba016` 的 `apiEndpoint` 與 `columns`。
- **`renderMasterForm`**: 純粹負責 UI 渲染，不介入商業邏輯或狀態控管。

---

## 7. deep_save_config 設定總覽

後端 `Ba015ViewSet` 已標準化：
```python
    deep_save_config = {
        "master_serializer": Ba015Serializer,
        "master_lookup_field": "gkey",
        "details": {
            "ba016": {
                "model": Ba016,
                "serializer": Ba016Serializer,
                "parent_field": "ba015gkey",
                "lookup_field": "gkey",
                "delete_mode": "hard"
            }
        }
    }
```

---

## 8. 尚未修正或不需要修正的項目

- **ReportConfig**：目前 BA015 沒有強烈的報表列印需求，因此未在 Factory config 中配置 `reportConfig`。若未來需要，僅需在 config 補上即可，無須修改元件。
- **ItemChangedRules**：BA015 目前無動態欄位連動計算需求，因此未配置。

---

## 9. 前後端測試結果

- **前端測試**：成功。
  - 順利載入 `createRecordWorkbenchSheet`。
  - 新增/編輯模式切換正常，Dirty 提示正常運作。
  - Master-Detail 資料能正確被組裝為 `{ master: {}, details: { ba016: { upsert: [], delete: [] } } }` 並發送。
- **後端測試**：成功。
  - `DeepSaveMixinV2` 成功解析 Payload，Transaction atomic 運作正常，儲存後正確回傳最新資料與 `sync_map`。

---

## 10. BA015 Golden Sample 最終標準

透過 BA015，我們確立了「**零手刻業務邏輯**」的終極目標。所有表單的運作、存檔的組裝、防呆的檢查，全數交由 Factory / Mixin 與 Config 處理。這將使得未來的開發者只需專注於 **宣告資料結構 (Config)**，而無須再與 React Hooks 或 DRF 迴圈搏鬥。

---

## 11. 後續作業翻新 Checklist (標準模板)

未來開發 DP / MR / SA 模組時，請直接複製以下 Checklist，確保該作業符合 Golden Sample 標準：

```text
新作業翻新 Checklist：

[ ] 1. 確認 Pattern (Pattern A Grid 或 Pattern B Master-Detail)
[ ] 2. 建立 programRegistry (註冊 programId, title, apiUrl 等)
[ ] 3. 定義前端 Master Form 元件 (僅負責 UI 渲染，不含 CRUD state)
[ ] 4. 定義 detailTabs (設定網格欄位與 apiEndpoint)
[ ] 5. 設定 toolbarConfig (按鈕顯示與權限)
[ ] 6. 設定 permissionConfig
[ ] 7. 設定 lookupConfig (開窗對接)
[ ] 8. 設定 validationConfig (必填與邏輯防呆)
[ ] 9. 設定 itemChangedRules (若有欄位連動加總需求)
[ ] 10. 設定 reportConfig (若有列印匯出需求)
[ ] 11. 後端建立對應 Model 與 Serializer
[ ] 12. 後端建立 ViewSet 並繼承 BaseDictionaryViewSet
[ ] 13. 後端設定 deep_save_config (Pattern B 必備)
[ ] 14. 後端依需求繼承 DeepSaveMixinV2 / ApprovalMixin / BillNoMixin
[ ] 15. 測試 CRUD (新增、修改、刪除)
[ ] 16. 測試 Dirty Tracking (未存檔跳離阻擋)
[ ] 17. 測試 Validation (前端紅字與後端 400 阻擋)
[ ] 18. 測試 Lookup (F2 / Cascading 傳值正常)
[ ] 19. 測試 Report (報表產出正常)
```
