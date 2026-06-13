# Legacy Analysis Phase 1：SY / SYS 系統管理模組作業總盤點

## 1. SYS 模組總覽

* **Legacy 模組命名範圍**：在 Legacy PB 系統中，系統管理與權限相關作業主要存在於 `tj_sys/syspgr.pbl` 中，主要字首命名包含 `SY` (如 `w_sy004`, `w_sy005`)、`SS` (如 `w_ss001`, `w_ss002`)，以及少部分不帶編號的作業 (如 `w_system_young`)。
* **Web ERP 統一歸入理由**：在先前的架構凍結與模組搬遷任務中，所有的登入、認證、權限控制、選單、與系統參數 API (原本分散於 `dp/views.py` 或根目錄) 已被全數統一收攏至 `api/modules/sys/` 目錄下。這確立了 SYS 模組作為整個 ERP 系統「基礎設施」與「安全中心」的定位。統一歸類能夠落實單一職責原則 (SRP)，避免跨模組的 Auth 依賴亂象。
* **SYS 模組主要負責範圍**：
  * **登入 / 登出與 Session 管理**：Token 核發與狀態管理。
  * **帳號 (Accounts) 與群組 (Groups)**：`sys_accounts`, `sys_accounts_group`, `sys_popedom_group` 的維護。
  * **選單 (Menu) 維護**：系統所有作業樹狀結構 (`sys_menu`) 註冊與顯示控制。
  * **權限 (Popedom) 矩陣**：作業等級的 CRUD 權限 (`sys_popedom`) 與 Bitmask (prg_popedom) 管理。
  * **欄位權限 (Field-level Permission)**：針對敏感欄位的隱藏 (hide) 或唯讀 (readonly) 控制 (`sys_accounts_column`, `sys_menu_column`)。
  * **資料約束 (Data Constraint)**：基於部門或層級的資料範圍限制 (`sys_constraint` 及其關聯表)。
  * **系統參數 (System Parameters)**：全域預設值及規則 (`sys_parameter`) 維護。
  * **系統日誌 (System Logs)**：稽核追蹤與報表功能。
* **關聯概述**：SYS 是 BA / DP / MR / SA 等所有業務模組的先決條件。任何業務 API 都必須依賴 SYS 的權限防護網 (PermissionMatrixService) 與 DataConstraint 攔截。前端的 Route 產生與 Sidebar 選單也直接依賴 SYS 提供的 `auth_menu`。

---

## 2. SYS 作業清單總表

| 作業代號 | 作業名稱 | Legacy 命名 | PB Window | DataWindow 清單 | Pattern 初判 | 主表 | 明細表 | 是否已翻新 | 後端 Model | Serializer | ViewSet/API | Frontend Page | Router 狀態 | 權限 ID | Bitmask | Field-level | DataConstraint | Auth/Session | F2 Lookup | 報表 | 依賴模組 | 優先級 | 備註 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **SS001** | 選單與權限維護 | SS | `w_ss001` | `d_system_menu`, `d_system_popedom`, `d_menu_column_ynet` | **Pattern B** | `sys_menu` | `sys_popedom_desc`, `sys_menu_column` | 半完成 | 存在 | 存在 | 存在 | 不存在 | 未註冊 | SS001 | 否 | 是 | 否 | 否 | 否 | 否 | 無 | P1 | Tree 結構維護選單與欄位翻譯 |
| **SS002** | 系統檢查紀錄 | SS | `w_ss002` | `d_sys_report_query`, `d_sys_checkdel` | **Pattern R** | (Log 表) | - | 未開始 | 待確認 | 不存在 | 不存在 | 不存在 | 未註冊 | SS002 | 否 | 否 | 否 | 否 | 否 | 是 | 無 | P3 | - |
| **SS003** | 系統語系設定 | SS | `w_ss003` | `d_sys_language_query`, `d_sys_language_detail` | **Pattern A2** | 語系主表 | 語系明細 | 未開始 | 待確認 | 不存在 | 不存在 | 不存在 | 未註冊 | SS003 | 否 | 否 | 否 | 否 | 否 | 否 | 無 | P3 | 多語系翻譯片語 |
| **SS004** | 報表設定 | SS | `w_ss004` | `d_sys_report_query`, `d_sys_report_setup` | **Pattern A2** | `sys_reportsetup` | - | 未開始 | 待確認 | 不存在 | 不存在 | 不存在 | 未註冊 | SS004 | 否 | 否 | 否 | 否 | 否 | 是 | 無 | P3 | 影響系統報表列印設定 |
| **SS005** | 系統日誌設定 | SS | `w_ss005` | `d_system_log_table`, `d_system_log_column`, `d_system_log_key` | **Pattern Special** | `system_log_table`| `system_log_column` | 未開始 | 待確認 | 不存在 | 不存在 | 不存在 | 未註冊 | SS005 | 否 | 否 | 否 | 否 | 否 | 否 | 無 | P3 | 設定哪些 Table 需記錄 Log |
| **SY002** | 權限約束定義 | SY | `w_sy002` | `d_sys_constraint_class`, `d_sys_constraint_prgclass` | **Pattern Special**| `sys_constraint` | 程式/帳號/明細 | 半完成 | 存在 | 存在 | 存在 | 不存在 | 未註冊 | SY002 | 否 | 否 | 是 | 否 | 否 | 否 | 無 | P2 | 資料約束 (Data Constraint) 定義 |
| **SY003** | 系統初始設定 | SY | `w_sy003` | `d_sys_initial` | **Pattern A** | (初始表) | - | 未開始 | 待確認 | 不存在 | 不存在 | 不存在 | 未註冊 | SY003 | 否 | 否 | 否 | 否 | 否 | 否 | 無 | P3 | - |
| **SY004** | 系統參數維護 | SY | `w_sy004` | `d_parameter` | **Pattern A** | `sys_parameter` | - | 半完成 | 存在 | 存在 | 存在 | 不存在 | 未註冊 | SY004 | 否 | 否 | 否 | 否 | 否 | 否 | 無 | P1 | 全系統核心參數設定 |
| **SY005** | 帳號權限管理 | SY | `w_sy005`<br>`w_system_young` | `d_accounts_ynet`, `d_popedom`, `d_constraint`, `d_accounts_column_young`... | **Pattern Special**| `sys_accounts` | `sys_popedom`, 等 | 半完成 | 存在 | 存在 | 部分存在 | 不存在 | 未註冊 | SY005 | 是 | 是 | 是 | 是 | 否 | 否 | 無 | P1 | 龐大的權限矩陣分配中心 |
| **SY006** | 核准權限設定 | SY | `w_sy006` | `d_sys_approve_where`, `d_sys_approve_query` | **Pattern Special**| (簽核表) | - | 未開始 | 待確認 | 不存在 | 不存在 | 不存在 | 未註冊 | SY006 | 否 | 否 | 否 | 否 | 否 | 否 | 無 | P3 | 簽核流設定 |
| **SY007** | 系統警告設定 | SY | `w_sy007` | `d_sys_warning`, `d_sys_warn_set`... | **Pattern B** | 警告主表 | 警告明細 | 未開始 | 待確認 | 不存在 | 不存在 | 不存在 | 未註冊 | SY007 | 否 | 否 | 否 | 否 | 否 | 否 | 無 | P3 | - |
| **SY008** | 單據規則設定 | SY | `w_sy008` | `d_sys_bill`, `d_sys_bill_detail`... | **Pattern B** | 單據主表 | 單據明細 | 未開始 | 待確認 | 不存在 | 不存在 | 不存在 | 未註冊 | SY008 | 否 | 否 | 否 | 否 | 否 | 否 | BA | P2 | 影響 BA 採購/訂單編號規則 |
| **SY009** | 登入連線管理 | SY | `w_sy009` | `d_active_menu`, `d_active_account` | **Pattern Special**| `sys_accounts_active`| - | 半完成 | 存在 | 不存在 | 不存在 | 不存在 | 未註冊 | SY009 | 否 | 否 | 否 | 是 | 否 | 否 | 無 | P2 | 管理 Active Sessions，強制登出 |
| **SY010** | 系統日誌查詢 | SY | `w_sy010` | `d_sys_log`, `d_stlog` | **Pattern R** | Log 表 | - | 未開始 | 待確認 | 不存在 | 不存在 | 不存在 | 未註冊 | SY010 | 否 | 否 | 否 | 否 | 否 | 否 | 無 | P3 | - |
| **SY011** | 系統日誌報表 | SY | `w_sy011` | `d_system_log_where`, `d_system_log_query` | **Pattern R** | Log 表 | - | 未開始 | 待確認 | 不存在 | 不存在 | 不存在 | 未註冊 | SY011 | 否 | 否 | 否 | 否 | 否 | 是 | 無 | P3 | - |
| **SY012** | 報表查詢 | SY | `w_sy012` | `d_sys_report_query`, `d_sys_minus` | **Pattern R** | - | - | 未開始 | 待確認 | 不存在 | 不存在 | 不存在 | 未註冊 | SY012 | 否 | 否 | 否 | 否 | 否 | 是 | 無 | P3 | - |
| **SY013** | 約束帳號對應 | SY | `w_sy013` | `d_constaint_accounts`, `d_sys_constraint_prg` | **Pattern Special**| `sys_constraint` | - | 半完成 | 存在 | 存在 | 存在 | 不存在 | 未註冊 | SY013 | 否 | 否 | 是 | 否 | 否 | 否 | 無 | P2 | 與 SY002 類似，專注約束與帳號綁定 |
| **SY015** | 權限進階報表 | SY | `w_sy015` | `d_sy015_accounts_report`... | **Pattern Special**| `sys_accounts` | - | 未開始 | 存在 | 不存在 | 不存在 | 不存在 | 未註冊 | SY015 | 是 | 是 | 是 | 否 | 否 | 是 | 無 | P3 | 權限與帳號群組的大型報表列印 |
| **SY020** | 權限群組設定 | SY | `w_sy020` | `d_accounts_ynet`, `d_popedom`... | **Pattern Special**| `sys_accounts_group`| - | 半完成 | 存在 | 存在 | 部分存在 | 不存在 | 未註冊 | SY020 | 是 | 否 | 否 | 否 | 否 | 否 | 無 | P2 | 群組維護，為 SY005 子集或補充 |
| **Login** | 系統登入 | Auth | - | - | **Pattern Special**| - | - | 已完成 | - | - | 存在 | 存在 | 已註冊 | auth | 否 | 否 | 否 | 是 | 否 | 否 | 無 | P0 | 核心認證 `auth_login` |

---

## 3. Pattern 分類統計

* **Pattern A (單表 CRUD)**：2 支 (SY003, SY004)
* **Pattern A2 (主檔+明細)**：2 支 (SS003, SS004)
* **Pattern B (Master-Detail)**：3 支 (SS001, SY007, SY008)
* **Pattern R (報表查詢)**：4 支 (SS002, SY010, SY011, SY012)
* **Pattern Special (安全/權限/矩陣)**：8 支 (SS005, SY002, SY005, SY006, SY009, SY013, SY015, SY020, Login)
* **未判定**：0 支

---

## 4. 已翻新 / 已實作功能清單 (Backend)

目前 SYS 在 Backend 已經實作了大量的核心架構，但前端 UI 大多缺失。
* **核心認證 (`auth_login`, `auth_logout`, `auth_me`)**：100% 完成。位於 `sys/views.py`。
* **選單與權限派送 (`auth_menu`, `auth_permissions`)**：100% 完成。依賴 `core/authz/services.py` 處理。
* **權限矩陣批次處理 (`auth_permission_matrix`, `auth_save_permissions`, `auth_copy_permissions`, `auth_apply_group_permissions`)**：100% 完成。位於 `sys/views.py`。
* **使用者與群組管理 (`auth_users`, `auth_user_detail`, `auth_groups`...)**：100% 完成。位於 `sys/views.py`。
* **SysAccountViewSet**：後端 CRUD 完成。
* **SysParameterViewSet (SY004)**：後端 CRUD 完成。
* **SysMenuViewSet (SS001)**：後端 CRUD 完成，支援 Tree 操作。
* **SysMenuColumnViewSet (SS001 欄位翻譯)**：後端 CRUD 完成。

*註：前端目前只有 `LoginPage.jsx` 與 `AuthContext`。*

---

## 5. 未翻新 / 待補功能清單 (Frontend / UI)

以下作業在後端 API 已有基礎或完全支援，但前端缺乏對應頁面，需安排翻新：
* **SS001 選單與權限維護**：缺乏 Master-Detail Tree UI，需深度分析其樹狀結構拖曳與欄位定義方式 (優先級 P1)。
* **SY004 系統參數維護**：缺乏 Pattern A UI 頁面 (優先級 P1)。
* **SY005 帳號權限管理 (w_system_young)**：缺乏複雜的大型矩陣分配 UI (Pattern Special) (優先級 P1)。

尚未進行任何處理的 Legacy 作業（技術債）：
* **SY002 / SY013 (Data Constraint UI)**：後端已有 Model，缺乏 API 與 UI (優先級 P2)。
* **SY009 (連線管理)**：缺乏踢除 Session 功能 (優先級 P2)。
* **SY007 (系統警告) / SY008 (單據設定)**：需配合 BA/DP 開發時同步處理 (優先級 P2/P3)。
* **SS003, SS004, SS005, SY010, SY011 等報表/設定**：可延後處理的技術債 (優先級 P3)。

---

## 6. 權限系統專章

### 系統現況
* **核心模型**：`SysAccount` (帳號), `SysMenu` (選單), `SysPopedomDesc` (操作描述), `SysMenuColumn` (欄位翻譯), `SysPopedomGroup` (群組)。
* **Bitmask 控制 (`prg_popedom`)**：PB 舊系統將權限打包成二進位 Bitmask 字串，目前系統內透過 `SysPopedom` 進行存儲與管理，並在 API (如 `auth_permissions`) 展開提供給前端。
* **Field-level Permission (`sys_accounts_column`)**：支援對特定作業 (`obj_name`) 的敏感欄位 (`db_name`) 進行 `hide` (隱藏不回傳) 或 `readonly` (禁止修改) 的控制。目前 Model 已定義。
* **DataConstraint (`sys_constraint`)**：資料範圍過濾機制。透過 `sys_constraint_program`, `sys_constraint_leaguer`, `sys_constraint_detail` 三層關聯建立「某作業」下「某帳號」能看到「哪些資料」的限制。
* **核心服務**：`core/authz/services.py` 中的 `build_menu_tree` 與 `build_permission_map` 是整個系統最核心的權限組裝樞紐。
* **Program ID 規則**：依據 `SysMenu.prg_code` 或 `SysMenu.obj_name` 映射，目前由 `PermissionMatrixService` 負責解析。

### 技術債與影響
* `sys_constraint` 的攔截機制尚未在所有 ViewSet 的 `get_queryset()` 中全面套用，這可能導致資料越權存取。
* Phase 9B 的群組擴充欄位 (`group_code`) 在 `sys_accounts_column` 等表中為預留狀態，尚未啟用。
* 建議目前**不要修改** `build_menu_tree` 與 `build_permission_map`，以免破壞已凍結的核心認證架構。

---

## 7. 系統參數專章

* **核心表**：`SysParameter`。
* **對應作業**：SY004。
* **參數快取**：目前實作於 `api/services/sys_parameter_cache.py`，啟動時將參數讀入 Redis 或 Memory 以供全域快速存取。
* **行為控制 (`visitctrl`, `peopdom_class`)**：定義參數的訪問限制等級，後端 `SysParameterViewSet` 中已有權限判斷，例如只有 `is_superuser` 或具有足夠 `peopdom_class` 的帳號才能修改特定參數。
* **Web 對齊狀態**：Model 與 API 已 100% 完成，只差 Frontend UI。
* **後續風險**：如果前端 SY004 介面未完成，管理者將無法調整 ERP 核心參數 (如小數點位數、單據規則預設值)，這會卡住後續 DP / MR 模組的運作。

---

## 8. 第一批建議處理順序

基於目前後端架構已凍結的現況，建議採取以下順序逐步完善 SYS 模組：

### Batch 1：前端 UI 補齊 (High Priority)
後端已完備，只差前端介面。
1. **SY004 系統參數維護** (Pattern A UI)。
2. **SS001 選單維護** (Pattern B Tree UI)。
3. **SY005 帳號權限管理** (Pattern Special Matrix UI)。

### Batch 2：核心安全設定 (Medium Priority)
1. **SY002 / SY013**：資料約束 (Data Constraint) 的設定 UI。這對於實作行級資料過濾至關重要。
2. **SY009**：Active Session 管理 (可踢除異常登入帳號)。

### Batch 3：可延後的技術債 (Low Priority)
1. **SS003 (語系), SS004 (報表設定), SS005 (日誌設定)**。
2. **SY007 (警告), SY008 (單據), SY010/011/012 (報表/日誌)**。
這些不影響核心業務流程，可等待 Feature 需求明確後再實作。

### Batch 4：高風險項目 (Do Not Touch)
1. `core/authz/services.py` 內的 `build_permission_map` 與 `build_menu_tree`。
2. `sys/views.py` 內的 `auth_login` 相關邏輯。
這些已是凍結架構的基石，非必要不建議重構。

---

## 9. 風險與待確認事項

* **DataWindow 驗證邏輯缺失**：Legacy PB 的 `d_system_menu` 與 `d_parameter` 中可能包含自定義的 Data Validation (如 `visitctrl` 檢查、特殊防呆)，目前尚未將其完整提取至 Frontend UI。
* **Field-level Permission 實作**：`sys_accounts_column` 控制了 `hide` / `readonly`。目前後端如何與前端元件 (Input disable/hidden) 綁定，需要人工確認商業規則與實作範例。
* **DataConstraint 影響範圍**：`sys_constraint` 設定為 `equal` 或 `in_list`，但並未明確說明哪些業務模組 (DP/BA/MR) 的哪些欄位被其控制。需盤點所有繼承 BaseViewSet 的 Controller，確認是否有呼叫 Constraint 過濾。
* **服務位置錯置**：`api/services/permission_matrix_service.py` 與 `sys_parameter_cache.py` 位於根目錄 `api/services/`，未搬遷至 `api/modules/sys/services/`，雖然不影響功能但有礙模組邊界整潔。

---

## 10. 後續建議

1. **下一階段首要任務**：直接進行 **SY004 (系統參數)** 與 **SS001 (選單維護)** 的前端頁面開發。因為後端 API 已備妥，且這是最基礎的 Pattern A/B 練習，可做為前端架構的 Golden Sample。
2. **只補文件的部分**：對於 SY010、SY011 等報表類作業，由於依賴歷史 Log 資料，目前只需將其標記為「未實作」，待日後報表系統上線再處理即可。
3. **架構維護建議**：絕對避免更動既有的 `auth_` API 與 Models。在進行 SY005 權限矩陣的前端開發時，應配合既有 API 格式送出 Payload，而非修改 Backend ViewSet。
