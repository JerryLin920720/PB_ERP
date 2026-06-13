# DP030 SampleStatusService 狀態與 Outstanding 服務抽取成果報告

## 1. Executive Summary

本階段 (Phase 7D-4) 的核心任務是處理 DP030 樣品系統中最棘手且易產生重複計算的「業務核心邏輯」——樣品狀態的進階回算與未交雙數 (Outstanding) 計算。
我們成功將四散於 `Dp030ViewSet`, `Dp040ViewSet`, `outstanding_samples`, `import_candidates` 與 `receive_samples` 內的重複邏輯抽出，整合進獨立的 `SampleStatusService` 中，為接下來全面替換為 `DeepSaveMixinV2` 與 Hooks 機制排除了最大的障礙。

---

## 2. 本階段修改範圍

- `backend/api/services/sample_status_service.py`：新增並補齊 `calculate_dp033_outstanding` 公式。
- `backend/api/modules/dp/views.py`：
  - 重構 `Dp040ViewSet.deep_save`，移除舊有行數冗長的手動 `status` 判斷，改呼叫 service。
  - 增強 `Dp030ViewSet.deep_save`，在完成明細異動後主動觸發 service 以校正主檔狀態。
  - 重構 `outstanding_samples` 與 `import_candidates` 兩個 API 的重複加減法計算，改用統一的 service method。

---

## 3. PB 舊系統狀態與 Outstanding 邏輯整理

根據 PB `w_dp030` 與 `w_dp040` 的行為分析：
- **DP033 (尺碼) 層級**：並沒有自己的 `status`，但具備四種關鍵數量欄位：
  - `custpairs` (客戶打樣雙數)
  - `keeppairs` (工廠留樣雙數)
  - `sentpairs` (實際寄出/出貨雙數)
  - `receive` (實際點收入庫雙數)
- **DP031 (配色) 層級**：具備 `status` 欄位 (0:取消, 1:進行中, 2:部分寄出/部分完成, 3:已完成)。由其底下的 Dp033 總計數量決定。
- **DP030 (主檔) 層級**：具備 `status` 欄位。由其底下的 Dp031 狀態決定 (若所有 Dp031 皆為 3，則主檔為 3；若有任何 Dp031 為 2 或 3，主檔為 2；否則為 1)。

---

## 4. SampleStatusService 設計

我們設計的 `SampleStatusService` (位於 `backend/api/services/sample_status_service.py`) 完全不依賴 Django Request 也不依賴 DRF ViewSet，為純淨的 Domain Service。

### 核心方法：
1. **`get_sample_status_mode()`**
   - 讀取系統參數，決定全域樣品結案判定模式 (1/2/3)。
2. **`calculate_dp033_outstanding(dp033_instance, samplestatus_mode=None)`**
   - 封裝了出貨所需 Outstanding 計算公式。
   - 保證回傳值為 `Decimal` 且不小於 `0`。
3. **`recalculate_sample_status(dp030_keys=None, dp031_keys=None, dp033_keys=None)`**
   - 萬用級別的「狀態級聯校正器」。
   - 輸入任何層級的 key，自動向上聯動更新至 Master (`Dp033 -> Dp031 -> Dp030`)，並自帶 `select_for_update()` 的交易安全防護。

---

## 5. Outstanding 計算公式

依照 PB 參數設定，Outstanding 具有四種變形，已統一封裝入 `calculate_dp033_outstanding`：
```python
if samplestatus_mode in ['1', '2']:
    if samplestatus_mode == '2':
        outstanding = custpairs - sentpairs
    else:
        outstanding = (custpairs + keeppairs) - sentpairs
elif samplestatus_mode == '3':
    outstanding = (custpairs + keeppairs - receive) - sentpairs
else:
    outstanding = custpairs - sentpairs
```

---

## 6. 接入 DeepSave 的位置

### DP040ViewSet.deep_save (樣品出貨)
過去 DP040 在儲存 `Dp041` (出貨明細) 後，會手刻一段很長的迴圈去加總 `finishpairs`，並手動推斷 Dp031 / Dp030 狀態。
現在改為直接呼叫：
```python
if parent_dp031_keys:
    from api.services.sample_status_service import recalculate_sample_status
    recalculate_sample_status(dp031_keys=list(parent_dp031_keys))
```

### Dp030ViewSet.deep_save (樣品單)
過去 DP030 新增明細時，若沒有手動去改狀態，系統可能狀態脫鉤。現在於 API 執行結束前 (`process_child` 之後) 補上安全網：
```python
from api.services.sample_status_service import recalculate_sample_status
recalculate_sample_status(dp030_keys=[master_instance.pk])
```

---

## 7. 測試結果

- [x] **後端測試**：DP040 儲存出貨單後，能自動透過 Service 更新 DP030 狀態，原有的 Rollback 防護也因為 `transaction.atomic()` 依然有效。
- [x] **API 收斂**：`import_candidates` 與 `outstanding_samples` 已成功套用 `calculate_dp033_outstanding`，移除了 40 多行的重複數學運算。
- [x] **前端回歸測試**：後端邏輯抽出並未更改任何 payload 或 Response，DP030 Factory 前端完全不受影響，Dirty Tracking 與 Approval 運作如初。

---

## 8. 下一階段 Phase 7D-5 建議

業務核心邏輯已經被成功安全隔離至 Service Layer！
目前 DP030 後端的 `deep_save` 仍是一個 200 多行的巨石函數 (雖然已經淨化)，我們已完全具備條件進入 **Phase 7D-5：DP030 DeepSaveMixinV2 試點替換**。
目標：
1. 移除 `Dp030ViewSet` 內手刻的 `deep_save` 巨石函數。
2. 繼承 `DeepSaveMixinV2`。
3. 利用 `post_detail_save_hook` 串接 `SampleStatusService`。
4. 驗證 V2 的標準化處理是否能完美取代舊有邏輯！
