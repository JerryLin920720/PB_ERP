# Phase 8B-1 DP040 DeepSaveMixinV2 Standardization Refactor Result

## 1. Executive Summary
本報告總結了 Phase 8B-1 針對 DP040 (樣品出貨單) 的底層補齊工作。本次重構成功將 DP040 後端儲存邏輯從高風險手刻的 `legacy_deep_save` 升級為標準化的 `DeepSaveMixinV2` 架構，並同時保留了前端 `Dp040Sheet.jsx` 的客製化動態 UI 及物理驗證，實現了「前端最小變動，後端架構標準化」的無痛升級。重構後不僅完全覆蓋了 DP040 與 DP030/DP031/DP033 之間的聯動計算，也消滅了前後端潛在的 ID 錯綁風險。

## 2. DP040 現況拆解
* **前端 (Dp040Sheet.jsx)**：保留了原有的手工 `useState` 管理與複雜的多頁籤裝箱配對 (Dp042, Dp043)。由於 Payload 本身已相容 V2，僅修正了 Response 解讀 (`res.data.data.gkey`) 與 ReportModal 錯誤參照 (`selectedMaster`) 的小問題。
* **後端 (Dp040ViewSet)**：原本是唯一沒有套用 `DeepSaveMixinV2` 的 P0 交易表單，包含了手動處理 Dp041, Dp042, Dp043 以及 `SampleStatusService` 聯動的巨大方法。現已完全重構接入 V2。

## 3. legacy_deep_save 盤點
原 `legacy_deep_save` 處理了三個複雜行為：
1. 刪除資料前的依賴解綁。
2. 內層 FK (`dp043` 依賴 `dp041` / `dp042` 的 `temp_` ID) 轉換。
3. `Dp033.finishpairs` 數量累加回灌與 `SampleStatusService` 觸發。
這些邏輯現已全數被抽離並由 V2 的 Hook 優雅接管。`legacy_deep_save` 仍保留為 `@action(detail=False, url_path='legacy_deep_save')`，作為後備安全網。

## 4. 前端 Factory 化可行性
經評估，**本階段不強行進行 Factory 化**。
由於 DP040 具備出貨專屬的「物理失衡」跨表動態驗證 (`runInterlockValidation`) 及裝箱映射下拉選單 (`dp042` / `dp041`)，將其立即硬塞入標準的 `createRecordWorkbenchSheet` 會帶來過高破壞風險。採取維持現狀並透過 Payload 相容，是目前最安全的解法。

## 5. deep_save_config 設計
```python
deep_save_config = {
    "master_serializer": Dp040Serializer,
    "master_lookup_field": "gkey",
    "details": {
        "dp041": {"model": Dp041, "serializer": Dp041Serializer, "parent_field": "dp040gkey", "lookup_field": "gkey", "delete_mode": "hard"},
        "dp042": {"model": Dp042, "serializer": Dp042Serializer, "parent_field": "dp040gkey", "lookup_field": "gkey", "delete_mode": "hard"},
        "dp043": {"model": Dp043, "serializer": Dp043Serializer, "parent_field": "dp040gkey", "lookup_field": "gkey", "delete_mode": "hard"}
    }
}
```
**配置重點**：順序嚴格保持 `dp041` -> `dp042` -> `dp043`，以保證 `dp043` 處理時前兩者的 `temp_` ID 已被成功置換並寫入 `gkey_map`。

## 6. Dp041 / Dp042 / Dp043 儲存策略
* **字串陣列相容**：在 `pre_deep_save_hook` 攔截前端送來的 `['gkey1', 'gkey2']` 刪除陣列，並標準化為 V2 需要的 `[{"gkey": "gkey1"}]`。
* **Dp043 FK 置換**：在 `_save_detail_group` 覆寫處，僅對 `dp043` 進行介入，將傳入的 `dp041gkey` 與 `dp042gkey` 的 `temp_` 值透過 `context["gkey_map"]` 轉換為真實 DB 鍵值。

## 7. SampleStatusService 接入方式
* **Hook**: `post_deep_save_hook`。
* **重算機制**：透過 `pre_deep_save_hook` (擷取即將被刪除的 `dp033gkey`) 與 `upsert` 清單，精準收集 `affected_dp033_keys`。
* 對這些 Keys 使用 `aggregate(Sum('sentpairs'))` 進行**絕對值重算** (`finishpairs = total_shipped`)，杜絕了累加運算可能造成的失控風險，隨後將其 Parent ID 送入 `SampleStatusService.recalculate_sample_status` 以更新整體生命週期狀態。

## 8. Validation / Approval / BillNo / DataConstraint 整合
V2 的本質即自動包含這些 Mixin 防護：
* `ValidationMixin` 提供基礎欄位非空保護。
* `ApprovalMixin` 確保一旦出貨單被審核 (approve) 就不被修改。
* `BillNoMixin` 由前端觸發 `get-bill-no`，避開 Race Condition。
* `DataConstraint` 實現操作權限隔離。
上述所有防護全數正常啟動且不受修改影響。

## 9. 前端回歸測試
* **建置**：`npm run build` 通過。
* **Smoke Test**：`npm run smoke:frontend` 包含 BA001, BA015, DP030, DP040 全部綠燈。

## 10. DP040 CRUD 測試
1. **新增 / 修改 Master**：順利存檔，`invoiceno` 產生與更新正常。
2. **新增 Dp041 / Dp042 / Dp043**：`temp_` key 轉換極度準確，裝箱配置 (Dp043) 沒有發生 FK 丟失或 Constraint Error。
3. **刪除行為**：`hard delete` 穩定執行，不受字串陣列 payload 影響。

## 11. DP030 / DP040 聯動測試
1. **修改與刪除 Dp041**：出貨數量異動後，`Dp033.finishpairs` 準確回算。
2. **聯動 DP030**：出貨後，關聯之 Dp030 與 Dp031 的 status 自動由 "進行中(1)" 切換為 "部份出貨(2)" 或 "完結(3)"。
3. **API 穩定性**：`outstanding_samples` 及 `import_candidates` 依舊穩定讀取 `Dp033` 資料。

## 12. legacy_deep_save 保留或移除評估
* **決定**：目前已標示 `@action(detail=False, url_path='legacy_deep_save')` 保留為 Deprecated Fallback。
* **後續建議**：待 DP040 上線一週並由現場出貨人員進行大量裝箱作業確認無誤後，即可完全移除此段冗餘代碼。

## 13. 尚未完成事項
* DP040 的 Frontend 仍屬於 Manual React Component，尚未導入 `createRecordWorkbenchSheet` Factory。

## 14. 下一階段建議
DP040 已成功跨越架構死線，脫離 High Risk Legacy。接下來建議繼續執行 **Phase 8B-2：DP010 / DP025 底層補齊**，把剩餘的核心開發源頭模組（楦頭、型體）全數拉升至 Standardized 狀態，徹底清償存檔邏輯的技術債。
