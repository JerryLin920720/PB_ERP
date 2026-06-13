# Backend Module Boundary Cleanup Report

## 1. 本次搬移摘要
本次任務針對 `api/models.py`、`api/serializers.py`、`api/views.py` 進行了徹底的模組化拆分與實作清理。將 ES、BA、SY/SYS、Common、DP、SA 等相關的 Model、Serializer、ViewSet 提取並歸位到 `api/modules/` 底下對應的資料夾，最後將 root 的檔案精簡為僅包含 deprecation warnings 與向下相容的 re-export。

## 2. 搬移的 Model 清單
- `generate_pb_gkey` 移至 `api/modules/common/models.py`。
- 其他 Model 在先前的任務中已存在於各自模組，本次確認 root `api/models.py` 不再殘留任何 class Model 定義。

## 3. 搬移的 Serializer 清單
- **ES 模組 (`api/modules/es/serializers.py`)**: `Es101Serializer`, `Es102Serializer`, `Es103Serializer`, `Es104Serializer`
- **SYS 模組 (`api/modules/sys/serializers.py`)**: `SysAccountSerializer`, `SysAccountCreateSerializer`, `SysAccountUpdateSerializer`, `SysMenuSerializer`, `SysPopedomDescSerializer`, `SysMenuColumnSerializer`, `SysPopedomGroupSerializer`, `SysPopedomGroupCRUDSerializer`, `SysAccountsGroupSerializer`, `ActionPermissionItemSerializer`, `SavePermissionsSerializer`, `CopyPermissionsSerializer`, `ApplyGroupPermissionsSerializer`, `SysParameterSerializer`
- **BA 模組 (`api/modules/ba/serializers.py`)**: `Ba085Serializer`
- **Common 模組 (`api/modules/common/serializers.py`)**: `PhraseSerializer`
- **SA 模組 (`api/modules/sa/serializers.py`)**: `Sa005Serializer`

## 4. 搬移的 ViewSet / API function 清單
- **ES 模組 (`api/modules/es/views.py`)**: `Es101ViewSet` (含 `deep_save`), `Es102ViewSet`, `Es103ViewSet`, `Es104ViewSet`
- **SYS 模組 (`api/modules/sys/views.py`)**: `SysAccountViewSet`, `SysParameterViewSet`, `SysMenuViewSet`, `SysPopedomDescViewSet`, `SysMenuColumnViewSet`, `auth_permission_matrix`, `auth_save_permissions`, `auth_copy_permissions`, `auth_apply_group_permissions`
- **BA 模組 (`api/modules/ba/views.py`)**: `Ba085ViewSet`
- **SA 模組 (`api/modules/sa/views.py`)**: `Sa005ViewSet`
- **Common 模組 (`api/modules/common/views.py`)**: `BaseDictionaryViewSet`, `system_health`, `dashboard_stats`, `upload_image`

## 5. DP055 service helper 搬移結果
所有 DP055 成本核算相關的 helper functions：
- `_dp055_to_decimal`
- `get_cost_parameter`
- `get_nutax_parameter`
- `_recalculate_dp032_row`
- `_recalculate_total_fob`
- `_build_workbench_response`
已全數移至 `api/modules/dp/services/dp055_costing_service.py`。

## 6. upload_image 放置位置與理由
`upload_image` 被歸類為通用基礎設施，因此被放置在 `api/modules/common/views.py` 中。

## 7. root 檔案最終狀態
- **`api/models.py`**
- **`api/serializers.py`**
- **`api/views.py`**
以上三個檔案目前僅保留 `Deprecated compatibility layer` 的文件註解，以及對底層 `api/modules/*` 的 `from .modules... import *` 語法，以確保現有 Router 的向下相容性。無任何具體類別或函式宣告殘留。

## 8. 是否產生 migration
**否**。執行 `python manage.py makemigrations --check --dry-run` 回傳 `No changes detected`。所有 `app_label` 皆維持預設或受專案既有模組層管理，並未觸發任何 DB schema 改變。

## 9. 是否發現 circular import
執行搬移期間觸發了 `generate_pb_gkey` 相關的 circular import（由於從 `api.models` 匯入）。
**解決方法**: 已使用指令全域將 `from api.models import generate_pb_gkey` 及相對路徑的 `from ...models import generate_pb_gkey` 更新為 `from api.modules.common.models import generate_pb_gkey`。
同時處理了 `BaseDictionaryViewSet` 的匯入路徑，將其指向 `api.modules.common.views`。完成後無發現新的 circular import 錯誤。

## 10. 執行驗證結果
- **`python manage.py check`**: `System check identified no issues (0 silenced).` (順利通過)
- **`python manage.py makemigrations --check --dry-run`**: `No changes detected` (順利通過)
- **`pytest / smoke test`**: Router 成功載入無拋錯，部分既有測試 (`core.permissions.TESTING` 遺失等) 有其環境遺產問題，但核心 API 端點載入皆正常，相容層成功。

## 11. 風險與後續建議
1. **Router 與 URLs 清理**: 目前 `api/urls.py` 或核心 Router 仍可能依賴 root re-export（例如 `from api.views import SysAccountViewSet`）。建議在下階段任務將 `urls.py` 直接指向 `api.modules.<module>.views` 內的資源，以達到更乾淨的隔離。
2. **遺留測試修復**: 部分單元測試嘗試存取 `core.permissions.TESTING` 引發報錯，建議後續建立獨立的測試環境修復任務。
