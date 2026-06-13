import logging
from collections import defaultdict
from api.models import SysAccount, SysMenu, SysPopedom, SysPopedomDesc, SysAccountsActive

logger = logging.getLogger(__name__)


def normalize_action(action: str) -> str:
    """
    PB 權限回退映射邏輯 (PB Fallback Rules)
    """
    if not action:
        return ""
    
    act = action.lower()
    
    if act in ('inquire', 'query'):
        return 'search'
    elif act in ('append', 'insert', 'cut', 'undo', 'cross'):
        return 'edit'
    elif act == 'prints':
        return 'print'
    elif act == 'xcopy':
        return 'new'
    
    return act


def is_admin(account) -> bool:
    """
    判斷帳號是否為管理員層級 (peopdom_class > '4')
    包含安全字串轉整數防呆。
    """
    if not account:
        return False
    
    # 預防 peopdom_class 為 None 或其他物件
    val = account.peopdom_class
    if not val:
        return False
        
    try:
        return int(val) > 4
    except (ValueError, TypeError):
        # 備用字串比較防呆
        return str(val) in ('5', '9', 'admin', 'developer')


def get_permission_index(permission_key, action):
    """
    取得作業動作在 13 位元遮罩中的 1-based 索引位置。
    """
    if not permission_key or not action:
        return None

    # 1. 嘗試直接精確查詢
    desc = SysPopedomDesc.objects.filter(obj_name=permission_key, popedom_id=action).first()
    if desc:
        return desc.popedom_index

    # 2. 針對 insertrow / deleterow 執行優先順序回退
    if action == 'insertrow':
        desc = SysPopedomDesc.objects.filter(obj_name=permission_key, popedom_id='new').first()
        if desc:
            return desc.popedom_index
        desc = SysPopedomDesc.objects.filter(obj_name=permission_key, popedom_id='edit').first()
        if desc:
            return desc.popedom_index
    elif action == 'deleterow':
        desc = SysPopedomDesc.objects.filter(obj_name=permission_key, popedom_id='delete').first()
        if desc:
            return desc.popedom_index
        desc = SysPopedomDesc.objects.filter(obj_name=permission_key, popedom_id='edit').first()
        if desc:
            return desc.popedom_index

    # 3. 嘗試標準 fallback 後查詢
    norm_act = normalize_action(action)
    if norm_act != action:
        desc = SysPopedomDesc.objects.filter(obj_name=permission_key, popedom_id=norm_act).first()
        if desc:
            return desc.popedom_index

    return None


def has_program_permission(account, permission_key, action, *, strict_backend=False) -> bool:
    """
    檢查使用者是否具有特定程式作業的特定操作權限 (flag='10')。
    """
    if not account:
        return False

    # 管理員直接放行
    if is_admin(account):
        return True

    # 查詢動作索引
    popedom_index = get_permission_index(permission_key, action)
    
    # 若找不到該動作註冊資訊
    if popedom_index is None:
        if strict_backend:
            return False
        # 非嚴格模式下，若是標準瀏覽操作 (如 search/query) 預設放行，其餘回歸 False
        return action.lower() in ('search', 'query', 'inquire', 'true')

    # 查詢使用者的該作業權限遮罩
    popedom = SysPopedom.objects.filter(
        accounts_id=account.accounts_id,
        obj_name=permission_key,
        flag='10'
    ).first()

    if not popedom or not popedom.prg_popedom:
        print(f"DEBUG: No popedom found for {account.accounts_id} on {permission_key}")
        return False

    # 讀取 13 位元遮罩 (PB 為 1-based, Python 為 0-based)
    idx = popedom_index - 1
    
    # 邊界安全檢查：長度不足時安全回傳 False
    if idx < 0 or idx >= len(popedom.prg_popedom):
        logger.warning(
            f"SysPopedom index {popedom_index} out of range for user {account.accounts_id} on {permission_key}"
        )
        return False
        
    result = popedom.prg_popedom[idx] == 'Y'
    print(f"DEBUG: has_program_permission {account.accounts_id} {permission_key} {action} -> {result} (idx={idx}, char={popedom.prg_popedom[idx]})")
    return result


def has_menu_permission(account, permission_key) -> bool:
    """
    檢查使用者是否具有特定程式作業的選單可見性權限 (flag='1')。
    """
    if not account:
        return False

    if is_admin(account):
        return True

    popedom = SysPopedom.objects.filter(
        accounts_id=account.accounts_id,
        obj_name=permission_key,
        flag='1'
    ).first()

    if not popedom or not popedom.prg_popedom:
        return False

    # 只要 13 位元中任何一位有 '1' 即可顯示選單
    return '1' in popedom.prg_popedom


def model_has_field(model_or_instance, field_name) -> bool:
    if not model_or_instance:
        return False
    opts = getattr(model_or_instance, '_meta', None)
    if not opts:
        return False
    try:
        opts.get_field(field_name)
        return True
    except Exception:
        return False


def get_current_sys_account(request):
    if not request.user or not request.user.is_authenticated:
        return None
    account = getattr(request.user, 'sys_account', None)
    if not account:
        account = SysAccount.objects.filter(accounts_id__iexact=request.user.username).first()
        if account:
            request.user.sys_account = account
    return account


def get_current_es101(request):
    account = get_current_sys_account(request)
    if not account or not account.user_id:
        return None
    from api.models import Es101
    return Es101.objects.filter(gkey=account.user_id).first()


def get_current_es101gkey(request):
    from django.conf import settings
    from rest_framework.exceptions import PermissionDenied

    if not request.user or not request.user.is_authenticated:
        if getattr(settings, 'DEBUG', False):
            dev_fallback = getattr(settings, 'DEFAULT_DEV_ES101GKEY', None)
            if dev_fallback:
                # TODO: Dev environment fallback to DEFAULT_DEV_ES101GKEY when user is not authenticated.
                return dev_fallback
        raise PermissionDenied("使用者未登入，無法取得 es101gkey。")

    # 1. 優先使用 request.user.sys_account.user_id
    sys_account = getattr(request.user, 'sys_account', None)
    if sys_account and getattr(sys_account, 'user_id', None):
        return sys_account.user_id

    # 2. 若沒有 sys_account，使用 request.user.username 查 SysAccount.accounts_id
    account = SysAccount.objects.filter(accounts_id__iexact=request.user.username).first()
    if account:
        request.user.sys_account = account
        if account.user_id:
            return account.user_id

    # 3. 只有在 settings.DEBUG=True 且明確設定 DEFAULT_DEV_ES101GKEY 時，才允許 temporary fallback
    if getattr(settings, 'DEBUG', False):
        dev_fallback = getattr(settings, 'DEFAULT_DEV_ES101GKEY', None)
        if dev_fallback:
            # TODO: Dev environment fallback to DEFAULT_DEV_ES101GKEY.
            # In production, this fallback is disallowed.
            return dev_fallback

    # 4. 若找不到 es101gkey，應回傳明確錯誤，不要靜默補 ADMIN
    raise PermissionDenied("無法為當前使用者帳號找到對應的員工資訊 (es101gkey)。請聯繫系統管理員。")


