# DP030 樣品指令單終極拆解與重構計畫

## 1. Executive Summary

本報告針對整個 ERP 系統中最核心、最龐大的作業——**DP030 (樣品指令單)** 進行了深度的解構與風險盤點。
透過對比 Phase 7B 確立的 `BA015 Golden Sample` 標準，我們發現 DP030 不僅具備傳統的 Master-Detail 結構，更存在著「三層式深層儲存 (Master-Detail-SubDetail)」、「跨表狀態連動」與「複雜的 BOM/尺碼矩陣」等極高風險特徵。
因此，我們決議不可使用暴力替換，而是提出一個分為 7 個子階段 (Phase 7D-1 ~ 7D-7) 的漸進式重構路線圖，以確保在不破壞任何現有營運邏輯的前提下，將 DP030 安全降落至新的共用基礎設施上。

---

## 2. 為什麼 DP030 不能直接重構

1. **三階層結構**：有別於 BA015 的兩層 (Ba015 -> Ba016)，DP030 擁有三層結構 (Dp030 -> Dp031 -> Dp033)，前端傳送的 Payload 中，`dp033` 是嵌套在 `dp031` 之內的。這超出了標準 `DeepSaveMixinV2` 的原生存檔範圍。
2. **多關聯明細**：除了 Dp031，還有 Dp032 (BOM)、Dp034 (Logo)、Dp035 (版本)、Dp104 (追蹤)，牽涉極廣。
3. **外部系統連動**：DP030 的狀態 (Status) 受到 DP040 (出貨單) 的操作影響，任何 `deleted` 邏輯都可能連帶破壞 `outstanding` (未交數量) 的計算。

---

## 3. DP030 PB 舊系統結構

- **Window**: `w_dp030`
- **Master**: `d_dp030_master`
- **Details**:
  - `d_dp031` (配色與主要規格)
  - `d_dp032` (部位與材料 BOM)
  - `d_dp033` (尺碼明細 Size Grid)
  - `d_dp034` (Logo 標示)
  - `d_dp035` (修改版本紀錄)
  - `d_dp104` (進度追蹤紀錄)

---

## 4. DP030 前端現況

- **組件狀態**：`Dp030Sheet.jsx` 為高度手刻的巨型組件 (上百行 state 宣告)。
- **Factory**：未使用 `createRecordWorkbenchSheet`。
- **儲存行為**：手刻 `handleSave` 與 `handleDelete`，手動蒐集 6 個 Detail 的 Upsert 與 Delete Array。
- **Dirty Tracking**：手動利用 `isDirty` state 阻擋。
- **Lookup & Report**：已使用 `ERPLookupField`，且已配置 `ReportModal`，但皆為手工掛載於 JSX 中。

---

## 5. DP030 後端現況

- **基礎設施**：已正確接入 `ValidationMixin`, `BillNoMixin`, `ApprovalMixin`, `ReportMixin`, `DataConstraintFilterBackend`。
- **儲存引擎**：含有高達 200 行的手刻 `deep_save`。
- **特殊邏輯**：
  - 手刻處理 `Dp031` 內嵌 `Dp033` 的三層儲存解析。
  - `outstanding_samples` API 透過龐大的 ORM Join 計算 DP031 與 DP033 對 DP040 的未交數量。

---

## 6. DP030 資料表與關聯盤點

| 表名 | 用途 | FK 對應 | 對應 Detail Key | 狀態連動 / 備註 |
| :--- | :--- | :--- | :--- | :--- |
| `Dp030` | 樣品單主檔 | - | `master` | 取號 (sampleno), 審核 (approve) |
| `Dp031` | 配色與明細 | `dp030gkey` | `dp031` | 狀態受 Dp040 出貨影響 |
| `Dp032` | 材料 BOM | `dp030gkey` | `dp032` | 單純 CRUD |
| `Dp033` | 尺碼 Grid | `dp031gkey` | (內嵌於 dp031) | 數量與出貨量比對計算 Outstanding |
| `Dp034` | Logo 配置 | `dp030gkey` | `dp034` | 單純 CRUD |
| `Dp035` | 版本紀錄 | `dp030gkey` | `dp035` | 單純 CRUD |
| `Dp104` | 追蹤紀錄 | `dp030gkey` | `dp104` | 單純 CRUD |

---

## 7. DP030 deep_save 現況拆解

**A. 可轉 DeepSaveMixinV2 的標準 CRUD**
- Master (Dp030) 的 Create / Update / Audit。
- Dp032, Dp034, Dp035, Dp104 的標準 Upsert / Delete。

**B. 必須用 Hook 處理的業務邏輯**
- **Dp031 與 Dp033 的三層寫入**：必須在 `DeepSaveMixinV2.post_detail_save_hook` 攔截 `dp031` 的資料，並手動遍歷其中的 `sub_sizes` 寫入 `Dp033`。

**C. 必須抽 Service Layer 的高風險邏輯**
- **狀態回算 (Status Recalculation)**：DP030 / DP031 的狀態 (`status` = 1, 2, 3) 依賴 DP033 與 DP040 的交貨數量判定，這不應該寫死在 `deep_save` 內，需抽離為 `SampleStatusService.recalculate_status(dp030gkey)`。

---

## 8. 前端 Factory 化可行性

**A. 可直接 Factory 化**
- `Dp032`, `Dp034`, `Dp035`, `Dp104` 等標準 Grid，完全可以直接設定於 `detailTabs` 中，由 Factory 接管 CRUD。

**B. 需 Custom Renderer**
- **Dp031 + Dp033 (尺碼矩陣)**：由於傳統 Grid 無法表達「點擊列後展開尺碼輸入框」或是「橫向動態尺碼欄位」，此區塊必須在 `detailTabs` 中設定 `customRenderer`，由專屬的 `SizeGridComponent` 接管。

**C. 結論**
前端**可以**逐步 Factory 化。第一步可先將 Master Form 與簡單明細抽離，留下 Dp031 作為 Custom Tab。

---

## 9. DP030 風險清單

1. **三層資料巢狀儲存 (Dp031 -> Dp033)**
   - *影響範圍*：深層存檔的資料解析與 Rollback。
   - *建議處理*：透過 `post_detail_save_hook` 專門處理。
2. **狀態回傳與 outstanding 計算**
   - *影響範圍*：跨作業 (DP040出貨) 會導致狀態錯亂。
   - *建議處理*：抽離 `SampleStatusService`。
3. **老資料的髒數據相容**
   - *影響範圍*：舊資料可能缺少必要的 FK (如 `ba010gkey` 遺失)。
   - *建議處理*：`ValidationMixin` 必須允許特定條件的豁免，或在 DB 層級修補。

---

## 10. deep_save_config 草案

```python
    deep_save_config = {
        "master_serializer": Dp030Serializer,
        "master_lookup_field": "gkey",
        "details": {
            "dp031": {
                "model": Dp031,
                "serializer": Dp031Serializer,
                "parent_field": "dp030gkey",
                "lookup_field": "gkey",
                "delete_mode": "hard"
            },
            "dp032": { "model": Dp032, "serializer": Dp032Serializer, "parent_field": "dp030gkey", "lookup_field": "gkey" },
            "dp034": { "model": Dp034, "serializer": Dp034Serializer, "parent_field": "dp030gkey", "lookup_field": "gkey" },
            "dp035": { "model": Dp035, "serializer": Dp035Serializer, "parent_field": "dp030gkey", "lookup_field": "gkey" },
            "dp104": { "model": Dp104, "serializer": Dp104Serializer, "parent_field": "dp030gkey", "lookup_field": "gkey" }
        }
    }
    
    # 透過 Hook 處理 Dp033
    def post_detail_save_hook(self, master_instance, detail_key, detail_instances, request):
        if detail_key == 'dp031':
            # 在此處理 Dp033 (Size Grid) 的 Upsert 與 Delete
            pass
```

---

## 11. 後續 Phase 7D 路線圖

為確保無痛轉換，後續將嚴格遵守以下執行步驟：

- **Phase 7D-2：DP030 前端 Factory 化第一階段**
  - 不動後端。前端逐步改用 `createRecordWorkbenchSheet`。
- **Phase 7D-3：DP030 Validation / ItemChanged 規則收斂**
  - 將前端殘留的防呆寫回 `validationConfig`。
- **Phase 7D-4：DP030 Service Layer 抽取**
  - 建立 `SampleStatusService` 接管跨表狀態回算。
- **Phase 7D-5：DP030 DeepSaveMixinV2 試點替換**
  - 後端套用草案，撰寫 Hook 處理 Dp033。
- **Phase 7D-6：DP030 最終回歸測試與封版**

---

## 12. 建議下一步

DP030 的結構與風險已完全清晰。我們已經有了防禦策略 (Hook 與 Custom Renderer) 以及轉換路線圖。
**建議下一步直接進入【Phase 7D-2：DP030 前端 Factory 化第一階段】**，先將前端這顆千行巨石，切割並移轉至標準的 `createRecordWorkbenchSheet` 容器中。
