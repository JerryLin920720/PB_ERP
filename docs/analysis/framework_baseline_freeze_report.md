# Framework Baseline Freeze Report / 全框架基準線凍結與回歸驗收報告

## 1. Executive Summary

本報告標誌著「PB 轉型 React + Django ERP」基礎建設工程（Phase 1 至 Phase 6B）的正式凍結 (Baseline Freeze)。
經過一系列重構與擴充，系統已成功從舊有的 PB (PowerBuilder) 緊耦合架構，轉型為高度模組化、Config-driven（設定驅動）且職責分離的現代化微核心架構。

我們不僅完全重現了 PB 時代的核心機制（如 `idw_root.Update()`、`is_state` 狀態機、`ItemChanged` 連動、開窗 `ReturnFields`、`sys_constraint` 權限等），更在此之上引入了更為嚴謹的前後端雙重防呆、Atomic Transaction、Approve Lock 與擴展性極高的 `DeepSaveMixinV2` 引擎。

本框架基準線將作為後續所有「業務模組翻新」(如 DP、MR、SA 等大宗作業) 的最高準則與入閘標準。

---

## 2. Phase 1 ~ Phase 6B 完成摘要

1. **Phase 1-2：基礎架構與狀態機**
   - 建立 `programConfig` 與 `toolbarConfig`，統一管理作業路由與權限。
   - 實作 `SHEET_STATE` 狀態機，精確控制 Navbar 按鈕亮滅與表單可編輯狀態。
2. **Phase 3：資料聯動與 Dirty Tracking**
   - 導入 Dirty Tracking，阻擋未存檔跳離 (browser beforeunload)。
   - 完成 F2 Lookup 與 Cascading Lookup，支援 `returnFields` 回填機制。
3. **Phase 4：審核與保護鎖**
   - 建立 `ApprovalMixin` 處理標準審/反審核。
   - 實作 `Approve Lock`，針對已審核資料強制阻擋修改、刪除與深層存檔。
4. **Phase 5：業務防呆與驗證**
   - `BillNoMixin`：對接前端取號 API，自動產生與校驗單號。
   - `DataConstraintFilterBackend`：列級權限隔離，防堵越權查詢與寫入。
   - `ValidationMixin`：前後端一致的必填與客製業務防呆框架 (`wf_CheckData`)。
   - `ItemChanged`：統一攔截表單與網格異動，實現複製、清空、小計與明細回算主檔。
5. **Phase 6：報表與深層儲存引擎**
   - `ReportModal` + `ReportMixin`：支援單筆與清單的 PDF / Excel 基礎報表列印。
   - `DeepSaveMixinV2`：支援多明細、宣告式設定、Atomic Transaction 與防呆檢核的終極儲存引擎。

---

## 3. 前端框架能力總表

| Framework 能力 | 對應 PB 機制 | 核心檔案 | 狀態 | 已套用作業 | 尚未套用 | 風險等級 | 下一步建議 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **作業註冊與選單** | `sys_program` | `programRegistry.js`, `App.jsx` | 完成 | 全系統 | 無 | 低 | 鎖定，不再大幅改動 |
| **狀態機與 Toolbar**| `is_state`, `Toolbar` | `toolbarRegistry.js`, `Navbar.jsx` | 完成 | 全系統 | 無 | 低 | 鎖定 |
| **Dirty Tracking** | `ItemChanged`, `Close` | `useRecordWorkbenchCrud.js` | 完成 | BA015, DP030 | 新作業 | 低 | 套用於所有新翻新作業 |
| **F2 / Cascading Lookup** | `F2`, `ReturnFields` | `ERPLookupField.jsx` | 完成 | 全系統開窗 | 無 | 低 | 擴充更多查詢欄位支援 |
| **ItemChanged 連動**| `ItemChanged` | `useItemChanged.js` | 試點完成 | BA001, DP030 | 其他作業 | 中 | 依照各作業特性定義 Rules |
| **Pattern A Grid** | `Single DW` | `Win32DataWindow.jsx` | 試點完成 | BA001, MR030 | 其他單檔 | 低 | 大規模套用 |
| **Pattern B Master-Detail**| `Master-Detail DW` | `createRecordWorkbenchSheet.jsx`| 試點完成 | BA010, BA015 | DP 大型作業| 高 | 將 DP030 等轉移至標準工廠元件 |
| **ReportModal** | `Preview / Print` | `ReportModal.jsx` | 試點完成 | DP030, DP040 | 無設定檔作業| 低 | 擴展 PDF 樣板渲染器 |

---

## 4. 後端框架能力總表

| Framework 能力 | 對應 PB 機制 | 核心檔案 | 狀態 | 已套用作業 | 尚未套用 | 風險等級 | 下一步建議 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **ApprovalMixin** | `wf_check()` | `approval.py` | 完成 | DP030, DP040 | 其他審核作業| 低 | 鎖定 |
| **Approve Lock** | `PUT/PATCH 阻擋` | 內建於各 Mixin | 完成 | DP030, DP040 | 無 | 低 | 鎖定 |
| **BillNoMixin** | `sys_bill_setup` | `billno.py` | 試點完成 | DP030, DP040 | 其他取號作業| 中 | 注意跳號與連號併發問題 |
| **DataConstraint** | `sys_constraint` | `data_constraint.py` | 試點完成 | DP040 | 其他權限作業| 高 | 需要將 JSON 設定移回 DB 實作 |
| **ValidationMixin** | `wf_CheckData` | `validation.py` | 試點完成 | DP040, BA015 | 其他防呆作業| 中 | 於各 ViewSet 撰寫專屬驗證邏輯 |
| **ReportMixin** | `w_report_array` | `report.py` | 試點完成 | DP030, DP040 | 需報表作業 | 中 | 建立正式的 Excel / PDF 渲染器 |
| **DeepSaveMixinV2** | `idw_root.Update()`| `deep_save_v2.py` | 試點完成 | BA015 | DP030, DP040 | 極高 | 審慎並逐步替換高複雜度手刻程式 |

---

## 5. 試點作業回歸測試結果

| 測試群組 | 試點對象 | 測試目標 | 測試結果 | 備註 |
| :--- | :--- | :--- | :--- | :--- |
| **Pattern A** | BA001 / MR030 | 單檔增刪改、 bulk_save、網格欄位連動。 | **通過** | `Win32DataWindow` 運作良好。 |
| **Pattern B 簡單版** | BA015 | `DeepSaveMixinV2`、前後端連動、Dirty Tracking。 | **通過** | `deep_save_config` 成功取代舊版。 |
| **Pattern B 複雜版** | DP030 / DP040 | 單號產生、手刻 DeepSave 與各防呆機制的共存。 | **通過** | 手刻儲存與新版檢核不衝突。 |
| **Report / Query** | DP030 / DP040 | 根據 Config 叫出 Modal，正確回傳 PDF/Excel。 | **通過** | 越權查詢會被 DataConstraint 成功攔截。 |

---

## 6. 正式作業翻新準入 Checklist (The Baseline Standard)

未來每支正式作業翻新 (從 PB 轉 React) **必須且只能** 依照以下標準流程審核通過：

1. **基礎設定**
   - [ ] `programRegistry` 中是否已定義 `programConfig`、`permissionConfig` 與 `toolbarConfig`。
   - [ ] 確定其為 Pattern A (Grid) 還是 Pattern B (Master-Detail)。
2. **前端開窗與連動**
   - [ ] 表單中若有下拉/查詢，是否已採用 `ERPLookupField`，並設定 `returnFields`。
   - [ ] 是否有客製化欄位連動？若有，是否已寫入 `itemChangedRules` 供通用框架調用。
3. **後端取號與審核**
   - [ ] 若需自動取號，是否已在 Backend `BaseDictionaryViewSet` 中啟用，並於 Frontend 設定 `billNoConfig`。
   - [ ] 若有審核機制，是否已設定 `approve: true` 並繼承 `ApprovalMixin`。
4. **防呆與權限**
   - [ ] 是否有資料隔離需求？若有，必須設定 `dataConstraintConfig`。
   - [ ] 必填與業務防呆是否已寫入 `validationConfig` 並於 `ValidationMixin` 實作後端防禦。
5. **資料寫入**
   - [ ] Pattern B 必須配置 `deep_save_config` 並繼承 `DeepSaveMixinV2`。
   - [ ] 若有特殊過帳 (Posting) / 庫存扣減 / 成本運算，必須實作於 `DeepSaveMixinV2` 的 `post_deep_save_hook` 中。
6. **報表**
   - [ ] 若有列印需求，必須設定 `reportConfig`。

**嚴禁：** 開發人員私自手刻 `deep_save` 迴圈、私自綁定 `onClick` 來執行存檔、或在前端 Controller 層寫死校驗邏輯（所有防呆必須回歸 Config 與 Backend）。

---

## 7. 風險與未完成事項 (Known Issues & Limitations)

雖然框架核心已穩固，但仍有以下已知限制需要在後續階段補強：

1. **報表渲染器薄弱**：目前的 `ReportModal` 僅後端串接 `reportlab` Stub 與簡單 `openpyxl`，缺乏精美的樣板對齊能力。
2. **手動掛載殘留**：`Dp030Sheet` 與 `Dp040Sheet` 等早期試點作業由於尚未完全遷移至 `createRecordWorkbenchSheet`，其內部仍有手動掛載 `ReportModal` 與事件攔截的痕跡，需擇期重構。
3. **DeepSaveMixinV2 覆蓋率**：目前僅於 `BA015` 試點，尚未挑戰 `DP030` 等巨型手刻存檔，其效能極限與極端情境有待驗證。
4. **權限尚未資料庫化**：`sys_constraint` 目前仍為硬編碼於 `data_constraint.py`，未來需設計後台並連動關聯式資料庫。
5. **跳號疑慮**：`BillNoMixin` 為前端取號，若取得後未存檔，該單號即流失。未來若遇會計嚴格稽核，需改為 Save-time (後端鎖定) 取號。
6. **大型業務邏輯**：過帳 (Posting)、庫存盤點 (Inventory) 與成本運算 (Costing) 的 Service Layer 尚待建立。
7. **系統管理層面**：欄位級權限 (Field-level permission)、防重複登入 (Duplicate Login)、以及異動軌跡 (Audit log) 尚未實作。

---

## 8. 建議下一步路線圖

1. **短期**：依據此 Baseline Checklist，開始逐步將剩餘的中小型 BA / MR 作業模組翻新。
2. **中期**：針對高風險的 `DP030` (樣品單) 與 `DP040` (訂單) 進行一次深度重構，將其手刻的 `deep_save` 移轉至 `DeepSaveMixinV2`，並將前端切換至標準 `createRecordWorkbenchSheet` 容器。
3. **長期**：啟動 Dashboard 戰情看板開發、報表引擎樣板化，並補足 Audit Log 與進階權限控管機制。
