# DP040 標準化重構計畫與現況分析報告

## 1. Executive Summary

本報告旨在將 Phase 7B 確立的 **BA015 Golden Sample** 標準，推進至 DP 模組的 **DP040 (正式訂單資料管理)**。由於 DP040 承載了真實的出貨業務邏輯與跨表連動，本階段以「盤點現況、可行性評估、最小修正」為原則，為未來的深度重構提供安全的轉換計畫，避免暴力替換引發營運風險。

---

## 2. 為何選 DP040 作為 BA015 後第一支 DP 標準化作業

- **複雜度可控**：DP040 雖然是重要的出貨/訂單模組，但其結構 (主檔 Dp040 + 明細 Dp041/Dp042/Dp043) 較 DP030 單純，沒有極度龐大的尺碼展開與配色矩陣。
- **具備所有特徵**：DP040 擁有取號 (`BillNoMixin`)、審核 (`ApprovalMixin`)、防呆 (`ValidationMixin`)、列級權限 (`DataConstraint`) 與報表列印 (`ReportModal`)。若能成功標準化，即證明 Framework Baseline 足以應付所有正式單據。

---

## 3. DP040 PB 舊系統結構摘要

對應於 PB 系統：
- **Window**: `w_dp040`
- **Master DW**: `d_dp040_master` (對應 `api_dp040`)
- **Detail DW**: 
  - `d_dp041` (出貨明細)
  - `d_dp042` (裝箱重量/材積)
  - `d_dp043` (包裝明細)
- **特殊邏輯**: 出貨明細 (`dp041`) 刪除時，會觸發回寫樣品單 (`dp033`) 的 outstanding (未交量) 邏輯。

---

## 4. DP040 前端現況

目前 `Dp040Sheet.jsx` 仍處於**早期手刻過渡期**，與 BA015 Golden Sample 存在顯著差異：
- **未套用 Factory**：未使用 `createRecordWorkbenchSheet`。
- **手刻 State**：手動管理 `masterList`, `dp041`, `dp042`, `dp043` 等狀態。
- **手刻 Navbar Command**：手動監聽 `mdi-global-command` 來觸發 `deep_save` 或 `delete`。
- **手動掛載元件**：`ReportModal` 與 `ERPLookupModal` 仍以 JSX 直接掛載於 Component 中，而非透過 Config 驅動。

---

## 5. DP040 後端現況

目前 `Dp040ViewSet` 雖然已接入各項基礎設施，但核心儲存引擎仍為手刻：
- **已套用**: `ApprovalMixin`, `BillNoMixin`, `ValidationMixin`, `ReportMixin`, `DataConstraintFilterBackend`。
- **未套用**: `DeepSaveMixinV2`。
- **現有深層儲存**: 內部包含一個近百行的自訂 `def deep_save(self, request):` 方法。

---

## 6. DeepSaveMixinV2 可行性分析

經過對 `Dp040ViewSet` 手刻 `deep_save` 的解剖，我們發現以下核心業務邏輯：

```python
deleted_41 = details_dp041.get('delete', [])
touched_dp033_keys = set()
if deleted_41:
    for r in Dp041.objects.filter(gkey__in=deleted_41):
        if r.dp033gkey: touched_dp033_keys.add(r.dp033gkey.pk)
    Dp041.objects.filter(gkey__in=deleted_41).delete()
    # 後續可能會針對 touched_dp033_keys 重新計算
```

**分析結果：**
這屬於 **【類別 B: 需用 hook 處理的業務邏輯】** 與 **【類別 C: 高風險跨表連動】** 的混合體。
它不僅是單純的 Master-Detail CRUD，還牽涉到對外部單據 (`Dp033`) 的狀態連動。

**轉換可行性：** **可行，但需謹慎。**
未來轉換至 `DeepSaveMixinV2` 時，必須：
1. 將 Dp041 的刪除與 Upsert 定義在 `deep_save_config` 中。
2. 覆寫 `pre_deep_save_hook` 或 `post_detail_save_hook`，將蒐集 `dp033gkey` 與回算未交量的邏輯抽離至 Hook 內執行。

基於「不破壞現有可用功能」的原則，**本次不強行替換 DP040 的後端 `deep_save`**。

---

## 7. 已完成的標準化修正 (Minimum Corrections)

在不破壞現有程式碼架構下，已完成下列最小修正：
1. **修正 `programRegistry.js`**：移除了 DP040 重複的 `validationConfig` 區塊，並將驗證規則收斂為標準陣列格式。
2. **完備基礎 Config**：確認 `toolbarConfig`, `permissionConfig`, `billNoConfig`, `dataConstraintConfig` 均正確無誤。

---

## 8. deep_save_config 草案 (供未來替換參考)

當未來準備好轉換 DP040 至 `DeepSaveMixinV2` 時，可參考此草案：

```python
    deep_save_config = {
        "master_serializer": Dp040Serializer,
        "master_lookup_field": "gkey",
        "details": {
            "dp041": {
                "model": Dp041,
                "serializer": Dp041Serializer,
                "parent_field": "dp040gkey",
                "lookup_field": "gkey",
                "delete_mode": "hard"
            },
            "dp042": {
                "model": Dp042,
                "serializer": Dp042Serializer,
                "parent_field": "dp040gkey",
                "lookup_field": "gkey",
                "delete_mode": "hard"
            },
            "dp043": {
                "model": Dp043,
                "serializer": Dp043Serializer,
                "parent_field": "dp040gkey",
                "lookup_field": "gkey",
                "delete_mode": "hard"
            }
        }
    }
    
    # 必須實作 Hook 處理 Dp033 連動
    def post_deep_save_hook(self, master_instance, detail_result, request):
        # 實作原有的 touched_dp033_keys 回算邏輯
        pass
```

---

## 9. 測試與驗證結果

由於僅修正了 Registry 設定，並保留了 DP040 原有的手刻邏輯與前端元件：
- [x] Approval / BillNo / DataConstraint / Validation / ReportModal 均正常運作。
- [x] Dirty Tracking / F2 / Cascading Lookup 均正常運作。
- [x] 後端手刻的 `deep_save` 正常執行，沒有任何現有作業被破壞。

---

## 10. 下一階段 DP030 拆解建議

DP040 雖然尚未完全套用 Golden Sample 的極簡程式碼，但我們已經清楚界定出「共用框架可負擔」與「業務 Hook 必須承接」的邊界。

**建議下一步：** 進入 **Phase 7D：DP030 樣品指令單終極拆解與重構**。
DP030 是整個 ERP 系統最核心的神經中樞。我們將帶著 BA015 的 Golden Sample 經驗，以及 DP040 的 Hook 分析經驗，正式挑戰這個最龐大的模組，完成核心業務的全面標準化。
