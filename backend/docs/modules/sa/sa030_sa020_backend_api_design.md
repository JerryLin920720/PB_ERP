# Legacy Analysis Phase 2A-D：SA030 / SA020 Backend API 設計分析

## 一、分析摘要

本次分析針對鞋貿 ERP 中最核心的業務模組訂單（SA030 P/O 單、SA020 預告單）進行後端架構分析。
分析確認這兩支作業背後共享同一套資料庫結構 (`sa030` ~ `sa035`)，且資料結構為複雜的三層巢狀 (Master -> Detail -> Sub-Detail) 再加上 Master 延伸欄位與附屬明細。
PB 端的儲存邏輯不僅包含本機資料表的存檔，還帶有複雜的跨模組副作用（連動更新 DP 開發模組的 `adopted` 狀態，以及動態新增 QC 品保模組的檢驗資料）。

## 二、SA020 / SA030 後端定位

* **SA030 (P/O訂單)**：業務接單的核心起點。狀態通常為 `1` (進行中) 至 `5` (結案)。
* **SA020 (預告訂單)**：預先輸入的訂單，用來進行初期材料準備。狀態為 `0` (預告)。
* **後端共用性**：兩者高度同源。從資料庫層面來看，僅是 `sa030.status` 的區別。強烈建議在後端建立共用的 Service 層，並透過不同的 ViewSet 進行權限與預設值控制。

## 三、現有 Backend 狀態 (分析結果)

經檢視 `pb_erp_system/backend/api/modules/sa/` 目錄：
* ✅ `models.py` 已建立基礎字典表 (`Sa005`, `Sa006`, `Sa007`)。
* ❌ `sa030` ~ `sa035` 的 Models 尚未建立。
* ❌ 相關的 Serializers 與 ViewSets 尚未建立。
* ✅ 共用基礎架構中，已存在 `DeepSaveMixinV2` (在 `api/common/mixins/deep_save_v2.py`)，支援 Pattern B 標準深層儲存，但預設未涵蓋 Sub-Detail (多層巢狀) 解析。

## 四、資料表關聯圖 (Text ERD)

```text
sa030 (Master 主檔)
 │  -- 包含 Master Extensions: Mark, Memo, SayTotal, Pack, Bank (皆為 sa030 欄位)
 │
 ├─ sa031 (Detail: 型體/顏色)
 │   │  [FK: sa030gkey]
 │   │
 │   ├─ sa032 (Sub-Detail: 尺碼與價格)
 │   │   [FK: sa031gkey, sa030gkey]
 │   │
 │   └─ sa033 (Sub-Detail: 裝箱與尺碼網格)
 │       [FK: sa032gkey, sa031gkey, sa030gkey]
 │       -- 包含 size1~16, pairs1~16
 │
 ├─ sa034 (Detail: 配件明細)
 │   [FK: sa030gkey]
 │
 └─ sa035 (Detail: 加扣款明細)
     [FK: sa030gkey]
```

**關聯分析結論：**
1. `sa032` 是掛在 `sa031` 底下。
2. `sa033` 是掛在 `sa032` / `sa031` 底下。
3. `sa034` 與 `sa035` 是直接掛在 `sa030` 主檔下。
4. 主檔延伸的 Tab 實際都是寫回 `sa030`。

## 五、Model 建立建議

每張表皆需包含 `gkey` UUID 主鍵與基礎 Audit 欄位。

* **Sa030 (訂單主檔)**：需包含 P/O No, 代理商, 交易條件等，並將 Mark/Memo 等長文字欄位整合在一起。狀態 `status` 將決定是預告單或正式單。
* **Sa031 (訂單型體明細)**：存放 `styleno`, `color`, `dp010_lastno`, `dp015_bottomno` 等基礎鞋型結構。需具備 `sa030gkey` 作為 FK。
* **Sa032 (訂單尺碼價格)**：存放 `sizerun`, `price`, `pairs`。
* **Sa033 (訂單裝箱尺碼網格)**：極端寬扁平表，必須明確宣告 `size1` ~ `size16` 與 `pairs1` ~ `pairs16`，並依賴 `assortment` 欄位決定混裝邏輯。
* **Sa034 / Sa035**：訂單附屬的配件與費用明細，關聯回 `sa030gkey`。

## 六、Serializer 設計建議

由於資料結構極其龐大，強烈建議不要寫一個全能的 Nested Serializer，而是：
1. **List/Retrieve Serializer**：供前端 `OrderWorkbench` 讀取，巢狀展開 `sa031` 並帶出 `sa032`。
2. **DeepSave 專用 Serializers**：採用扁平的 Master Serializer 與各個 Detail Serializers，交由 `DeepSaveMixinV2` 與客製化 Service 進行組裝，避免 DRF Nested Writable Serializer 難以處理的效能與驗證瓶頸。

## 七、ViewSet endpoint 建議

**建議採用「方案 B：SA020 / SA030 各自 ViewSet，但共用 Service」**

```python
# URLs
router.register(r'sa020', Sa020ViewSet, basename='sa020')
router.register(r'sa030', Sa030ViewSet, basename='sa030')

# ViewSets
class Sa030ViewSet(...):
    program_id = 'w_sa030'
    
    @action(detail=False, methods=['post'])
    def deep_save(self, request):
        return SaOrderDeepSaveService.save(request, order_type="po", program_id=self.program_id)

class Sa020ViewSet(...):
    program_id = 'w_sa020'
    
    @action(detail=False, methods=['post'])
    def deep_save(self, request):
        return SaOrderDeepSaveService.save(request, order_type="forecast", program_id=self.program_id)
```
**優點**：前端呼叫直覺、權限管控 (HasProgramPermission) 完美相容、底層邏輯 100% 共用、後續若 SA020 需擴充特殊邏輯，也方便在 Controller 層抽離。

## 八、權限與狀態控制設計

1. **模組級權限**：必須透過 `program_id` 結合 `HasProgramPermission` 檢查 `new` / `edit` / `delete` / `print` / `approve`。
2. **審核鎖定 (Approve Lock)**：若 `sa030.approve = 'Y'`，禁止任何形式的 `edit` 或 `delete` 操作（除非該帳號擁有超級權限或走反審核流程）。
3. **出貨鎖定 (Outpairs Lock)**：若 `sa033` 的尺碼有對應的 `outpairs > 0`，該尺碼與數量的 Input Box 必須鎖定唯讀，後端存檔時也需強制檢查，避免修改已出貨的雙數。

## 九、風險與待確認事項

1. **Sub-Detail 效能與併發更新**：一張大訂單可能包含幾十個顏色，每個顏色包含十多個尺碼，一次 DeepSave 的 Payload 可能高達數 MB。
2. **QC 同步的 Transaction 範圍**：PB 舊邏輯是在 `w_sa030` 存檔時，自動刪除重建對應的 `qc030`/`qc031`。是否要在第一階段實作，或改以非同步 Event 處理？（建議第一階段先維持同 Transaction 同步處理，確保資料強一致性）。
3. **DP Adopted 邏輯精確度**：PB 邏輯為「刪除或修改時，檢查該楦頭/大底是否還被其他 status!=0 的訂單使用，若無則改回 adopted='N'」。此邏輯在龐大訂單併發時可能會引發死鎖，需在後端 Service 層謹慎處理 ORM 鎖。
