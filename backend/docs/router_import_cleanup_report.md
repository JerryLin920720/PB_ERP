# Router Import Cleanup Report

## 1. 修改了哪些檔案
- `api/urls.py`

## 2. 哪些 import 從 api.views 改成 modules 直連
原本在 `api/urls.py` 中使用的 `from . import views`，且隨後以 `views.XXX` 形式呼叫的所有 ViewSet 與 API Function 都已被移除。目前全部改由 `api.modules.<module>.views` 直接匯入。
涵蓋範圍包含：
- **BA 模組**: `Ba001ViewSet` ~ `Ba092ViewSet`, `Ab230ViewSet`, `Ab231ViewSet` 等。
- **DP 模組**: `Dp001ViewSet` ~ `Dp104ViewSet`, 以及所有的 `auth_` API 包含 `auth_login`, `auth_users` 等（這部分維持在目前它所在的 `dp` 模組底下匯入，未做商業邏輯與檔案物理上的挪動）。
- **ES 模組**: `Es101ViewSet` ~ `Es104ViewSet`。
- **MR 模組**: `Mr001ViewSet` ~ `Mr035ViewSet`。
- **SA 模組**: `Sa001ViewSet`, `Sa005ViewSet`, `Sa006ViewSet`, `Sa007ViewSet`。
- **SYS 模組**: `SysAccountViewSet`, `SysMenuViewSet`, `SysPopedomDescViewSet`, `SysMenuColumnViewSet`, `SysParameterViewSet`, `auth_apply_group_permissions`, `auth_copy_permissions`, `auth_permission_matrix`, `auth_save_permissions`。
- **Common 模組**: `system_health`, `dashboard_stats`, `upload_image`。

## 3. 是否保留 root compatibility layer
**是**。本次僅修改 `api/urls.py` 的 import 來源。root `api/views.py`、`api/models.py` 與 `api/serializers.py` 仍保留原狀，繼續作為 Deprecated compatibility layer，提供向後相容能力。

## 4. 是否改變任何 URL path / basename
**否**。沒有修改任何的 URL route (path)、註冊名稱 (basename) 或是掛載的端點邏輯。這僅僅是一次靜態的 Import refactoring。

## 5. python manage.py check 結果
執行 `venv/bin/python manage.py check`：
```
System check identified no issues (0 silenced).
```
伺服器可以順利加載所有的路由，沒有任何異常。

## 6. makemigrations --check --dry-run 結果
執行 `venv/bin/python manage.py makemigrations --check --dry-run`：
```
No changes detected
```
未產生任何 migration。

## 7. 是否發現 circular import
無。因為移除了經過 `api.views` 此聚合層的依賴，轉為直接向指定的模組請求 ViewSet 資源，所以並未引發 Circular Import 錯誤。

## 8. 後續建議
1. **認證相關 API 位置盤點**: 觀察到 `auth_login`、`auth_users` 等核心認證及群組管理 API 目前放置於 `api/modules/dp/views.py` 內。考量其為核心功能，後續建議安排重構任務將其搬移至 `api/modules/sys/views.py` 或獨立的 `auth` 模組中。
2. **移除 Deprecated compatibility layer**: 如果確認前端或是其他微服務沒有直接 import root 的 `api.views` 或 `api.models`，下一步可以考慮直接將 root 的這三個 compatibility files 移除。
