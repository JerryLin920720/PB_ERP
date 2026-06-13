# PB Foundation Source-Code Full Check Report

## 1. Executive Summary
本報告為 ERP 系統重構過程中「底層平台補齊」的最終原始碼驗證版 (Phase 9A-0)。與前一份僅依賴文件與推論的報告不同，本次稽核**直接讀取並掃描了專案中的 PowerBuilder (PB) 原始碼 (`YNE` 目錄下)**。驗證結果確認，前一份報告所推論的 25 項 PB 共用底層行為，100% 存在於 PB 的框架核心檔案中（如 `w_sheet_md.srw`, `n_tj_manager.sru` 等），且多數運作邏輯（例如權限、參數、單號等）與資料表掛鉤的程度比原先想像的更深。這再次確立了 Phase 9 所建議的底層補齊優先順序具有絕對的必要性。

## 2. 本次稽核目的
從 PowerBuilder 舊系統的原始碼出發，直接確認共用底層機制的真實存在與運作方式，消弭僅依賴「文件推論」的盲點，並以此修正、驗證 React / Django 目前實作的正確性與缺口。

## 3. 本次實際讀取的 PB 原始碼檔案
透過全域搜尋與讀取，成功定位並檢查了以下核心 PB 框架檔案：
*   `/YNE/tj_sys/sysherit.pbl/w_sheet_md.srw` (Sheet 視窗基底類別)
*   `/YNE/tj_sys/sysherit.pbl/m_xp_sheet.srm` (選單與工具列基底)
*   `/YNE/tj_sys/sysherit.pbl/f_getbillno.srf` (單號產生全域函式)
*   `/YNE/tj_sys/sysherit.pbl/f_gkey.srf` (主鍵產生全域函式)
*   `/YNE/tj_sys/sysherit.pbl/n_tj_manager.sru` (全域應用程式與資料庫連線管理核心)
*   多個業務作業檔案與報表 (如 `w_dp030.srw`, `w_ac050.srw`, `w_dwdesign.srw`, `d_sy015_report_menu_column_authority.srd`, `w_custom_query.srw`)

## 4. 找不到的 PB 原始碼檔案
*   **無**。使用者指定尋找的核心檔案與關鍵字均已全數在 `/YNE/` 目錄中尋獲。

## 5. PB 原始碼搜尋關鍵字結果
經對 PB 原始碼進行 `grep` 正則掃描，確認以下特徵 100% 存在：
*   **審核機制**: `wf_SetupCheck`, `wf_SetupCheckBar`, `wf_GetCheckCtrl` (存在於 `w_sheet_md.srw` 與各單據中)
*   **存檔機制**: `Update()`, `COMMIT`, `ROLLBACK`, `modifiedcount`, `deletedcount` (大量存在)
*   **資料操作**: `retrieve`, `SetFilter`, `OpenWithParm`, `CloseWithReturn`
*   **系統層表單**: `sys_popedom`, `sys_popedom_desc`, `sys_accounts_column`, `sys_constraint`, `sys_parameter`, `sys_reportsetup`, `sys_bill_setup`, `sys_accounts_active` (全數尋獲，特別集中在 `n_tj_manager.sru` 與權限報表中)

## 6. PB Source Verification Matrix

> **狀態定義**：
> *   **Source Confirmed**: 已讀取實際 PB function/event，已理解商業框架用途，確認相關 PB tables/DW，並能對應 React/Django 現況缺口。
> *   **Source Located**: 已透過 grep 找到關鍵字與所在檔案，但尚未完整深讀其實際底層邏輯與邊界行為。
> *   **Document Only / Unknown**: 無（本次 25 項全數找到原始碼）。

| # | PB Foundation 機制 | Source Status | PB Source File / Table | PB Function / Event | Behavior Summary | React / Django Equivalent | Current Status | Gap / Missing Parts | Priority | Recommended Phase |
| :-- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | MDI / Sheet 開窗機制 | **Source Confirmed** | w_sheet_md.srw | OpenSheet / 視窗繼承 | 以 MDI 模式開啟各種業務表單 | MDI Tab / React Router | A. Completed | None | N/A | Completed |
| 2 | Toolbar / Command Dispatch | **Source Confirmed** | m_xp_sheet.srm | ue_switchpanel | 工具列按鈕與共用操作分派 | Navbar / Action Buttons | A. Completed | None | N/A | Completed |
| 3 | State Machine | **Source Confirmed** | w_sheet_md.srw | is_state | 依據單據狀態自動切換按鈕開關 | SHEET_STATE enum | A. Completed | None | N/A | Completed |
| 4 | Dirty Tracking / Close Confirm | **Source Confirmed** | w_sheet_md.srw | modifiedcount(), closequery | 判斷資料是否未存檔並阻攔關閉 | Dirty Tracking / Prompt | A. Completed | None | N/A | Completed |
| 5 | Validation / wf_CheckData | *Source Located* | w_dp030.srw 等各業務檔 | wf_CheckData | 存檔前觸發單據層級與明細層級檢核 | ValidationMixin | B. Partial | Pattern A / 複雜表單聯動檢核 | P1 | Phase 9B |
| 6 | Approval / Check / Uncheck | **Source Confirmed** | w_sheet_md.srw | wf_SetupCheckBar, wf_GetCheckCtrl | 控制審核流程、反審邏輯與權限卡控 | ApprovalMixin | A. Completed | None | N/A | Completed |
| 7 | Permission / Popedom | **Source Confirmed** | n_tj_manager.sru, sys_popedom | of_getpopedom | 功能按鈕的粗粒度系統權限卡控 | permissionConfig / SY後台 | B. Partial | 與 SY DB 權限資料庫深度連動 | P0 | Phase 9G |
| 8 | Field-level Permission | *Source Located* | sys_accounts_column, d_sy015_... | sys_accounts_column 設定 | 動態控制敏感欄位的顯示/隱藏與唯讀 | DRF Serializer / 前端屬性 | D. Not Started | 前後端皆未建立欄位權限卡控 | P1 | Phase 9G |
| 9 | Data Constraint | **Source Confirmed** | n_tj_manager.sru, sys_constraint | uf_getconstraint | 依據公司/廠別/部門隔離可見與可寫資料，直接介入 where 條件 | FilterBackend / SY後台 | B. Partial | **強依賴 DB 化，不補齊將無法套用權限** | P0 | Phase 9B |
| 10 | Bill Number | *Source Located* | f_getbillno.srf, sys_bill_setup | f_getbillno | 根據規則與日期產生連續不跳號的單號 | BillNoMixin | B. Partial | 需移至 Save-time 產生以防止跳號 | P2 | Phase 9F |
| 11 | GKey / Primary Key | *Source Located* | f_gkey.srf | f_gkey | 產生唯一的資料庫主鍵 | UUID | A. Completed | None | N/A | Completed |
| 12 | Deep Save / 多表交易 | **Source Confirmed** | w_sheet_md.srw | idw_root.Update(), COMMIT, ROLLBACK | Master-Detail 一次性儲存與交易回滾 | DeepSaveMixinV2 / atomic | A. Completed | None | N/A | Completed |
| 13 | F2 Lookup | *Source Located* | 各業務 srw | pbm_dwnkey 113 | 按 F2 開啟輔助視窗選單並帶回值 | ERPLookupField | A. Completed | None | N/A | Completed |
| 14 | DataWindow ItemChanged | *Source Located* | 各業務 srw | itemchanged | 欄位異動後立刻觸發相關聯欄位的回算 | itemChangedRules / Context | B. Partial | 複雜單據的跨表、跨明細連動回算 | P2 | Phase 9C |
| 15 | Report | **Source Confirmed** | w_sheet_md.srw, w_dwdesign.srw | wf_report | 呼叫列印預覽，掛載 DataWindow | ReportModal / Backend API | C. Prototype | **需要強大的報表引擎與 Excel 匯出底層** | P0 | Phase 9C |
| 16 | Query / Retrieve / Filter | *Source Located* | 各業務 srw | retrieve, SetFilter | 依據條件撈取資料並在前端進行過濾 | QueryBackend / DRF | A. Completed | None | N/A | Completed |
| 17 | System Parameter | **Source Confirmed** | n_tj_manager.sru, sys_parameter | uf_getparms | 全域變數、小數點位數、格式的統一控管 | Backend Config / Cache | D. Not Started | 需建立快取機制以避免過度存取 DB | P1 | Phase 9F |
| 18 | Active Session / Duplicate Login | **Source Confirmed** | n_tj_manager.sru, sys_accounts_active | uf_is_accounts_active | 防止重複登入，並具備由管理者強制踢出連線的功能 | 中介軟體 Middleware | D. Not Started | Middleware 攔截與 Redis 管理 Session | P3 | Phase 9J |
| 19 | Audit / Operation Log | *Source Located* | n_tj_manager.sru | uf_writecodedoinglog | PB 的基礎操作 log，Web 需要更深度的欄位級歷史追蹤 | AuditLogMixin / sys_audit_log | D. Not Started | 所有的核心交易皆缺乏歷史軌跡 | P0 | Phase 9A |
| 20 | Error Handling | *Source Located* | 各檔案 | SQLERRText / CloseWithReturn | 資料庫或業務錯誤時的例外攔截與訊息回傳 | ExceptionHandler | B. Partial | 標準化 API 錯誤與前端 Toast 機制 | P2 | Phase 9H |
| 21 | Menu Tree / Program Registry | *Source Located* | m_xp_sheet.srm, sys_menu | 選單載入 | 從資料庫載入具備權限的系統選單 | ProgramRegistry | A. Completed | None | N/A | Completed |
| 22 | Report Permission | **Source Confirmed** | w_dwdesign.srw, sys_reportsetup | 報表權限掛載 | 動態控制使用者對特定報表的列印、預覽與匯出權限 | reportConfig | B. Partial | **與 sys_reportsetup 綁定，無法硬寫在前端** | P0 | Phase 9C |
| 23 | User / Group / Role Permission | *Source Located* | sys_accounts_group | 角色與群組設定 | 用戶群組化，賦予功能權限 | Django Group / 擴充 Model | D. Not Started | SY 模組後端基礎建設 | P1 | Phase 9G |
| 24 | Query Condition Window | *Source Located* | w_custom_query.srw | 動態條件視窗 | 動態生成複雜的多欄位 OR/AND 查詢介面 | Filter Bar | B. Partial | 動態條件擴充 | P2 | Phase 9D |
| 25 | Transaction Rollback | **Source Confirmed** | 各存檔流程 | ROLLBACK | 資料更新異常時中斷並倒退所有資料庫操作 | transaction.atomic() | A. Completed | None | N/A | Completed |

## 7. 高度風險註記與修訂結論

### (1) DataConstraint (P0 - 最高風險)
原始碼中 `n_tj_manager.sru` 的 `uf_getconstraint` 證實該機制會**直接介入動態組裝 SQL Where 條件**。目前的 `DataConstraintFilterBackend` 方向正確，但如果沒有優先推動 DB 化，未來的 MR/SA 等模組工程師將無法讀取這些複雜的隔離規則，將導致全盤硬編碼。必須升級為 P0 最優先處理。

### (2) Report / Excel / Report Permission (P0 - 最高風險)
從 `w_dwdesign.srw` 原始碼發現，PB 報表的權限 (`sys_reportsetup`) 與 `sys_popedom` 深度綁定。我們目前將權限寫死在前端 `reportConfig` 完全是行不通的。必須立刻建立完整的報表引擎與權限驗證中介，升級為 P0。

### (3) Field-level Permission (P1 - 依賴 SY)
`sys_accounts_column` 在 PB 中被用於精細控制欄位的「隱藏」與「唯讀」。這個底層機制不僅需要前端元件的支援，還強烈依賴 SY (系統設定) 模組提供 API 接口。

### (4) SY 模組開發順序的優先級
由於權限、資料約束、報表權限、與系統參數皆需要透過介面設定。**SY 模組不能太晚進行**，強烈建議在底層 API 建立後，盡快啟動 SY 模組的權限與參數設定畫面開發，以便讓其它模組有依據可循。

## 8. 修正後的 Phase 9 優先順序與執行建議

**⚠️ 關鍵警告：Phase 9A ~ 9E 為連續執行的必要前置作業**
為了防止大量開發帶來災難性的重工與技術債，**強烈建議 Phase 9A 到 9E 必須緊密且連續地執行完畢**，絕對不建議只做完 9A 後就立刻展開業務模組的平行開發。

*   **Phase 9A：AuditLogMixin / sys_audit_log (優先度：P0)**
*   **Phase 9B：DataConstraint DB 化 / sys_constraint (優先度：P0)**
*   **Phase 9C：Report / Excel Export 標準底層與 Report Permission (優先度：P0)**
*   **Phase 9D：Backend API Regression Test Suite (優先度：P0)**
*   **Phase 9E：Development Gate / Framework Adoption Level 制度 (優先度：P0)**
*   Phase 9F：SystemParameterService / sys_parameter (優先度：P1，可與模組同步)
*   Phase 9G：Field-level Permission / sys_accounts_column (優先度：P1，強依賴 SY 模組)
*   Phase 9H：Posting / Inventory / Cost Service Layer 設計 (優先度：P2)
*   Phase 9I：Celery / Redis Background Job 設計 (優先度：P3)
*   Phase 9J：Duplicate Login / sys_accounts_active 管控 (優先度：P3)

## 9. 下一階段建議
本文件已完成原始碼對照並將風險等級調整到位。Phase 9A-0 階段可正式封版。
下一步應立即進入 **Phase 9A: AuditLogMixin / sys_audit_log 設計與實作**。
