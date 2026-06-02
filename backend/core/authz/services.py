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
    elif act == 'recheck':
        return 'check'
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
        return False

    # 讀取 13 位元遮罩 (PB 為 1-based, Python 為 0-based)
    idx = popedom_index - 1
    
    # 邊界安全檢查：長度不足時安全回傳 False
    if idx < 0 or idx >= len(popedom.prg_popedom):
        logger.warning(
            f"SysPopedom index {popedom_index} out of range for user {account.accounts_id} on {permission_key}"
        )
        return False

    return popedom.prg_popedom[idx] == '1'


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


def build_permission_map(account) -> dict:
    """
    解析使用者的 sys_popedom 遮罩，組裝成各作業按鈕的操作權限 JSON 對照表。
    """
    perm_map = {}
    if not account:
        return perm_map

    # 1. 一次性加載所有權限描述字典與使用者操作權限，以降低 DB 訪問負載
    all_descs = SysPopedomDesc.objects.all()
    user_popedoms = SysPopedom.objects.filter(accounts_id=account.accounts_id, flag='10')

    # 按作業分類 descriptions
    descs_by_obj = defaultdict(list)
    for desc in all_descs:
        descs_by_obj[desc.obj_name].append(desc)

    # 快速檢索使用者遮罩
    popedom_by_obj = {p.obj_name: p.prg_popedom for p in user_popedoms}
    
    is_user_admin = is_admin(account)

    for obj_name, descs in descs_by_obj.items():
        perm_map[obj_name] = {}
        user_bitmask = popedom_by_obj.get(obj_name, "")

        for desc in descs:
            if is_user_admin:
                perm_map[obj_name][desc.popedom_id] = True
            else:
                idx = desc.popedom_index - 1
                if idx >= 0 and idx < len(user_bitmask):
                    perm_map[obj_name][desc.popedom_id] = (user_bitmask[idx] == '1')
                else:
                    perm_map[obj_name][desc.popedom_id] = False
                    
    return perm_map


def build_menu_tree(account) -> list:
    """
    讀取 SysMenu，過濾出該使用者有權限之選單，以樹狀層級結構回傳。
    資料夾底下若無可見子作業，則會自動剪枝 (Pruning)。
    """
    if not account:
        return []

    # 1. 讀取所有選單項目
    menus = SysMenu.objects.all().order_by('prg_serialno')
    is_user_admin = is_admin(account)

    # 2. 獲取非管理員用戶的所有選單可見性標記
    allowed_objs = set()
    if not is_user_admin:
        popedoms = SysPopedom.objects.filter(accounts_id=account.accounts_id, flag='1')
        for p in popedoms:
            if p.prg_popedom and '1' in p.prg_popedom:
                allowed_objs.add(p.obj_name)

    # 3. 建立平鋪對照表
    menu_dict = {}
    roots = []

    for m in menus:
        if not m.prg_code:
            continue
            
        node = {
            "prg_code": m.prg_code,
            "parent_code": m.parent_code,
            "fram_class": m.fram_class,
        }

        if m.fram_class == '1':  # 作業項目 (Leaf Node)
            # 檢查選單權限
            if not is_user_admin and m.obj_name not in allowed_objs:
                continue
            node.update({
                "routeKey": m.prg_code.lower(),
                "programCode": m.prg_code,
                "permissionKey": m.obj_name,
                "label": m.prg_name or m.chinesebigname or m.englishname,
                "path": f"/{m.prg_code.lower()}"
            })
        else:  # 目錄夾 (Folder Node)
            node.update({
                "label": m.prg_name or m.chinesebigname or m.englishname,
                "children": []
            })

        menu_dict[m.prg_code] = node

    # 4. 組裝父子層級關係
    for prg_code, node in list(menu_dict.items()):
        parent_code = node["parent_code"]
        if parent_code and parent_code in menu_dict:
            parent_node = menu_dict[parent_code]
            if "children" in parent_node:
                parent_node["children"].append(node)
        else:
            roots.append(node)

    # 5. 遞迴清空無子節點之資料夾 (剪枝)
    def prune(nodes):
        pruned = []
        for n in nodes:
            if n["fram_class"] == '1':
                # 僅保留向前端公開的格式
                pruned.append({
                    "routeKey": n["routeKey"],
                    "programCode": n["programCode"],
                    "permissionKey": n["permissionKey"],
                    "label": n["label"],
                    "path": n["path"]
                })
            else:
                # 目錄處理
                n["children"] = prune(n["children"])
                if n["children"]:
                    pruned.append({
                        "label": n["label"],
                        "children": n["children"]
                    })
        return pruned

    return prune(roots)


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


def apply_create_audit_fields(data_or_instance, request, model_cls=None):
    from django.utils import timezone
    account = get_current_sys_account(request)
    username = account.accounts_id if account else (request.user.username if request.user and request.user.is_authenticated else 'ADMIN')
    user_gkey = account.gkey if account else 'ADMIN'
    
    es101gkey = get_current_es101gkey(request)
    now = timezone.now()

    audit_values = {
        'es101gkey': es101gkey,
        'createuser': username,
        'creategkey': user_gkey,
        'createdate': now,
        'modifyuser': username,
        'modifygkey': user_gkey,
        'modifydate': now,
        'inputdate': now,
        'modifier': username,
        'modifieddate': now
    }

    if isinstance(data_or_instance, dict):
        for field, val in audit_values.items():
            if model_cls and not model_has_field(model_cls, field):
                continue
            data_or_instance[field] = val
    else:
        for field, val in audit_values.items():
            if model_has_field(data_or_instance, field):
                setattr(data_or_instance, field, val)
    return data_or_instance


def apply_update_audit_fields(data_or_instance, request, model_cls=None):
    from django.utils import timezone
    account = get_current_sys_account(request)
    username = account.accounts_id if account else (request.user.username if request.user and request.user.is_authenticated else 'ADMIN')
    user_gkey = account.gkey if account else 'ADMIN'
    now = timezone.now()

    audit_values = {
        'modifyuser': username,
        'modifygkey': user_gkey,
        'modifydate': now,
        'modifier': username,
        'modifieddate': now
    }

    if isinstance(data_or_instance, dict):
        for field, val in audit_values.items():
            if model_cls and not model_has_field(model_cls, field):
                continue
            data_or_instance[field] = val
    else:
        for field, val in audit_values.items():
            if model_has_field(data_or_instance, field):
                setattr(data_or_instance, field, val)
    return data_or_instance
