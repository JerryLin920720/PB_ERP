# Phase 6B 實作完成報告：DeepSaveMixinV2 架構重構與效能優化試點

本文件記錄了 Phase 6B 的實作結果，將原本分散在各 ViewSet 內的手刻 `deep_save` 收斂為高度共用、Config-driven 且完全相容 Phase 1~6A 基礎設施的 `DeepSaveMixinV2`。

## 1. 實作摘要

本階段建立了 `DeepSaveMixinV2`，它支援透過宣告式設定 `deep_save_config` 自動完成 Master 與多個 Detail 的 CRUD 動作（對應 PB 中的 `idw_root.Update()` + 各明細 `idw[i].Update()`）。
同時，完美整合了：
1. **ValidationMixin**：儲存前進行全資料整體驗證 (`check_deep_save_validation`)。
2. **Approval Lock**：已審核單據直接在後端硬阻擋。
3. **DataConstraint**：修改時會透過 `filter_queryset` 檢查權限隔離，越權操作將被阻擋。
4. **Transaction Atomic**：所有資料庫變更皆在單一 transaction 內進行，任一步驟出錯（如驗證失敗、存檔異常）皆會觸發完整 rollback。

## 2. 目前手刻 deep_save 盤點

檢查後端各模組，發現以下 ViewSet 內目前仍存在高複雜度的手刻 `deep_save` (多數集中於 DP 模組)：
- `Dp010ViewSet`：處理主檔、材料明細與尺寸展開
- `Dp020ViewSet`：處理主檔與報價結構
- `Dp030ViewSet`：處理樣品單主檔、材料、Logo、追蹤紀錄、尺寸等巨型三層結構。
- `Dp040ViewSet`：處理正式訂單與多層展開。

這些 ViewSet 未來可以陸續切換至 `DeepSaveMixinV2` 以達到程式碼的極致精簡與統一防護。

## 3. 修改了哪些檔案

- `backend/api/modules/ba/views.py`：將試點作業 `Ba015ViewSet` 接入 `DeepSaveMixinV2` 與 `ValidationMixin`，並定義對應的 `deep_save_config`。

## 4. 新增了哪些檔案

- `backend/api/common/mixins/deep_save_v2.py`：全新的深度儲存核心引擎。
- `docs/analysis/framework_phase6b_deepsave_mixin_v2_result.md`：本結果報告。

## 5. DeepSaveMixinV2 設計

`DeepSaveMixinV2` 的架構設計如下：
1. **Request 攔截**：取得 `master` 與 `details` payload。
2. **防呆檢查**：檢查 `is_approved` 屬性。若已審核，拋出 403。
3. **範圍檢查**：對 `master` 進行 `DataConstraint` 查詢防呆，避免越權寫入。
4. **Validation 呼叫**：調用 `self.check_deep_save_validation(request)` 執行業務邏輯檢查。
5. **Transaction 開啟**：`with transaction.atomic():`
6. **Master 儲存**：依據 `_tempId` 判斷是新增還是修改。
7. **Details 儲存**：遍歷 config 內宣告的 detail tables，執行對應的 `upsert` 與 `delete`，並將 FK (`parent_field`) 自動綁定為 Master 的 `gkey`。
8. **回傳整合**：回傳最新的 Master 資料，並夾帶 `sync_map` 以利前端回填 `temp_id -> gkey`。

## 6. deep_save_config 欄位說明

目前支援的宣告格式（以 BA015 為例）：
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
            "delete_mode": "hard" # 支援 'hard' 實體刪除 或 'soft' 邏輯刪除
        }
    }
}
```

## 7. Payload 格式

與現有前端 `useRecordWorkbenchCrud` 完全相容，不需修改前端任何一行程式：
```json
{
  "master": {
    "gkey": "existing-key",
    ...
  },
  "details": {
    "ba016": {
      "upsert": [
        {"gkey": "d1", "tel": "123"},
        {"_tempId": "tmp1", "tel": "456"}
      ],
      "delete": [
        {"gkey": "d2"}
      ]
    }
  }
}
```

## 8. Hook 設計

為了取代 PB 中的 `ue_presave` 與 `ue_updatend`，引擎預留了下列 Hooks 供各 ViewSet 覆寫：
- `pre_deep_save_hook`：存檔前的最後一哩檢查。
- `post_master_save_hook`：主檔存檔後、明細存檔前（可用於產生關聯單號）。
- `post_detail_save_hook`：特定明細存檔後（可用於加總計算回主檔）。
- `post_deep_save_hook`：整體 transaction commit 前（可用於呼叫外部服務或狀態機切換）。

## 9. 與各基礎設施的整合方式

- **ValidationMixin**：事前整體驗證，與 Phase 5C 完美打通。
- **Approval Lock**：儲存前檢查既有實體 `is_approved` 欄位。
- **BillNoMixin**：前端點擊新增時已取號 (Phase 5A)，若未來有 Save-time 取號需求可實作於 `pre_deep_save_hook`。
- **DataConstraint**：修改動作時透過 `filter_queryset` 強制卡關，越權無法覆蓋。

## 10. 試點作業

本階段選擇 **BA015 (工廠資料管理)** 作為 Pattern B 的試點，原因如下：
- **結構單純**：單一 Master (Ba015) 加上 單一 Detail (Ba016 工廠聯絡人)。
- **低風險**：尚未承載如同 DP030 那麼龐大複雜的業務計算。
- **測試驗證完整**：可乾淨驗證 Master-Detail 的 Upsert / Delete 是否能正確被 `DeepSaveMixinV2` 執行。

## 11. 前後端測試結果

- [x] Master / Detail create update delete 正常。
- [x] Transaction rollback 正常 (若 `pre_deep_save_hook` 拋出錯誤，整包回滾)。
- [x] Validation 仍正常 (若 `check_deep_save_validation` 失敗，回傳 400)。
- [x] Approval Lock 仍正常 (鎖單後呼叫 deep_save 會被 Server 硬核拒絕，回傳 403)。
- [x] 前端 Dirty Tracking 儲存後能正確清除。
- [x] 前端 F2 / Cascading Lookup / ItemChanged 全數維持正常，彼此不衝突。
- [x] ReportModal 不受任何影響。

## 12. 效能考量

本版引擎中：
- 刪除操作採用 `queryset.delete()` 進行批次實體刪除 (或 `update(deleted='Y')` 邏輯刪除)，而非迴圈逐筆刪除。
- 修改/新增 為了確保個別 Validation 與 Audit 寫入正確，目前為迴圈逐筆處理 (`serializer.save()`)。這在一般明細數量 (500 筆以內) 時效能無虞。未來若有上萬筆明細的需求，可考慮針對特定明細啟動 `bulk_create` / `bulk_update` 模式。

## 13. 下一階段建議

目前 Phase 1 ~ Phase 6 全數基礎工程已經 100% 完備。這套系統現在已經擁有：
- **動態表單與狀態機** (Phase 1, 2)
- **Dirty Tracking 與開窗對接** (Phase 3A, 3B, 3C)
- **審核權限鎖與取號** (Phase 4, 5A)
- **資料列級權限隔離** (Phase 5B)
- **客製化防呆與欄位連動** (Phase 5C, 5D)
- **報表匯出模組** (Phase 6A)
- **重構版原子化儲存引擎** (Phase 6B)

接下來可以開始 **進入正式業務作業 (如 DP030) 的大規模翻新與除錯**，或是依照需求開展新系統的 **Dashboard (首頁戰情看板)**。
