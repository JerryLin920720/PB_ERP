# Phase 8B-2C-1: DP010 Matrix Legacy 行為拆解與 DeepSaveMixinV2 Adapter 設計

## 1. Executive Summary
本階段對 DP010 (楦頭基本資料) 的 Custom Matrix UI 及後端 Replace-all 儲存機制進行了深度拆解。分析發現，DP010 前端並非傳統表單，而是以「部位」為 Row (Dp011)、「尺碼」為 Column、相交點為 Cell (Dp012) 的二維聯動矩陣。
由於此複雜結構，舊有 `legacy_deep_save` 採用了暴力的「全刪全建 (Replace-all)」邏輯來規避髒資料追蹤難題。若直接套用 `DeepSaveMixinV2` 的標準 upsert/delete 會導致資料錯置。
本計畫建議採用 **「方案 A (V2 外殼 + Hook 內封裝 Replace-all)」**，在不改動前端 UI 與 Payload 的前提下，讓 DP010 享有 V2 的事務安全與防護機制，同時保留矩陣儲存的穩定性。

---

## 2. DP010 前端現況拆解
* **UI 架構**：純手刻 Component (`Dp010Sheet.jsx`)，具備 Master List (Tab切換) 與明細 Form。
* **Matrix UI**：
  * **行 (Row)**：對應 `measurements` (Dp011 楦頭量法部位)。
  * **儲存格 (Cell)**：對應 `values` (Dp012 尺碼明細量值)。
  * 動態連動：`sizeRun` (尺碼展開) 會依據 master 的 startsize / endsize 動態變化，修改 `steps` 會自動重算各尺碼的 `cvalue`。
* **Payload 結構**：**非 V2 標準格式**。
  前端直接送出 `{ master, measurements, values, histories, stocks }` 純陣列，未區分 `upsert` 與 `delete`。
* **其他特徵**：
  * **手刻 MDI Command**：手動監聽 `mdi-global-command` 觸發 `handleSave`。
  * **無標準 Dirty Tracking**：對 Matrix Cell 難以精準追蹤修改狀態。

---

## 3. DP010 後端 `legacy_deep_save` 拆解
位於 `Dp010ViewSet` 中的 `@action(url_path='legacy_deep_save')` (前端似乎呼叫了 `deep_save` 但實質由舊邏輯或路由轉發處理，此為潛在隱患)：
1. **Master**：標準 `serializer.save()` (Insert / Update)。
2. **Dp011 (Rows)**：`Dp011.objects.filter(dp010gkey=master_obj).delete()` 物理硬刪除全部舊資料，然後輪詢 `measurements` 全部重新 Create，並在記憶體建立 `dp011_map` (old_temp_gkey -> new_real_gkey)。
3. **Dp012 (Cells)**：`Dp012.objects.filter(dp010gkey=master_obj).delete()` 物理硬刪除全部舊資料，然後輪詢 `values` 全部重新 Create。重建時透過 `dp011_map` 將 FK (`dp011gkey`) 重新指向剛剛新建立的 Dp011。
4. **防護**：包覆在 `transaction.atomic()` 內，但**缺乏** `ValidationMixin` 等系統標準安全防護。

---

## 4. DP010 / DP011 / DP012 資料關係
* **Dp010 (Master)**：楦頭主檔。
* **Dp011 (Row)**：楦頭部位量法 (如：腳背高、腳掌寬)。外鍵指向 Dp010。
* **Dp012 (Cell)**：具體尺碼的量值 (如：Size 8 的腳背高是 15cm)。外鍵指向 Dp010 與 Dp011。
* **依賴順序**：Dp012 必須依附 Dp011。因此 Delete 時若無 Cascade，需先刪 Dp012 再刪 Dp011；Create 時需先建 Dp011 再建 Dp012。

---

## 5. DeepSaveMixinV2 可行性分析與方案比較

| 方案 | 說明 | 優點 | 缺點 / 風險 |
| :--- | :--- | :--- | :--- |
| **方案 A：V2 外殼 + Replace-all Hook** | `Dp010ViewSet` 繼承 V2，但不將 Dp011/012 放入 config。而在 `post_master_save_hook` 中手工執行原本的全刪全建邏輯。 | 完全不需改前端；能享有 V2 Master 防護；穩定無 Side effect。 | 非正統 CRUD，gkey 每次存檔都會換新。 |
| **方案 B：Dp011 標準化 + Dp012 Custom Hook** | 將 Dp011 塞入 V2 Config，在 `pre_deep_save` 把陣列轉成 upsert/delete。Dp012 則透過 Hook 掛載。 | Dp011 成為標準 CRUD，不再換 gkey。 | Dp012 的 temp mapping 會極度困難，極易造成資料錯置。 |
| **方案 C：前端 Matrix 完全標準化** | 前端計算出精準的 `{upsert, delete}` 送給後端 V2 處理。 | 架構最標準，長期負債最低。 | 重寫整個 UI 矩陣邏輯風險極高，違背本階段「不重寫 UI」原則。 |

**💡 建議方案：方案 A (Adapter 模式)**
原因：楦頭量法資料量極小 (Cell 總數通常 < 300)，Replace-all 的效能損耗微乎其微。且系統中並沒有其他業務表會以外鍵 (FK) 綁定 Dp011/Dp012 的 `gkey` (外部單據只綁定 Dp010 Master)。因此 gkey 換新不會導致斷鏈。方案 A 是最低風險、最快標準化 Master 防護的解法。

---

## 6. Adapter / Hook 設計 (方案 A 實作指南)
1. **ViewSet 繼承**：`class Dp010ViewSet(DeepSaveMixinV2, ValidationMixin, ...)`。
2. **DeepSave Config**：
   ```python
   deep_save_config = {
       "master_serializer": Dp010Serializer,
       "master_lookup_field": "gkey",
       "details": {} # 故意留空，攔截 V2 的標準處理
   }
   ```
3. **Hook 覆寫** (`post_master_save_hook`)：
   * 將原 `legacy_deep_save` 中對 `Dp011`, `Dp012`, `Dp013`, `Dp014` 的全刪全建邏輯，原封不動搬入此 Hook 中。
   * 此 Hook 本身就在 V2 的 `transaction.atomic()` 內運行，因此具備絕對的原子性。
4. **前端微調**：
   * Payload 不變。但存檔 Endpoint 需確保精確打向 `/api/dp010/deep_save/`。
5. **Legacy 策略**：移除或註解原本的 `@action(url_path='legacy_deep_save')`，統一收攏入口。

---

## 7. Validation / DataConstraint / Report 需求判斷
* **ValidationMixin**：✅ **需要**。校驗 `lastno` 唯一性、必填欄位。
* **DataConstraintFilterBackend**：✅ **需要**。研發資產通常需進行機密隔離 (以 `ba005gkey` 或群組區分)。
* **ApprovalMixin**：❌ **不需要**。DP010 僅有 `adopted` (採用) 與 `cfmdate`，無標準簽核流程。
* **BillNoMixin**：❌ **不需要**。`lastno` 通常為研發手動編碼。
* **ReportMixin**：❌ **暫不需要**。

---

## 8. 風險清單
1. **外部 FK 斷鏈**：若未來有新模組試圖綁定 `Dp011.gkey`，Replace-all 會導致該模組資料失連。(目前無此情形)。
2. **前端 Payload 錯亂**：若 `Dp010Sheet.jsx` 的狀態管理出現競態，送出不完整的 measurements，將導致資料永久被 Delete 且未 Recreate。
3. **效能瓶頸**：若特定楦頭尺碼展開異常巨大 (例如 > 1000 cells)，Replace-all 會導致資料庫瞬間寫入壓力。

---

## 9. 下一階段建議
本計畫已確認 DP010 適合透過 **「方案 A：V2 外殼 + Replace-all Hook」** 進行無痛過渡。
建議啟動 **Phase 8B-2C-2：DP010 DeepSaveMixinV2 Adapter 實作**，依據本計畫完成後端 Hook 轉接，收編 DP010 進入標準化防護網。
