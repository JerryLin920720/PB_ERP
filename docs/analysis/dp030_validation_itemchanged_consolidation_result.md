# DP030 Validation / ItemChanged 規則收斂成果報告

## 1. Executive Summary

本階段 (Phase 7D-3) 順利完成了 DP030 的防呆檢查與欄位連動邏輯標準化。我們將原本四散在手刻元件中的檢查，一律收斂至 `programRegistry.validationConfig` 與 `itemChangedRules` 宣告式設定中；而對於最高風險、具備三層巢狀資料結構的 `Dp031 + Dp033` (配色與尺碼矩陣)，則採取了「保留於 Custom Renderer，但介面標準化」的策略，完美整合進 Factory 驗證生命週期。

---

## 2. 本階段修改範圍

- `frontend/src/config/programRegistry.js`：補齊 DP030 專屬的 `validationConfig` 宣告 (包含必填欄位、字串長度、Grid 最小行數)。
- `frontend/src/components/dp030/Dp031SizeGridTab.jsx`：實作並匯出 `validateDp031Rows` 專屬檢核函數。
- `frontend/src/views/Dp030Sheet.jsx`：實作 `validateAll` 勾點，串聯 Factory 生命週期與 Custom Renderer 的檢核邏輯。

---

## 3. DP030 殘留手工 Validation 盤點

原本在手刻 `Dp030Sheet.jsx` 中的 `handleSave` 階段，包含大量 `if (!sampleno) message.error(...)` 判斷。這些手工邏輯目前已被完全消滅，取而代之的是以下標準化宣告：

### 5. validationConfig 最終設定

我們在 `programRegistry.js` 中新增了以下宣告式防呆：
- **Master 必填 (Required)**：`sampleno` (樣品單號)、`issuedate` (開單日期)、`ba010gkey` (客戶)、`year` (年度)、`styleno` (型體編號)。
- **字串長度 (StringRules)**：`sampleno` (MaxLength 20)、`styleno` (MaxLength 40)。
- **Detail 筆數 (DetailRules)**：`dp031` 至少需要 1 筆 (由後端深層驗證向下支援)。

---

## 4. DP030 殘留手工 ItemChanged 盤點

DP030 屬於樣品與進度追蹤性質，並無複雜的單價計算或匯率乘算。其主要手工連動為「切換客戶後，必須清空依賴該客戶的型體」。

### 6. itemChangedRules 最終設定

我們保留並確立了標準的 `clear` 效果設定：
```javascript
itemChangedRules: [
  {
    scope: 'master',
    field: 'ba010gkey',
    effects: [
      { type: 'clear', targets: ['styleno', 'stylename'] }
    ]
  }
]
```
任何 Lookup Field (例如 `ba010gkey`) 在 F2 或下拉選單變更回傳後，會由 Hook 自動觸發此 Rule 清空子欄位。

---

## 7. Dp031 + Dp033 Custom Validation 處理方式

考量到 Dp031 與 Dp033 的父子巢狀結構無法單純使用宣告式定義，我們在 Custom Renderer 中設計了標準的對外介面 `validateDp031Rows`。

**驗證項目**：
1. Dp031 (配色) 的顏色名稱不得為空。
2. 每一筆配色至少必須要有 1 筆 Dp033 (尺碼) 資料。
3. 每一筆 Dp033 的四種數量 (`custpairs`, `keeppairs`, `sentpairs`, `finishpairs`) 皆不可為負數。

**Factory 整合**：
我們在 `Dp030Sheet.jsx` 的 Factory 組態中註冊了 `validateAll` 勾點：
```javascript
baseConfig.validateAll = (latestMaster, detailStates) => {
  const dp031Rows = detailStates?.dp031?.rows || [];
  const customErrors = validateDp031Rows(dp031Rows);
  if (customErrors.length > 0) {
    throw new Error(customErrors.map(e => e.message).join('\n'));
  }
};
```
當使用者按下存檔，Hook 會自動攔截拋出的 `Error` 並中斷流程，不送 API 亦不清空 Dirty 狀態。

---

## 8. Dp031 + Dp033 Local ItemChanged 處理方式

Dp033 在展開列內新增或修改尺碼時，直接透過 `onCellChange(row.gkey, 'details_dp033', newSizes)` 向 Factory 同步，取代了舊有的繁瑣 `setState`。這讓外層的 Dirty Tracking 能精準偵測到第三層的異動。

---

## 9. 不可收斂項目清單

為確保系統穩定，下列高風險邏輯在目前階段刻意「不收斂」至前端宣告框架中：
1. **Validation 保留**：Dp031 與 Dp033 的父子對應檢查、數值不能為負，因巢狀結構，暫時永久保留在 `Dp031SizeGridTab` 中。
2. **狀態回算 (不可前端處理)**：DP030 主檔的 `status` (進行中/已寄出/已完成) 高度依賴 `Dp040` (樣品出貨) 的未交數量 (Outstanding)。此邏輯嚴格禁止於前端運算。
3. **SampleStatusService**：後端 DP030 `deep_save` 內與 DP040 交互影響的部分，必須保留至後續 Service Layer 抽取時才於後端處理。

---

## 10. Payload 相容性確認

即使將 Validation 搬出、抽離了 Custom Renderer 檢核，當所有檢查通過後，`createRecordWorkbenchSheet` 原生的 Payload Builder，搭配 `programRegistry` 內的 Adapter，依舊 100% 產出與 PB 舊版期待相容的深層 Payload，**後端 deep_save 完全不須修改**。

---

## 11. 測試結果總結

- [x] **前端測試**：必填未輸入時、尺碼為負數時、配色未建立尺碼時，皆能正確擋下存檔動作並顯示錯誤訊息。
- [x] **行為測試**：驗證失敗不會發送 API，且維持 `isDirty` = true。
- [x] **連動測試**：更改 `ba010gkey` 成功觸發 `itemChanged` 清空款號；F2 與 Cascading Lookup 運作無誤。
- [x] **後端測試**：後端 `deep_save` 未修改，舊有邏輯如 Approval、BillNo 依然完美接軌。

---

## 12. 下一階段 Phase 7D-4 建議

DP030 的前端已經被徹底淨化與標準化。巨大的 React Component 已被拆解為純 UI 與標準 Config。
接下來的重頭戲是後端。建議啟動 **Phase 7D-4：DP030 CRUD 拆解與 API 標準化**。
目標是將後端高達 200 行的巨型 `deep_save`，按不同職責逐步拆解至 `SampleStatusService` 中，為後續接入 `DeepSaveMixinV2` 鋪平道路。
