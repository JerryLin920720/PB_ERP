# ERP Pattern 標準化開發規範 (Pattern Standard Specification)

## 1. Pattern 總表與定義

本規範將系統中的作業根據資料結構與使用者操作行為，統一分類為以下 5 種標準 Pattern：

| Pattern | 名稱與定義 | 適用場景 | 不適用場景 | 代表作業 |
| :--- | :--- | :--- | :--- | :--- |
| **Pattern A** | **單表 CRUD (Config-Driven)**。純網格 (Grid) 顯示與編輯。 | 基礎資料檔、簡單字典檔維護 | 具有關聯明細或長表單需求 | BA001, DP001, MR030 |
| **Pattern A2** | **上列表下編輯 (非 Master-Detail)**。上方點擊列、下方 Form 編輯單檔。 | 欄位數超過 10 個的單檔作業 | 需要多表連動存檔之作業 | DP023, BA002, BA004 |
| **Pattern B** | **Master-Detail 工作台**。標準主從明細，通常為上方 Form 下方 Tabs Grid。 | 交易單據 (訂單、樣品單)、複雜單據 | 純查詢、批次運算 | BA010, BA015, DP030, DP040 |
| **Pattern R** | **查詢 / 報表 / 匯出**。僅有查詢面板與結果 Grid，無寫入。 | 報表查詢、統計作業 | 需要單筆維護之作業 | MR031, SA 系列報表 |
| **Pattern D** | **特殊批次交易 / 聯鎖 Grid / 狀態重算**。多表獨立或跨模組批次異動。 | 月結、過帳、批次審核、大量生成 | 單純單據維護 | MR020 (物料試算), 月結作業 |

---

## 2. Pattern 前後端標準架構

### Pattern A (單表 CRUD)

* **前端組成**：由 `createDictSheet` (Factory) 生成，核心元件為 `Win32DataWindow`。
* **後端組成**：繼承 `BaseDictionaryViewSet` 與 `BulkSaveMixin`。
* **API 規則**：使用 `/bulk_save` 端點，支援批次新增、修改、刪除。
* **權限對應**：`read`, `create`, `update`, `delete`。
* **功能支援**：
  * Deep Save: 不支援 (使用 Bulk Save)。
  * Approval: 視需求支援。
  * Excel/PDF: 支援 (透過 `ReportModal`)。
  * F2 Lookup: 支援 (網格內開窗)。

### Pattern A2 (上列表下編輯)

* **前端組成**：由 `createGridFormSheet` 生成，依賴 `useSingleTableCrud` Hook。
* **後端組成**：標準 DRF `ModelViewSet`，可繼承 `BulkSaveMixin`。
* **API 規則**：標準 REST API (`GET`, `POST`, `PUT/PATCH`, `DELETE`)。
* **權限對應**：同 Pattern A。
* **功能支援**：同 Pattern A。

### Pattern B (Master-Detail 工作台)

* **前端組成**：由 `createRecordWorkbenchSheet` 生成，包含 Master Form 與 Detail Tabs (內嵌 `Win32DataWindow`)。
* **後端組成**：繼承 `DeepSaveMixinV2` 與 `ApprovalMixin`。
* **API 規則**：主要使用 `/deep_save` 端點確保主從原子性存檔。
* **權限對應**：除基礎 CRUD 外，支援 `check`/`uncheck`/`recheck`。
* **功能支援**：
  * Deep Save: 完全支援 (`upsert_delete`, `wipe_and_recreate` 模式)。
  * Approval: 完全支援 (Approve Lock 保護)。
  * Excel/PDF: 完全支援。
  * F2 Lookup: 完全支援 (Cascading Lookup, `returnFields`)。
  * 狀態回灌：支援 (透過 `post_deep_save_hook`)。

### Pattern R (查詢報表)

* **前端組成**：Search Panel + Result Grid，可能搭配 Chart。
* **後端組成**：繼承 `ReadOnlyModelViewSet`，並套用 `DataConstraintFilterBackend`。
* **API 規則**：僅支援 `GET /` 查詢。
* **權限對應**：僅 `read` 與 `export`。
* **功能支援**：不支援寫入操作，但強烈依賴 `ReportMixin` 與 Excel Export。

### Pattern D (特殊批次與聯鎖)

* **前端組成**：高度客製化，通常包含並列的 Grid 或是批次操作介面。
* **後端組成**：客製化 ViewSet 與 API 端點，調用專屬 Service Layer。
* **API 規則**：自定義 Action Endpoint (如 `/batch_process`, `/recalculate`)。
* **功能支援**：依賴強大的 Transaction 與 Service 層的防呆及重算邏輯。

---

## 3. 開發 Checklist

1. [ ] **Pattern 判斷**：確定需求應落入哪種 Pattern，嚴禁將 Pattern B 寫成 Pattern A2。
2. [ ] **防呆配置**：所有驗證規則必須寫在 `validationConfig` 中，前後端共用。
3. [ ] **Factory 優先**：盡可能使用 `createDictSheet` 或 `createRecordWorkbenchSheet`，避免手刻 `useSheetState` 或 `handleSave`。
4. [ ] **API 原子性**：只要涉及主從關聯，強制使用 `DeepSaveMixinV2`，不可拆分 API 呼叫。
5. [ ] **Dirty Tracking**：確保所有可編輯畫面皆掛載了髒點追蹤，防止未儲存跳離。

## 4. 禁止事項 (Anti-Patterns)

1. 🚫 **禁止在前端 Controller 中寫死驗證規則** (如 `if (value === "") alert(...)`)，必須寫入 Config。
2. 🚫 **禁止手刻 `deep_save`**，後端所有複雜存檔必須轉交 `DeepSaveMixinV2` 加上 Hook 處理。
3. 🚫 **禁止在 Pattern B 中逐筆呼叫 Detail API**，必須透過單一 Payload 送至 `/deep_save` 以確保 Transaction 安全。
4. 🚫 **禁止繞過 `Approval Lock`**，開發時不得忽略 `ApprovalMixin` 提供的審核狀態檢核。
