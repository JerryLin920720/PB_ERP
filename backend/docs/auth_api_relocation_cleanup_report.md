# Auth API Relocation Cleanup Report

## 1. 搬移前 auth API 所在位置
原先 `auth_login`, `auth_logout`, `auth_me`, `auth_users` 等十二支與認證、使用者管理、權限相關的核心 API，因歷史開發遺留因素被錯置於 `api/modules/dp/views.py` (開發部門管理系統模組) 內。

## 2. 搬移後 auth API 所在位置
所有相關的 Auth & Permission API 皆已按照系統架構邊界，被全數轉移至更為合適的系統共用模組視圖中：`api/modules/sys/views.py`。

## 3. 搬移的 function 清單
本次從 `dp/views.py` 抽離並搬遷至 `sys/views.py` 的 API function 包括：
- `auth_login`
- `auth_logout`
- `auth_me`
- `auth_users`
- `auth_user_detail`
- `auth_user_disable`
- `auth_user_enable`
- `auth_groups`
- `auth_group_detail`
- `auth_user_groups`
- `auth_permissions`
- `auth_menu`

*(註：`auth_permission_matrix`、`auth_save_permissions`、`auth_copy_permissions`、`auth_apply_group_permissions` 在前一次任務中已位於 `sys/views.py` 內。)*

## 4. 搬移的 serializer / helper 清單
本次並無移動 `serializers.py`，因為在前置任務中，如 `SysAccountSerializer`、`SysMenuSerializer` 等皆已正確移至 `api/modules/sys/serializers.py` 中。
不過，為了維持 API 功能正常運作，本次將兩個隱藏的 helper 函數同步從 `dp/views.py` 搬移至 `sys/views.py` 內：
- `_get_sys_account`
- `_get_user_info_response`

並將缺少的核心套件 (如 `authenticate`, `Token`, `timezone` 等) 補齊於 `sys/views.py` 頂端。

## 5. api/urls.py import 更新摘要
`api/urls.py` 檔案已更新，原先從 `api.modules.dp.views` 匯入的 `auth_` 系列函式，現已更改為從 `api.modules.sys.views` 匯入。

## 6. 是否改變 URL path / basename
**否**。沒有修改任何的 URL route (path)，對前端的路由掛載仍為原本的 `/api/auth/login/` 等，維持完全不變。

## 7. 是否改變 API 行為
**否**。本次任務完全遵循「只清理 import path 與實體檔案位置，不做商業邏輯重構」之限制。所有的商業與存取行為未發生任何改變。

## 8. python manage.py check 結果
```
System check identified no issues (0 silenced).
```
所有路由載入正常，也通過了針對 `login`, `me` 等 endpoint 的 Smoke Test，能成功收到 405 Method Not Allowed 或 401 Unauthorized 的預期內框架回覆。

## 9. makemigrations --check --dry-run 結果
```
No changes detected
```

## 10. 是否發現 circular import
無。在模組搬遷時皆直接處理至系統核心模組 (`sys`)，未發生 `sys` 需反向依賴 `dp` 或 root `api.views` 的情形，並未產生 Circular import 問題。

## 11. 後續建議
1. **認證中心模組化 (Authz / IAM)**: 目前 `sys/views.py` 承載了從 `SysParameter` 系統參數到 `auth_login` 核心權限。在長期系統擴展考量下，建議未來可成立獨立的 `auth` 或 `iam` 模組，將所有 `auth_` API 與 `sys_` 系統設定分開，進一步落實 Single Responsibility Principle。
2. **Helper 方法整理**: `sys/views.py` 內部目前包含 `_get_user_info_response` 等資料封裝 Helper，後續可考慮將其挪動至 `api/modules/sys/services/user_service.py` 內管理。
