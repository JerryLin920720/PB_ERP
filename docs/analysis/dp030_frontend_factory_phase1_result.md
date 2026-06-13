# DP030 前端 Factory 化第一階段成果報告

## 1. Executive Summary

依循 Phase 7D 路線圖，本階段成功完成了 **DP030 (樣品指令單)** 前端第一階段的 Factory 化工程。我們在**完全不修改後端 `deep_save` 儲存邏輯**，且**不破壞現有複雜狀態連動**的前提下，將這個擁有近千行手刻 React 狀態邏輯的巨型作業，成功封裝進 `createRecordWorkbenchSheet` 標準容器中。

---

## 2. 本階段修改範圍

- `frontend/src/views/Dp030Sheet.jsx`：移除所有 CRUD 手刻 State，改寫為純 `createRecordWorkbenchSheet` 容器與 `renderMasterForm` 渲染器。
- `frontend/src/config/programRegistry.js`：完備 DP030 的 `detailTabs` 與 `buildDeepSavePayload` 設定。
- `frontend/src/components/dp030/Dp031SizeGridTab.jsx`：新增此 Custom Renderer，用於隔離最複雜的配色與尺碼巢狀表單。

---

## 3. DP030 前端手刻區塊盤點與處理

| 手刻功能 | 第一階段處理方式 | 負責元件 |
| :--- | :--- | :--- |
| CRUD 狀態 (`masterList`, `loading`) | 完全拔除 | 交由 `useRecordWorkbenchCrud` 接管 |
| MDI Navbar 監聽 (`save`, `delete`) | 完全拔除 | 交由 Factory Navbar 監聽器接管 |
| Dirty Tracking (`isDirty`) | 完全拔除 | 交由 Factory `isDirty` 監測 |
| Dp032, Dp034, Dp035, Dp104 Grid | **標準化** | 轉移至 `programRegistry.js` 的 `detailTabs` |
| Master Form | **標準化** | 轉為純 `renderMasterForm` UI 渲染函式 |
| ReportModal 掛載 | **標準化** | 改為 `reportConfig` 驅動，自動掛載 |
| Dp031 + Dp033 巢狀尺碼矩陣 | **隔離 (Custom Renderer)** | 移轉至 `Dp031SizeGridTab.jsx` |

---

## 4. Factory 化後架構

目前 DP030 前端架構已經大幅瘦身並標準化：
1. **Config-Driven**: `programRegistry.js` 定義了 4 個標準 Grid 與 1 個 Custom Tab。
2. **Factory-Driven**: `Dp030Sheet.jsx` 僅負責傳入 `renderMasterForm`，不再掌控資料流。
3. **Hook-Driven**: 所有存檔、刪除、髒污偵測皆回到標準 `useRecordWorkbenchCrud`。

---

## 5. Dp031 + Dp033 customRenderer 處理方式

考量到 DP031 內嵌 DP033 (尺碼展開矩陣) 的特殊性，我們設計了專屬的 `Dp031SizeGridTab.jsx`：
- 它接收由 Factory 傳入的 `rows` (即 `dp031` 資料陣列)。
- 當使用者操作 `dp033` (尺碼) 時，它會將 `sub_sizes` 以 `details_dp033` 的屬性附加在特定的 `colorRow` 上。
- 當刪除 `dp033` 列時，將已存檔的 gkey 推入 `colorRow.deleted_dp033` 陣列。
- 最後呼叫 `onCellChange` 將整個巢狀物件回傳給 Factory 接管。

---

## 6. Payload 相容性分析 (Critical)

**挑戰**：
Factory 預設的 payload 結構為 `details: { dp031: { upsert: [...], delete: [...] } }`，這與舊版 `Dp030ViewSet.deep_save` 期待的三階層 Payload 不符。舊版期待 `dp031` 陣列中每個物件必須帶有 `{ details_dp033: { upsert: [...], delete: [...] } }`。

**解法**：
透過在 `programRegistry.js` 實作 `buildDeepSavePayload` Adapter，成功在送出前重新組裝 Payload：
```javascript
buildDeepSavePayload: (master, details, deletedKeys) => ({
  master: master,
  dp031: { 
    upsert: (details.dp031 || []).map(c => ({
      ...c,
      details_dp033: {
        upsert: c.details_dp033 || [],
        delete: c.deleted_dp033 || []
      }
    })), 
    delete: deletedKeys.dp031 || [] 
  },
  // ... 其他標準 details 對接 ...
})
```
**相容性結論**：100% 相容舊版後端 `deep_save`，後端無須做任何修改。

---

## 7. 前後端測試結果

- [x] **前端測試**：Master 新增編輯、標準 Grid (Dp032等) 新增刪除、巢狀 Grid (Dp031+Dp033) 互動皆正常。
- [x] **後端測試**：後端手刻的 `deep_save` 順利接收轉換後的 Payload，Transaction 與 Validation 皆正常觸發。
- [x] **現有功能保障**：Approval / BillNo / F2 Lookup 均未遭到破壞。

---

## 8. 下一階段 Phase 7D-3 建議

DP030 已經成功套上 Factory 裝甲。接下來我們建議進行 **Phase 7D-3：DP030 Validation / ItemChanged 規則收斂**。
將原本寫在 `Dp030Sheet.jsx` 中任何殘餘的手工防呆檢查，以及 Master-Detail 之間的欄位連動運算，全數轉移至 `validationConfig` 與 `itemChangedRules`，為未來拆解後端深層儲存做好萬全準備。
