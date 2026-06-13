# DP030 DeepSaveMixinV2 試點替換成果報告

## 1. Executive Summary

本階段 (Phase 7D-5) 我們成功將 `Dp030ViewSet` 中超過 200 行的手寫巨型 `deep_save` 函數拆解並替換為框架標準的 `DeepSaveMixinV2`。
我們在不破壞任何既有前端 UI (Factory 產出的 Flat Payload) 的前提下，透過擴充 `DeepSaveMixinV2` 的鉤子 (Hook) 機制，完美處理了 `Dp031 -> Dp033` 三層巢狀結構的深層儲存。
所有儲存流程皆已被 `transaction.atomic()` 安全保護，且完整對接了 Validation、Approve Lock、BillNo 取號與 DataConstraint 權限驗證。

---

## 2. 本階段修改範圍

- `backend/api/common/mixins/deep_save_v2.py`：
  - 加入了 **Flat Legacy Payload Adapter**，使 V2 原生支援 `details_data` 在外層的舊式傳遞法。
  - 修改 `_save_detail_group` 的回傳值，使其產生包含 `instance` 與 `raw_row` 的精準映射表。
  - 修改 `post_detail_save_hook` 的參數列，使實作者能夠存取到最初的 `raw_row` payload 以執行巢狀解析。
  - 在傳給 DRF Serializer 之前，會過濾掉 `config['custom_children']` 定義的子層級陣列，避免 "Unknown Field" 的驗證錯誤。
- `backend/api/modules/dp/views.py`：
  - 既有 `deep_save` 已被備份為 `legacy_deep_save`。
  - 引入 `DeepSaveMixinV2` 到 `Dp030ViewSet`。
  - 建立 `deep_save_config` 並定義了 dp031, dp032, dp034, dp035, dp104。
  - 在 `post_detail_save_hook` 攔截 `dp031` 的儲存，並觸發 `_save_dp033_children` 進行精準 CRUD。
  - 於 `post_deep_save_hook` 觸發 `SampleStatusService.recalculate_sample_status`。

---

## 3. legacy_deep_save Fallback 設計

為了保證極致的安全性，舊的 `deep_save` 函數被重新命名為 `legacy_deep_save`，並指派到了 `@action(url_path='legacy_deep_save')`，而標準路由 `/api/dp/dp030/deep_save/` 則由 `DeepSaveMixinV2` 接管。若未來在 UAT 階段發現無法預期的嚴重 Bug，只要將前端 Endpoint 暫時改回 `legacy_deep_save` 即可瞬間復原。

---

## 4. Dp033 子明細儲存與 Hard Delete

針對 `Dp031 -> Dp033` 三階的 CRUD 操作：
1. **關聯性建立**：我們透過 `detail_result` 陣列精準取得了由 `DeepSaveMixinV2` 建立好的 `dp031_inst`，然後將其 ID 給予新增的 Dp033。
2. **Hard Delete 說明**：對於舊版 `Dp030ViewSet` 的行為進行盤點後，確認原本的 `process_child` 或是 `Dp033.objects.filter(gkey__in=deleted_dp033).delete()` 都是採用實體刪除 (Hard Delete)。因此本階段我們亦在 Hook 中維持 `delete()` 的行徑，確保與舊系統一致。
3. **Transaction 綑綁**：因為 `post_detail_save_hook` 處於 Mixin 內的 `with transaction.atomic():` 區塊，一旦 Dp033 儲存失敗 (例如長度驗證失敗、型別錯誤)，皆會向上拋出 `Exception` 並使整個主表與配色表 Rollback。

---

## 5. 後端測試結果

- [x] **Master Create / Update**: Flat payload adapter 運作正常，V2 成功截取 `master` 節點。
- [x] **Dp031 Create / Update / Delete**: 依照 `deep_save_config`，完美處理增刪改，未知欄位 (`details_dp033`) 也被順利剔除，不會干擾 `Dp031Serializer`。
- [x] **Dp033 Nested CRUD**: 透過 `detail_result` 的 mapping 機制，每一筆 `upsert` 或 `delete` 皆準確鎖定目標，不存在陣列順序錯亂問題。
- [x] **SampleStatusService 觸發**: 測試印出 Logs，確認 `post_deep_save_hook` 成功啟動並呼叫。
- [x] **Approval / DataConstraint**: 已審核資料存檔時，被 ValidationMixin 擋下並回傳 HTTP 403。

---

## 6. 前端回歸測試結果

前端 **完全零修改**。
目前 Phase 7D-2 產出的 `buildDeepSavePayload` 仍舊穩定運作，包含 `dp031` 內的 `details_dp033` 節點都能直接送給後端，並由後端 V2 引擎全數吸納轉換。

---

## 7. 下一階段 Phase 7D-6 建議

隨著最複雜的 `Dp030ViewSet.deep_save` 被徹底拆解、接管並測試成功，**DP030 樣品系統的終極重構已實質完成。**
我們建議進入 **Phase 7D-6：DP030 最終回歸測試與封版**。
進行全系統的 Regression Test (包含從 DP030 拋轉 DP040，然後再修改 DP030 的極端情境)，並清理掉暫時封存的 `legacy_deep_save`，以及把所有程式碼提交至主幹，完成長達兩週的樣品系統翻新長征。
