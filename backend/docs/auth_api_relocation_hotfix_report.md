# Auth API Relocation Hotfix Report

## 1. 錯誤原因
在前一階段的搬移作業中，將 `auth_menu` 與 `auth_permissions` 兩個 API 端點自 `dp/views.py` 搬移至 `sys/views.py`。然而，這兩個 API 端點所依賴的核心組裝函式 (`build_menu_tree` 與 `build_permission_map`) 實際存放於 `core/authz/services.py` 且並未一併被引入至 `sys/views.py` 之中，導致在請求該端點時引發 `NameError: name 'build_menu_tree' is not defined` 的執行期錯誤。

## 2. 漏搬的 helper function 清單
- `build_menu_tree`
- `build_permission_map`

## 3. helper 原始位置
原始定義存在於：`core/authz/services.py` 之中。
(而舊有的 `dp/views.py` 當時是利用 `from core.authz.services import build_permission_map, build_menu_tree` 來引用它們。)

## 4. helper 修復後位置
已遵循「原封不動搬移」之規範，將這兩個函式的完整實作（未更改任何邏輯）直接抽離並寫入至：
`api/modules/sys/views.py` (放置於上方)。
同時也同步清除了 `dp/views.py` 中殘留但已無作用的對應 import 語句。

## 5. 補齊的 import 清單
為了讓 `sys/views.py` 中新放入的這兩個函式能夠順利運作，已在其頂部補齊以下依賴：
- `from collections import defaultdict`
- `from core.authz.services import is_admin`
*(註：原本其餘依賴如 `SysMenu`, `SysPopedom` 等，皆已透過 `from api.modules.sys.models import *` 被覆蓋)*

另外，為了維持測試正常運作，也已同步修正 `api/test_authz_permissions.py` 中這兩個函式的匯入路徑（改為由 `api.modules.sys.views` 匯入）。

## 6. 是否改變 URL path / basename
**否**。維持原有的 API Endpoint 註冊行為不變。

## 7. 是否改變 API response 格式
**否**。已沿用最原始的邏輯程式碼，確保 JSON Response 結構完全沒有改變。

## 8. python manage.py check 結果
```
System check identified no issues (0 silenced).
```
無任何執行期錯誤或匯入遺漏。

## 9. makemigrations --check --dry-run 結果
```
No changes detected
```
未改變任何 Schema 結構。

## 10. menu / permissions smoke test 結果
- **未登入狀態測試**：
  - `curl -i http://localhost:8001/api/auth/menu/` => **回傳 HTTP 401 Unauthorized**
  - `curl -i http://localhost:8001/api/auth/permissions/` => **回傳 HTTP 401 Unauthorized**
  *(成功通過框架的 Authentication Check，而非先前錯誤的 HTTP 500 NameError)*
- **已登入狀態測試**：
  - 成功以 Token Authorization 送出 GET 請求。
  - `menu` 端點成功回傳完整的樹狀 JSON `[{"label": "開發部門管理系統", "children": [...]}, ...]`。
  - `permissions` 端點成功回傳完整的各作業對照表 `{"w_dp001": {"search": true, ...}}`。
  - **皆獲得 HTTP 200 OK 狀態碼。**

## 11. 是否發現 circular import
**否**。沒有發現循環依賴的錯誤。
