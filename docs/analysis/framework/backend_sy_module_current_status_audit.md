
## SY-0 HasProgramPermission common 化結果

**執行狀態：已完成**
1. `HasProgramPermission` 與 `HasSy005Permission` 皆已從 `core/permissions.py` 成功遷移至 `api/common/permissions/program_permission.py`。
2. 為了向下相容，`core/permissions.py` 被保留並加入 re-export 語法。
3. 全專案的 ViewSet import 路徑皆已自動掃描並替換至新的 common permission。
4. 在未修改登入邏輯、未搬移 SysAccount/SysPopedom 的前提下順利完成。
5. manage.py check 完全通過，無 circular import 問題。
