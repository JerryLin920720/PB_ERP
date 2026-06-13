# PB Foundation Cross-Check & Platform Gap Audit
## 1. Executive Summary
本報告針對 ERP 系統從 PowerBuilder (PB) 移轉至 React + Django 過程中的底層共用機制進行了全面稽核。本次稽核釐清了 PB 既有底層的重構狀況，並發掘出現代 Web ERP 上線所需的進階工程缺口。目標是為未來大量同步開發 MR / SA / SY / FA 模組前，提供明確的基礎建設補齊藍圖與入閘準則，避免各模組開發產生技術債與重複造輪子的情況。

## 2. 稽核範圍
*   **PB Foundation Cross-Check**：盤點 25 項 PB 時代的核心共用底層，比對 React/Django 目前的支援程度。
*   **Platform Foundation Gap Audit**：檢視 12 項現代 Web ERP 所需之基礎工程設施（包含 PB 舊有功能與現代 Web 系統必備元件）。
*   **SY Dependency**：評估底層功能與未來 SY（系統管理）模組設定畫面的依賴關係。
*   **Development Gate**：制定新作業開發的檢核表與採用度分級標準。

## 3. 使用的 PB 文件與 React / Django 文件
*   由於未直接讀取 PB 原始碼，僅依據既有分析文件（如使用者提供之 Prompt 列舉的 PB 檔案及功能特徵）。
*   React / Django 框架分析文件：
    *   `framework_baseline_freeze_report.md`
    *   `framework_adoption_audit_report.md`
    *   `frontend_smoke_test_guard_result.md`
    *   `framework_phase6b_deepsave_mixin_v2_result.md`
    *   `framework_phase5c_validation_wf_checkdata_result.md`
    *   `framework_phase6a_reportmodal_result.md`
    *   `dp030_final_regression_freeze_report.md`
    *   `dp040_deepsave_v2_refactor_result.md`
    *   `dp025_deepsave_v2_refactor_result.md`
    *   `dp_module_legacy_save_audit_phase_8b_3.md`

## 4. PB Foundation Mapping Matrix

| pb_foundation_area | pb_source_file_or_function | pb_behavior_summary | react_django_equivalent | current_implementation_status | existing_files | missing_parts | risk_if_missing | affected_modules | priority | recommended_phase | notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| MDI / Sheet | m_xp_sheet, w_sheet_md | MDI Tab 開窗 | MDI Tab, programRegistry | A. Completed | App.jsx, programRegistry.js | None | N/A | All | - | - | 已穩定運作 |
| Toolbar Command | toolbar event | Global 按鈕事件 | Navbar, mdi-global-command | A. Completed | Navbar.jsx, toolbarRegistry.js | None | N/A | All | - | - | 已穩定運作 |
| State Machine | QUERY/EDIT/NEW... | 狀態控制 | SHEET_STATE | A. Completed | useRecordWorkbenchCrud.js | None | N/A | All | - | - | 已穩定運作 |
| Dirty Tracking | closequery, modifiedcount | 未存檔提示 | Dirty Tracking | A. Completed | useRecordWorkbenchCrud.js | None | N/A | All | - | - | Pattern B 已實作 |
| Validation | wf_CheckData | 儲存前檢核 | ValidationMixin, validationConfig | B. Partial | validation.py | Pattern A 驗證支援 | 髒資料入庫 | DP, MR, SA, FA | P1 | Phase 9B | 需擴展至 Pattern A |
| Approval | wf_SetupCheck | 審核鎖定 | ApprovalMixin | A. Completed | approval.py | None | N/A | All | - | - | 已穩定運作 |
| Permission | sys_popedom | 作業權限 | HasProgramPermission | B. Partial | permissionConfig | SY 動態管理後台 | 權限寫死 | All | P0 | Phase 9G | 需改由 DB 控管 |
| Field-level Perm. | sys_accounts_column | 欄位級隱藏/唯讀 | FieldPermissionMixin (規劃中) | D. Not Started | - | 後端權限判斷、前端攔截 | 敏感價格外洩 | DP, MR, SA, FA | P1 | Phase 9G | 優先用於成本/單價 |
| Data Constraint | sys_constraint | 列級權限隔離 | DataConstraintFilterBackend | B. Partial | data_constraint.py | JSON 改 DB、SY 設定畫面 | 跨廠區修改 | DP, MR, SA, FA | P0 | Phase 9B | 必須優先處理 |
| Bill Number | f_getbillno | 自動取號 | BillNoMixin | B. Partial | billno.py | Save-time 取號防跳號 | 單號重複/跳號 | DP, MR, SA, FA | P2 | Phase 9F | 目前為前端取號 |
| Primary Key | f_gkey | 主鍵產生 | Django UUID/Sequence | A. Completed | models.py | None | N/A | All | - | - | 已由 DB 取代 |
| Deep Save | idw_root.Update() | 多表交易存檔 | DeepSaveMixinV2 | A. Completed | deep_save_v2.py | None | N/A | DP, MR, SA, FA | - | - | 已成熟 |
| F2 Lookup | pbm_dwnkey 113 | 開窗與帶回 | ERPLookupField | A. Completed | ERPLookupField.jsx | None | N/A | All | - | - | 已穩定運作 |
| ItemChanged | itemchanged | 欄位連動 | itemChangedRules | B. Partial | useItemChanged.js | 更複雜的明細主檔回算 | 計算錯誤 | DP, MR, SA, FA | P2 | Phase 9C | 可邊開發邊補 |
| Report | wf_report | 報表列印 | ReportModal, ReportMixin | C. Prototype | ReportModal.jsx, report.py | 報表模板、正式 PDF 引擎 | 需手刻報表 | DP, MR, SA, FA | P0 | Phase 9C | 目前僅 Stub |
| Query / Retrieve | retrieve, SetFilter | 查詢機制 | filter backend | A. Completed | api views | None | N/A | All | - | - | DRF 內建支援 |
| System Parameter | sys_parameter | 系統參數 | SystemParameterService | D. Not Started | - | Service、DB 表、SY004 | 參數 Hardcode | All | P1 | Phase 9F | 可邊開發邊補 |
| Active Session | sys_accounts_active| 防重複登入 | Session Management | D. Not Started | - | 中介軟體、帳號鎖定 | 帳號共用/安全 | All | P3 | Phase 9J | 可延後 |
| Audit Log | 操作日誌 | 紀錄異動軌跡 | AuditLogMixin (規劃中) | D. Not Started | - | Mixin, sys_audit_log DB | 查無異動來源 | All | P0 | Phase 9A | 必須先做 |
| Error Handling | MessageBox | 統一錯誤顯示 | 前端 Axios Interceptor | A. Completed | api.js | None | N/A | All | - | - | 標準化錯誤格式 |
| Menu Tree | menu | 左側選單 | Sidebar, programRegistry | A. Completed | Sidebar.jsx | None | N/A | All | - | - | 已穩定運作 |
| Report Permission | sys_reportsetup | 報表權限 | Report Config | B. Partial | programRegistry.js | DB 化與 SY 管理畫面 | 越權列印 | DP, MR, SA, FA | P1 | Phase 9C | 與 Report 整合 |
| User Permission | sys_accounts | 帳號權限 | Django Admin/Groups | B. Partial | auth | SY 專屬帳號角色設定 | 只能由 IT 調 | All | P0 | Phase 9G | 需 SY UI |
| Query Window | query where | 搜尋面板 | Search Panel | A. Completed | SearchPanel.jsx | None | N/A | All | - | - | 已穩定運作 |
| Trans. Rollback | rollback | 異常回滾 | transaction.atomic | A. Completed | deep_save_v2.py | None | N/A | All | - | - | 整合於 DeepSaveV2 |

## 5. Platform Foundation Matrix

| foundation_area | gap_type | current_status | existing_files | missing_parts | affected_modules | risk_level | priority | recommended_phase | implementation_strategy | blocking_for_parallel_module_development | notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| AuditLog | C. Both | D. Not Started | - | AuditLogMixin, DB Schema | All | High | P0 | Phase 9A | Django Signal 或 Mixin 攔截 Save | Yes | 無軌跡難除錯 |
| DataConstraint DB 化 | A. PB Legacy | B. Partial | data_constraint.py | SY 動態設定表與介面 | All | High | P0 | Phase 9B | 建立 sys_constraint，取代 JSON | Yes | 否則寫死難維護 |
| Field-level Perm. | A. PB Legacy | D. Not Started | - | FieldPermissionMixin | DP, MR, SA | Med | P1 | Phase 9G | 在 Serializer 剔除、前端隱藏 | No | 可由 SY 設定 |
| Report / Excel | C. Both | C. Prototype | ReportModal.jsx | 正式 Template 引擎 | All | High | P0 | Phase 9C | 導入 WeasyPrint / openpyxl 完善 | Yes | 每單都要印 |
| API Regression Test | B. Modern | D. Not Started | - | pytest suite for Mixins | All | High | P0 | Phase 9D | 針對 V2/Approval 等撰寫 Test | Yes | 確保底層不被破壞 |
| Error Code | B. Modern | A. Completed | validation.py | - | All | Low | - | - | 已有標準 ValidationError | No | 已完成 |
| System Parameter | A. PB Legacy | D. Not Started | - | SystemParameterService | All | Med | P1 | Phase 9F | 建 DB 與 Cache 機制 | No | 可邊開發邊補 |
| Posting/Inventory | C. Both | D. Not Started | - | InventoryService | MR, SA, FA | High | P1 | Phase 9H | 封裝成 Service 供 Hook 呼叫 | No | 先設計再邊開發 |
| Celery/Background | B. Modern | D. Not Started | - | Celery/Redis config | All | Low | P2 | Phase 9I | 非同步報表與大量過帳 | No | 可延後 |
| Auth/Duplicate Log | C. Both | D. Not Started | - | Session Middleware | All | Low | P3 | Phase 9J | 判斷 DB Session | No | 可延後 |
| Development Gate | B. Modern | B. Partial | Baseline Report | Adoption Level 規範文件 | All | High | P0 | Phase 9E | CI/CD 檢查、PR Review | Yes | 避免手刻 |
| Frontend Smoke | B. Modern | A. Completed | smoke_test.cjs | 擴充涵蓋新模組 | All | Low | - | - | 將新增的 Sheet 加入 test | No | 持續執行即可 |

## 6. PB Legacy Parity Gap 清單
代表 PB 原本有，但目前尚缺的：
1. 資料權限 (Data Constraint) 之資料庫化與管理畫面。
2. 報表列印之正式樣板引擎。
3. 欄位級權限 (Field-level Permission)。
4. 系統參數 (System Parameter) 之讀寫服務。
5. 防重複登入機制。

## 7. Modern Web ERP Platform Gap 清單
代表現代 Web 應用需要補齊的：
1. 完整的 API 回歸測試 (Regression Test Suite)。
2. Celery / Redis 背景非同步任務機制。
3. Audit Log (更為全面與標準化的異動軌跡)。
4. 統一的過帳與庫存服務層 (Posting/Inventory Service Layer)。
5. 嚴格的新作業準入標準 (Development Gate)。

## 8. 已完整重建的 PB 底層
MDI/Sheet 機制、Toolbar 指令、State Machine、Dirty Tracking、Approval 審核鎖定、Deep Save (多表交易)、F2 Lookup 開窗、Primary Key 產生、Transaction Rollback、Error Handling、Query 面板。

## 9. 部分重建的 PB 底層
Validation (缺 Pattern A)、Data Constraint (尚未 DB 化)、Bill Number (前端取號)、ItemChanged (基本完成，待擴充)、User Permission (無 SY 設定介面)、Report Permission。

## 10. 尚未重建的 PB 底層
Field-level Permission (欄位權限)、System Parameter (系統參數)、Active Session (防重複登入)、Audit Log (異動紀錄)。

## 11. P0 必須先補項目 (阻礙同步開發)
若不先補齊，將導致後續每個模組自行手刻，造成巨大重工：
1. **AuditLog**：所有作業皆需紀錄歷程，若不先掛載 Mixin，後續補回將極度耗時。
2. **DataConstraint DB 化**：權限若不先移入 DB 並建立機制，各模組將充滿 Hardcode 判斷。
3. **Report / Excel Export 標準底層**：單據列印是 ERP 剛需，必須先有標準引擎，才能禁止各模組私自實作。
4. **Backend API Regression Test Suite**：保護 DeepSaveMixinV2 等底層，避免未來多模組開發不慎改壞。
5. **Development Gate 制度**：確立標準以拒絕不符規範（如手刻 API）的作業合併。

## 12. P1 近期要補項目
1. SystemParameterService：供各業務模組讀取。
2. Field-level Permission：供價格等敏感資料防護。
3. Posting / Inventory / Cost Service Layer 設計：提供統一介面供 MR/SA 呼叫。

## 13. 可邊開發邊補項目
1. Posting / Inventory / Cost Service (可先開介面，內容邊開發 MR 邊補實作)。
2. Field-level Permission (可於前端先預留，後端後續加上)。
3. SystemParameterService。

## 14. 可延後項目
1. Celery / Redis Background Job。
2. Duplicate Login / Active Session 控制。
3. 進階報表設計師 (Report Builder UI)。

## 15. 建議 Phase 9 補齊順序
*   **Phase 9A：AuditLogMixin / sys_audit_log**：最高優先，侵入性低，先捕獲所有異動。
*   **Phase 9B：DataConstraint DB 化 / sys_constraint**：影響查詢與儲存的根本權限。
*   **Phase 9C：Report / Excel Export 標準底層**：開發作業時可同步綁定報表。
*   **Phase 9D：Backend API Regression Test Suite**：保護上述成果。
*   **Phase 9E：Development Gate / Framework Adoption Level 制度**：上鎖，開始迎接大量模組。
*   *(以下可邊開發模組邊進行)*
*   **Phase 9F：SystemParameterService / SY004 正式化**
*   **Phase 9G：Field-level Permission / sys_accounts_column**
*   **Phase 9H：Posting / Inventory / Cost Service Layer 設計**
*   **Phase 9I：Celery / Redis Background Job 設計**
*   **Phase 9J：Duplicate Login / Session 管控**

## 16. 必須先做 vs 可邊開發邊補
*   **A. 必須先做，否則不建議大量同步開發**：Phase 9A ~ 9E。這些是基礎防護與標準，若不先做，將產出大量無軌跡、無權限控制、難以測試的 Legacy 作業。
*   **B. 可以先設計，後續邊模組開發邊落地**：Phase 9F ~ 9H。服務層與參數層。
*   **C. 可以延後**：Phase 9I ~ 9J。背景排程與帳號管理。

## 17. MR / SA / SY / FA Development Gate Checklist
每支新作業開發前與 PR 提交時必須檢核：
- [ ] 1. Pattern 是 A / B / R / Custom？
- [ ] 2. 是否需要 DeepSaveMixinV2？ (Pattern B 必須)
- [ ] 3. 是否需要 ValidationMixin？ (含必填與防呆)
- [ ] 4. 是否需要 ApprovalMixin？ (有審核按鈕者)
- [ ] 5. 是否需要 BillNoMixin？ (需取單號者)
- [ ] 6. 是否需要 DataConstraint？ (資料權限隔離)
- [ ] 7. 是否需要 AuditLog？
- [ ] 8. 是否需要 ReportConfig？
- [ ] 9. 是否需要 Excel Export？
- [ ] 10. 是否需要 Field-level Permission？
- [ ] 11. 是否需要 Posting / Inventory / Cost Service？ (異動庫存、成本或過帳)
- [ ] 12. 是否需要 Celery background job？
- [ ] 13. 是否需要 SystemParameter？
- [ ] 14. 是否有 PB legacy_deep_save 行為須轉移？
- [ ] 15. 是否已實作 PB wf_CheckData 邏輯？
- [ ] 16. 是否已對齊 PB wf_SetupCheck / wf_GetCheckCtrl 邏輯？
- [ ] 17. 是否有 PB F2 Lookup / OpenWithParm？已改用 ERPLookupField？
- [ ] 18. 是否有 PB Report / wf_report？已轉至 ReportModal？
- [ ] 19. 是否有特殊 Stored Procedure 需要改寫？
- [ ] 20. 是否有跨表回寫行為？ (需實作於 V2 Hook)
- [ ] 21. 是否有測試案例？ (後端單元測試)
- [ ] 22. 是否加入 smoke test？ (前端 smoke_test.cjs)
- [ ] 23. 是否加入 API regression test？
- [ ] 24. 是否有資料權限欄位？ (如 `maker`, `department`)
- [ ] 25. 是否有欄位權限需求？ (如單價隱藏)
- [ ] 26. 是否有過帳 / 反過帳需求？
- [ ] 27. 是否有庫存異動需求？
- [ ] 28. 是否有成本計算需求？

## 18. Framework Adoption Level 分級
*   **A0：Not Started** (完全沒碰)
*   **A1：Custom UI + Legacy Save** (危險：手刻介面與手刻後端存檔，極易有蟲)
*   **A2：Custom UI + V2 Save** (過渡：DP010, DP025 目前狀態)
*   **A3：Factory UI + V2 Save** (標準：使用 Factory，安全性無虞)
*   **A4：Factory UI + V2 Save + Audit + DataConstraint + Report/Excel + API Test** (完美：符合上線交付標準)
> **規範**：未來 MR/SA/SY/FA 新作業**至少應達到 A3，目標為 A4**，方可視為可交付。嚴禁新增 A1 等級之作業。

## 19. SY Dependency Matrix

| foundation_area | requires_sy_screen | related_pb_table | proposed_react_screen | backend_api_needed | priority | can_module_development_start_before_sy_ready |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| DataConstraint DB | Yes | sys_constraint | SY Data Constraint 設定 | API 供過濾與管理 | P0 | No (需先有 DB，但畫面可稍後) |
| Field-level Perm. | Yes | sys_accounts_column| SY Field Perm 設定 | API 供讀取與設定 | P1 | Yes (可先 Hardcode) |
| System Parameter | Yes | sys_parameter | SY004 參數設定 | API 讀寫與 Cache | P1 | Yes (可先 Hardcode) |
| Report Permission | Yes | sys_reportsetup | SY 報表權限管理 | API 確認權限 | P1 | Yes |
| User/Group Perm. | Yes | sys_accounts/group | SY005, SY015, SY020 | API CRUD 權限 | P0 | Yes (可暫用 Django Admin) |
| Session Policy | Yes | 帳號安全設定 | SY Session Policy | API 強制登出 | P3 | Yes |

## 20. 風險說明
最大風險在於若不執行 Phase 9A~9E 直接投入大量業務模組開發，各模組工程師會因缺乏標準元件而大量複製手刻程式碼，這不僅會產生難以維護的技術債（如同 Phase 8 所清理的 legacy code），且未來要求加入 Audit Log 或資料權限時，將面臨跨模組海量修改的慘況。

## 21. 建議下一階段
啟動 **Phase 9A: AuditLogMixin / sys_audit_log 設計與實作**。這將是基礎建設的最後重要拼圖，為所有資料變更留下可追溯的軌跡。

## 22. 附錄：相關檔案清單
- `/docs/analysis/framework_baseline_freeze_report.md`
- `/docs/analysis/framework_adoption_audit_report.md`
- `/docs/analysis/dp030_final_regression_freeze_report.md`
- `/docs/analysis/framework_phase6b_deepsave_mixin_v2_result.md`
- ...及其他 Framework 相關結果報告。
