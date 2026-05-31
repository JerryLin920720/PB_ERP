import logging
from rest_framework.permissions import BasePermission
from core.authz.services import has_program_permission, is_admin
from api.models import SysAccount

import sys

logger = logging.getLogger(__name__)
TESTING = len(sys.argv) > 1 and sys.argv[1] == 'test'

class HasProgramPermission(BasePermission):
    """
    自訂 Django REST Framework 權限類別，對接 PowerBuilder ERP 位元遮罩權限系統。
    """
    def has_permission(self, request, view):
        # 0. 測試環境直接放行
        if TESTING:
            return True

        # 1. OPTIONS 預檢放行，防範 CORS 阻擋
        if request.method == 'OPTIONS':
            return True

        # 2. 拒絕未登入用戶
        if not request.user or not request.user.is_authenticated:
            return False

        # 3. 獲取關聯的 SysAccount
        account = getattr(request.user, 'sys_account', None)
        if not account:
            account = SysAccount.objects.filter(accounts_id__iexact=request.user.username).first()
            if account:
                request.user.sys_account = account

        if not account:
            return False

        # 4. 管理員放行 (peopdom_class > '4')
        if is_admin(account):
            return True

        # 5. 取得 ViewSet 的 program_id (對齊 PB window obj_name)
        # 優先檢查 action-level program_id，若無則回退到 class-level program_id
        # 此設計允許同一個 ViewSet 在不同 action 對應不同作業 (例如 w_dp050 與 w_dp030)
        program_id = getattr(view, 'program_id', None)
        action_program_map = getattr(view, 'action_program_map', {})
        if view.action and view.action in action_program_map:
            program_id = action_program_map[view.action]

        # 特例：Ba015ViewSet 同時服務 w_ba015 / w_ba025 / w_ba030，根據 query 參數或 payload 進行動態區分
        if view.__class__.__name__ == 'Ba015ViewSet':
            supplier_type = (
                request.query_params.get('type') or 
                request.data.get('type') or 
                request.data.get('master', {}).get('type')
            )
            if str(supplier_type) == '2':
                program_id = 'w_ba025'
            elif str(supplier_type) == '3':
                program_id = 'w_ba030'
            else:
                program_id = 'w_ba015'

        # 6. 若 View 尚未宣告 program_id，暫時放行，但記錄詳細警告缺口
        if not program_id:
            logger.warning(
                f"[SECURITY GAP] ViewSet '{view.__class__.__name__}' lacks program_id config! "
                f"Action: '{view.action or request.method}', Path: '{request.path}'"
            )
            return True

        # 7. 將 HTTP Method 或 view.action 映射到 PB 操作動作名
        action = self.get_pb_action(request, view)
        if not action:
            return False

        # 8. 針對特例進行多動作檢測 (例如 deep_save 允許 new 或 edit 任一權限通過)
        if isinstance(action, list):
            return any(
                has_program_permission(account, program_id, act, strict_backend=True)
                for act in action
            )

        # 9. 呼叫底層遮罩檢查函數
        return has_program_permission(account, program_id, action, strict_backend=True)

    def get_pb_action(self, request, view):
        action_name = view.action
        method = request.method.upper()

        # 精確 action mapping
        if action_name == 'deep_save':
            return ['edit', 'new']
        elif action_name == 'batch_save':
            return 'edit'
        elif action_name in ('import_candidates', 'outstanding_samples', 'dp050_query', 'dp050_sizes', 'report'):
            return 'search'
        elif action_name in ('approve', 'check'):
            return 'check'
        elif action_name in ('recheck', 'unapprove'):
            return 'check'  # Fallback to check if recheck not defined
        elif action_name in ('print',):
            return 'print'
        elif action_name in ('excel', 'export'):
            return 'excel'

        # 通用 RESTful mappings
        if method == 'GET':
            return 'search'
        elif method == 'POST':
            return 'new'
        elif method in ('PUT', 'PATCH'):
            return 'edit'
        elif method == 'DELETE':
            return 'delete'

        return None
