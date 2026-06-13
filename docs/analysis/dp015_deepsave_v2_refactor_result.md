# DP015 DeepSaveMixinV2 Refactor Result (Phase 8B-3-1)

## 1. Executive Summary
本階段成功將 `DP015 (大底基本資料)` 的後端存檔架構標準化，徹底修復前端呼叫 `/api/dp015/deep_save/` 卻無對應端點的高風險斷鏈狀態。
透過為 `Dp015ViewSet` 接入 `DeepSaveMixinV2` 並對前端 `Dp015Sheet.jsx` 進行 Delete Tracking (刪除狀態追蹤) 的必要小修，我們確保了 Master (Dp015) 與三層明細 (Dp016 / Dp017 / Dp018) 能在安全且具備原子性 (Atomic Transaction) 的環境中順利存檔。

## 2. 本階段修改範圍
* `backend/api/modules/dp/views.py`: 修改 `Dp015ViewSet`，繼承 `DeepSaveMixinV2` 與 `ValidationMixin`，實作 `deep_save_config`、`pre_deep_save_hook`、`_save_detail_group`。
* `frontend/src/views/Dp015Sheet.jsx`: 新增 `deletedDp016` 等 Delete State 追蹤，並將 `handleSave` 的 payload 從純陣列改為符合 V2 標準的 `{ upsert, delete }` 格式。

## 3. DP015 端點斷鏈風險說明
重構前，前端 `Dp015Sheet.jsx` 使用 `axios.post('/api/dp015/deep_save/')` 進行存檔，但後端 `Dp015ViewSet` 僅定義了 `@action(url_path='legacy_deep_save')`，並未掛載提供 `deep_save` 的 Mixin。這導致前端存檔請求必然遭遇 404 (Not Found) 錯誤。本次重構已補齊 V2 端點，斷鏈風險完全解除。

## 4. legacy_deep_save 盤點
原 `legacy_deep_save` 採用暴力且危險的 Replace-all 策略 (`Dp016.objects.filter(...).delete()`)，且自行手動映射新舊 Foreign Key。我們已將此函式保留並加上 `[DEPRECATED]` 註解作為 fallback，未來可安全移除。

## 5. DeepSaveMixinV2 接入方式
為 `Dp015ViewSet` 引入 `DeepSaveMixinV2`。為了相容前端可能送來的字串陣列 (String Array) 刪除清單，我們在 `pre_deep_save_hook` 實作了防呆轉換邏輯，將字串陣列轉換為 `[{ 'gkey': id }]` 物件格式。同時覆寫 `_save_detail_group` 來解析 Dp017 與 Dp018 依賴的巢狀 `temp_` Foreign Key。

## 6. deep_save_config 最終設定
```python
deep_save_config = {
    "master_serializer": Dp015Serializer,
    "master_lookup_field": "gkey",
    "details": {
        "dp016": { "model": Dp016, "serializer": Dp016Serializer, "parent_field": "dp015gkey", "lookup_field": "gkey", "delete_mode": "hard" },
        "dp017": { "model": Dp017, "serializer": Dp017Serializer, "parent_field": "dp015gkey", "lookup_field": "gkey", "delete_mode": "hard" },
        "dp018": { "model": Dp018, "serializer": Dp018Serializer, "parent_field": "dp015gkey", "lookup_field": "gkey", "delete_mode": "hard" }
    }
}
```

## 7. Dp016 / Dp017 / Dp018 儲存策略
不再依賴 Replace-all，改由 V2 標準的 `upsert` 與 `delete` 進行實體異動 (Hard Delete)。
對於階層式的外鍵更新 (例如 Dp017 關聯 Dp016)，透過 V2 預設的 `context['gkey_map']` 配合 `_save_detail_group` 中的手動映射進行即時替換。

## 8. 前端 endpoint / response 相容修正
* Payload 完全遵循 V2：將 `dp016List` 轉換為 `{ upsert: [..._without_temp], delete: deletedDp016 }`。
* `response.data.gkey` 的解析邏輯優化為 `response.data?.data?.gkey || response.data?.gkey || mPayload?.gkey` 以相容 V2 標準 Response。

## 9. Validation / DataConstraint / Approval 判斷
* **ValidationMixin**: 已掛載，確保必要欄位 (如 `bottomno`) 被正確防護。
* **DataConstraintFilterBackend & ApprovalMixin**: **未掛載**。經盤點 DP015 Model，不存在 `es101gkey` (建檔人)、`maker` 或 `confirms` (審核) 等適用於資料隔離與鎖定的業務欄位，因此不強加非 PB 既有的業務限制。
* **BillNoMixin**: **未掛載**。大底編號由使用者自行輸入或另有規則，不需要統一單號產生器。

## 10. legacy_deep_save 保留策略
原 `@action(url_path='legacy_deep_save')` 未被刪除，僅標記 `deprecated` 註解。

## 11. transaction rollback 測試結果
[PASS] 確認 `transaction.atomic()` 作用中。若任何一層明細 (如 Dp017) 驗證失敗拋出 400，主檔與其他明細皆會 Rollback，無半套存檔問題。

## 12. 前端回歸測試結果
[PASS] `npm run build` 與 `npm run smoke:frontend` 均通過。DP015 UI 中刪除/新增明細的操作皆精確映射至 Delete States。

## 13. 後端回歸測試結果
[PASS] BA015, DP025, DP030, DP040 均正常運作，共用的 `DeepSaveMixinV2` 底層未受到任何破壞。

## 14. 尚未完成事項
DP 模組中尚有 DP004 / DP080 / DP100 仍使用舊版 V1 `DeepSaveMixin`。

## 15. 下一階段建議
建議立即啟動 **Phase 8B-3-2：DP004 / DP080 / DP100 V1 升級 V2 計畫**，以實現 DP 模組深層儲存架構的全面統一與最終封版。
