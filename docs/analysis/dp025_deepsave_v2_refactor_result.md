# Phase 8B-2B: DP025 DeepSaveMixinV2 Standardization Report

## 1. Executive Summary
本階段成功將 DP025 (型體基本資料主檔) 從危險的前端分散存檔機制，重構為基於 `DeepSaveMixinV2` 的原子性存檔 (Atomic Transaction)。DP025 現已具備與 DP030 相同的底層標準，大幅提升資料庫一致性與安全性。

## 2. 本階段修改範圍
1. `backend/api/modules/dp/views.py`: 修改 `Dp025ViewSet`，掛載 `DeepSaveMixinV2` 等防護 Mixins。
2. `frontend/src/views/Dp025Sheet.jsx`: 重構 `handleSaveAll`，將 4 個 HTTP Request 收斂為單一的 `deep_save/` 請求。
3. `frontend/scripts/smoke_test.cjs`: 將 DP025 加入自動化前端回歸測試防護網。

## 3. DP025 舊存檔流程問題
* **無原子性**：舊寫法使用 `axios.post` 存主檔，取得 `gkey` 後，才用 `Promise.all` 發送三個 `bulk_save/` 請求。若途中失敗，會殘留半套不完整的資料在資料庫，造成後續運算異常。
* **無防呆檢查**：前端未進行嚴謹的單價與成本負數阻擋。
* **鎖定失效**：`confirms` 欄位未能有效阻擋已鎖定資料的變更。

## 4. DeepSaveMixinV2 接入方式
於 `Dp025ViewSet` 類別繼承以下 Mixins：
* `DeepSaveMixinV2`
* `ValidationMixin`
* `ApprovalMixin` (因為具備 confirms 欄位)
* `DataConstraintFilterBackend` (針對 `es101gkey` 欄位)

## 5. deep_save_config 最終設定
```python
deep_save_config = {
    "master_serializer": Dp025Serializer,
    "master_lookup_field": "gkey",
    "details": {
        "prices": {
            "model": Dp026,
            "serializer": Dp026Serializer,
            "parent_field": "dp025gkey",
            "lookup_field": "gkey",
            "delete_mode": "hard"
        },
        "tech": {
            "model": Dp027,
            "serializer": Dp027Serializer,
            "parent_field": "dp025gkey",
            "lookup_field": "gkey",
            "delete_mode": "hard"
        },
        "accessories": {
            "model": Dp028,
            "serializer": Dp028Serializer,
            "parent_field": "dp025gkey",
            "lookup_field": "gkey",
            "delete_mode": "hard"
        }
    }
}
```
*保留原本 Hard Delete 的行為以確保前端相容性。*

## 6. 前端 payload 調整方式
前端在 `handleSaveAll` 中直接組裝出符合 V2 標準的 Payload：
```json
{
  "master": { "styleno": "...", "year": "..." },
  "prices": { "upsert": [...], "delete": ["gkey1"] },
  "tech": { "upsert": [...], "delete": [] },
  "accessories": { "upsert": [...], "delete": [] }
}
```
一次性打向 `/api/dp025/deep_save/`。

## 7. 三組 detail 儲存策略
維持原有 `prices` (Dp026), `tech` (Dp027), `accessories` (Dp028) 名稱與對應，不修改前端 state，將其包裹在單一 Request 內由後端 V2 解析與派發至 `_save_detail_group`。

## 8. Validation / Approval / DataConstraint 整合
* **Validation**: 前端加入單價、成本的負數檢查；並嚴格檢查主鍵 (styleno)、名稱 (stylename) 及年度 (year)。
* **Approval**: 後端套用 `ApprovalMixin` (`approve_config` 對應 `confirms` 欄位)。前端亦加入了 `selectedStyle.confirms === 'Y'` 的阻擋存檔防線。
* **DataConstraint**: 透過 `DataConstraintFilterBackend` 保護 `es101gkey` 的資料存取權限。

## 9. itemChangedRules 整理結果
DP025 未使用 Factory，前端行為已內建於 component，主要連動如下：
1. **外鍵穿透 (Group Selection)**：當選擇組別 (`dp023gkey`) 時，會自動穿透帶出關聯的楦頭 (`dp010gkey`)、大底 (`dp015gkey`)、鞋跟 (`dp020gkey`)。
2. **港口 (Port) 帶入**：由 F2 選單帶回 `term` 至對應的價格明細中。

## 10. legacy bulk_save 保留策略
* `Dp026ViewSet`, `Dp027ViewSet`, `Dp028ViewSet` 仍繼承 `BaseDictionaryViewSet` (內含 `bulk_save`)，故舊有 API Endpoint 仍可正常運作，確保外部依賴不中斷。未來若確定無人使用可統一清理。

## 11. transaction rollback 測試結果
* **結果**：✅ 通過。若單組明細或 validation 失敗，整個主檔與其餘明細資料皆不會被寫入，成功達成 100% ACID 原子性。

## 12. 前端回歸測試結果
* **DP025 CRUD**：✅ 新增、修改、刪除多組明細，一次性存檔後重新讀取結果完全一致。
* **Dirty Tracking**：✅ 存檔後重設為 `false`，操作正常。

## 13. 後端回歸測試結果
* **BA015 / DP030 / DP040**：✅ 透過 Puppeteer Smoke Test Guard (`npm run smoke:frontend`) 驗證，均可正常開啟且無阻擋級別錯誤。
* **Build**：✅ `npm run build` 編譯通過。

## 14. 尚未完成事項
* DP010 (楦頭基本資料) 的 Matrix 重構尚未啟動 (列入 Phase 8B-2C)。
* DP025 目前仍使用手刻 UI，尚未轉型為 `createRecordWorkbenchSheet` (考量其 `import_from_sample` 與特殊 F2 選單等邏輯，目前「Pattern B 核心骨幹 + V2」已達成安全標準，無需強行套用 Factory 導致 UI 大改)。

## 15. 下一階段建議
建議啟動 **Phase 8B-2C：DP010 楦頭基本資料客製化重構**。由於 DP010 的 UI 具有二維尺碼矩陣，需以謹慎的客製 Hook 手法介入 `DeepSaveMixinV2` 進行對接。
