# Framework PoC：SA030 / SA020 Nested DeepSave Capability Verification

## 一、PoC 摘要

本次 PoC 針對 ERP 共用底層框架中的 `DeepSaveMixinV2` 進行了原始碼與架構深度的能力盤點。目標是驗證其是否具備支撐 SA030 (P/O 單) 與 SA020 (預告單) 所需的「Master → Detail → SubDetail」三層巢狀存檔、交易完整性 (Transaction Rollback)，以及 Side Effect Hook 擴充能力。
**結論**：`DeepSaveMixinV2` 的架構設計極為成熟，透過 `custom_children` 配置與 `post_detail_save_hook` 的搭配，**完全可以**在不修改 Mixin 本身的情況下，完美支援 SA030 所需的所有深層存檔需求。

## 二、DeepSaveMixinV2 現有能力驗證

根據原始碼 `api/common/mixins/deep_save_v2.py` 的分析，目前框架已原生具備以下能力：
* **Master Serializer 支援**：支援動態帶入 `master_serializer` 進行主檔更新或建立。
* **Detail Serializer 支援**：支援多組 Detail，並自動注入 Master 的 Foreign Key。
* **Upsert 支援**：比對 payload 中的 `gkey`，自動判斷執行 Update 或 Create。
* **Explicit Delete 支援**：提供 `delete` 陣列，支援實體刪除 (Hard Delete) 或邏輯刪除 (Soft Delete)。
* **Hook 支援**：提供 `pre_deep_save_hook`, `post_master_save_hook`, `post_detail_save_hook`, `post_deep_save_hook` 完整的生命週期。
* **Transaction 支援**：整個 `deep_save` 被包覆在 `transaction.atomic()` 之中。
* **Response 包裝**：存檔成功後，會透過 Master Serializer 重新 Retrieve 最新資料，並將其放在 `data` 節點回傳。
* **Temp ID Mapping**：支援前端產生的 `_tempId` 映射回資料庫產生的實體 `gkey`，並放在 `sync_map` 節點中。

## 三、Nested Children 驗證結果

對於 Master → Detail → SubDetail 的處理：

1. **`custom_children` 攔截機制 (驗證通過)**：
   在 `_save_detail_group` 原始碼中 (Line 246-247)：
   ```python
   custom_children = detail_config.get('custom_children', [])
   ser_data = {k: v for k, v in row.items() if k not in custom_children}
   ```
   這段程式碼會在將資料交給 DRF Serializer 驗證前，主動剔除 `custom_children` 中宣告的 Sub-Detail 欄位，成功避免了 `ValidationError("Unknown field")`。

2. **Hook 取得原始 Payload (驗證通過)**：
   在呼叫 `post_detail_save_hook` 時，框架傳入了 `detail_result=upsert_results` (Line 160)。
   `upsert_results` 的內容包含 `{"instance": instance, "raw_row": row}` (Line 270)。因此在 Hook 中可以輕易取得被剔除的 Sub-Detail 原始資料 (`raw_row['custom_children']`)。

3. **Hook 取得 Detail PK 並儲存 Sub-Detail (驗證通過)**：
   由於 `instance` 已儲存完畢，在 Hook 中可以讀取 `instance.pk`，將其設定為 Sub-Detail Payload 的 Parent FK，並手動實例化 Sub-Detail Serializer 進行 `.save()`。

## 四、Transaction Rollback 驗證

因為整個 `deep_save` 入口都包覆在 `with transaction.atomic():` 之下 (Line 110)：

* **情境 A (全數正常)**：Sub-Detail 儲存成功，整個交易 Commit。
* **情境 B (Sub-Detail 驗證失敗)**：在 Hook 中呼叫 Sub-Detail Serializer 發生 `ValidationError` 時，Exception 會向外拋出至 Line 167 捕獲，並觸發 Django 的 Atomic Rollback。**Master 與 Detail 的變更將全數撤銷**。
* **刪除順序**：框架在存檔前，會先執行 Detail 的 Delete，再執行 Detail 的 Upsert。若 Detail 關聯的 Sub-Detail 設有 DB 層級的 `ON DELETE CASCADE`，則不需要在 Hook 中手動刪除 Sub-Detail。若無，則需在 `pre_deep_save_hook` 中先一步進行刪除。

## 五、temp_id / gkey mapping 驗證

框架在 `_save_detail_group` 中：
```python
temp_id = row.get('_tempId')
if temp_id:
    context["gkey_map"][temp_id] = new_pk_val
```
並且在最終的 Response 組合中，將建立、更新、刪除的 `_tempId` 與對應操作放入 `sync_map` 回傳。
此機制對於前端 Zustand 等集中式 State Manager 而言，可藉此替換掉所有暫存的 ID，避免重複新增。

## 六、SA030 / SA020 適配性評估

| 能力 | 現有已支援 | 可透過 Hook 支援 | 需要改 DeepSaveMixinV2 | 不建議放在 Mixin |
| --- | :---: | :---: | :---: | :---: |
| `sa030` (Master) | ✅ | | | |
| `sa031` (Detail) | ✅ | | | |
| `sa034`, `sa035` (Detail) | ✅ | | | |
| `sa032`, `sa033` (SubDetail) | | ✅ (客製化 Detail Hook) | | |
| Master Extensions (Tabs) | ✅ (同 Master) | | | |
| 後端金額/雙數重算 (Recalc) | | ✅ (Post DeepSave Hook) | | |
| DP Adopted 狀態同步 | | ✅ (Post DeepSave Hook) | | |
| QC030 檢驗資料同步 | | ✅ (Post DetailSave Hook) | | |

## 七、是否需要修改 DeepSaveMixinV2

**不需要修改。**
目前的 `DeepSaveMixinV2` 已經將預留的彈性 (Extensibility) 做到非常到位，尤其是 `custom_children` 的設計與 `raw_row` 的保留，正好能夠解決 DRF Nested Serializer 處理多層寫入的痛點。

## 八、實作 Patch Plan 建議

由於不需改動 Mixin，未來的實作計畫為：
1. **建立 SA030 ViewSet**：引入 `DeepSaveMixinV2`。
2. **建立 SaOrderDeepSaveService**：撰寫 `post_detail_save_hook`。
   ```python
   def post_detail_save_hook(self, master_instance, detail_key, ...):
       if detail_key == 'sa031':
           for result in detail_result:
               sa031_instance = result['instance']
               sub_details = result['raw_row'].get('custom_children', {})
               
               # 處理 sa032
               sa032_payload = sub_details.get('sa032', {})
               self._process_sa032_upsert(sa031_instance, sa032_payload)
               
               # 處理 sa033
               sa033_payload = sub_details.get('sa033', {})
               self._process_sa033_upsert(sa031_instance, sa033_payload)
   ```

## 九、是否建議進入 SA030 Models 實作

**強烈建議可以進入 SA030 Models 的實作。**
底層框架 (`DeepSaveMixinV2`) 的能力驗證已完全通過，沒有發現任何阻塞點 (Blocker)。框架具備了處理 SA030 這種複雜、龐大、多層次資料的所有必要特性。

## 十、風險與待確認事項

1. **Sub-Detail (SA033) 也是巢狀？** 
   根據目前設計，`sa033` 可能是掛在 `sa032` 之下。如果 Payload 將 `sa033` 放在 `sa032` 的 `custom_children` 中，則上述 Hook 需要再進行一層遞迴呼叫 (Recursion)。這在 Python 中實作不難，但需注意程式碼可讀性。
2. **巨量資料的效能問題**：
   因為 DRF Serializer 在 `.is_valid()` 時會進行大量的 DB 查詢 (例如 FK 存在驗證)。若一張訂單有 50 個型體、每個型體 20 個尺碼 (共 1000 筆 sa032)，可能導致單次存檔耗時超過 5 秒。建議在實作 SA032/SA033 Serializer 時，移除不必要的跨表驗證 (`validators=[]`) 以提升效能。
