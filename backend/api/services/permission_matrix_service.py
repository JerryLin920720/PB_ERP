import logging
from rest_framework import serializers
from django.db import transaction
from api.models import SysPopedom, SysPopedomDesc, SysAccountsGroup, SysAccount, SysPopedomGroup, SysMenu

logger = logging.getLogger(__name__)

class PermissionMatrixService:

    @staticmethod
    def normalize_mask(mask: str) -> str:
        """
        將 None / 空字串 / 短字串補成 20 位。
        超過 20 位則截斷。非 0/1 字元應視為 '0'。
        """
        if not mask:
            return "00000000000000000000"
        mask_str = str(mask)
        if len(mask_str) < 20:
            mask_str = mask_str + "0" * (20 - len(mask_str))
        elif len(mask_str) > 20:
            mask_str = mask_str[:20]
        
        normalized = []
        for char in mask_str:
            if char in ('0', '1'):
                normalized.append(char)
            else:
                normalized.append('0')
        return "".join(normalized)

    @staticmethod
    def empty_mask() -> str:
        return "00000000000000000000"

    @staticmethod
    def build_mask_from_actions(obj_name: str, hisystem: str, actions: dict) -> str:
        """
        從 sys_popedom_desc 查詢該 obj_name 的所有 action 與 popedom_index，
        並根據 actions dict 組成 20-bit mask。
        不接受未在 sys_popedom_desc 註冊的 action (記錄警告並忽略)。
        popedom_index 必須在 1~13，若資料異常要回傳 validation error。
        """
        if not actions:
            actions = {}
        mask_list = list(PermissionMatrixService.empty_mask())
        descs = SysPopedomDesc.objects.filter(obj_name=obj_name, hisystem=hisystem)
        
        for desc in descs:
            idx = desc.popedom_index - 1
            if idx < 0 or idx >= 13:
                raise serializers.ValidationError({"detail": "權限遮罩索引必須在 1 到 13 之間。"})
            
            action_id = desc.popedom_id
            if actions.get(action_id) is True:
                mask_list[idx] = '1'

        # 對於未註冊的 actions 忽略並記錄警告
        registered_action_ids = {desc.popedom_id for desc in descs}
        for act_id in actions.keys():
            if act_id not in registered_action_ids:
                logger.warning(f"Action '{act_id}' for obj_name '{obj_name}' is not registered in sys_popedom_desc.")

        return "".join(mask_list)

    @staticmethod
    def decode_mask_to_actions(obj_name: str, hisystem: str, mask: str) -> dict:
        """
        從 sys_popedom_desc 讀取 action 清單，依 popedom_index 將 mask 解成 checkbox 狀態。
        """
        normalized_mask = PermissionMatrixService.normalize_mask(mask)
        descs = SysPopedomDesc.objects.filter(obj_name=obj_name, hisystem=hisystem)
        actions_dict = {}
        for desc in descs:
            idx = desc.popedom_index - 1
            if 0 <= idx < 20:
                actions_dict[desc.popedom_id] = (normalized_mask[idx] == '1')
        return actions_dict

    @staticmethod
    def or_masks(mask_list: list) -> str:
        """
        多個 20-bit mask 做 bitwise OR 聯集。
        """
        merged = list(PermissionMatrixService.empty_mask())
        for mask in mask_list:
            normalized = PermissionMatrixService.normalize_mask(mask)
            for idx in range(20):
                if normalized[idx] == '1':
                    merged[idx] = '1'
        return "".join(merged)

    @staticmethod
    def get_flags(is_group: bool):
        """
        取得對應的 menu flag 與 action flag。
        """
        if is_group:
            return '2', '20'
        else:
            return '1', '10'

    @staticmethod
    def validate_target(target_id: str, is_group: bool, hisystem: str):
        """
        驗證使用者或群組 target 存在性。
        """
        if not is_group:
            if not SysAccount.objects.filter(accounts_id=target_id).exists():
                raise serializers.ValidationError({"target_id": f"使用者帳號 '{target_id}' 不存在。"})
        else:
            if not SysPopedomGroup.objects.filter(group_code=target_id).exists():
                raise serializers.ValidationError({"target_id": f"權限群組 '{target_id}' 不存在。"})

    @staticmethod
    def save_permissions(target_id: str, is_group: bool, hisystem: str, permissions: list):
        """
        批次儲存選單可見性與按鈕操作權限。
        """
        PermissionMatrixService.validate_target(target_id, is_group, hisystem)
        menu_flag, action_flag = PermissionMatrixService.get_flags(is_group)

        with transaction.atomic():
            for perm in permissions:
                obj_name = perm.get('obj_name')
                if not obj_name:
                    continue
                menu_visible = perm.get('menu_visible', False)
                actions = perm.get('actions', {})

                # 1. 儲存選單可見性 (flag='1' or '2')
                menu_val = '1' if menu_visible else '2'
                SysPopedom.objects.update_or_create(
                    accounts_id=target_id,
                    obj_name=obj_name,
                    flag=menu_flag,
                    hisystem=hisystem,
                    defaults={'prg_popedom': menu_val}
                )

                # 2. 儲存操作權限遮罩 (flag='10' or '20')
                if not menu_visible:
                    # 當 menu_visible=false，操作權限 bitmask 寫入 '00000000000000000000'，不刪除該操作權限紀錄
                    mask_val = PermissionMatrixService.empty_mask()
                else:
                    mask_val = PermissionMatrixService.build_mask_from_actions(obj_name, hisystem, actions)

                SysPopedom.objects.update_or_create(
                    accounts_id=target_id,
                    obj_name=obj_name,
                    flag=action_flag,
                    hisystem=hisystem,
                    defaults={'prg_popedom': mask_val}
                )

    @staticmethod
    def copy_permissions(source_id: str, is_source_group: bool, target_id: str, is_target_group: bool, hisystem: str):
        """
        克隆複製來源的權限設定到目標，支援 flag 自動轉換。
        """
        PermissionMatrixService.validate_target(source_id, is_source_group, hisystem)
        PermissionMatrixService.validate_target(target_id, is_target_group, hisystem)

        s_menu_flag, s_action_flag = PermissionMatrixService.get_flags(is_source_group)
        t_menu_flag, t_action_flag = PermissionMatrixService.get_flags(is_target_group)

        with transaction.atomic():
            # 刪除目標在該系統已有的權限記錄
            SysPopedom.objects.filter(
                accounts_id=target_id,
                hisystem=hisystem,
                flag__in=[t_menu_flag, t_action_flag]
            ).delete()

            # 查詢來源權限記錄
            src_records = SysPopedom.objects.filter(
                accounts_id=source_id,
                hisystem=hisystem,
                flag__in=[s_menu_flag, s_action_flag]
            )

            # 複製並寫入目標，轉換 flag
            for src in src_records:
                target_flag = t_menu_flag if src.flag == s_menu_flag else t_action_flag
                SysPopedom.objects.create(
                    accounts_id=target_id,
                    obj_name=src.obj_name,
                    flag=target_flag,
                    hisystem=hisystem,
                    prg_popedom=src.prg_popedom
                )

    @staticmethod
    def apply_group_permissions(accounts_id: str, hisystem: str):
        """
        將使用者所屬群組的權限進行 OR 聯集後，寫入到該使用者自己的權限記錄 (flag='1'/'10')。
        若使用者無群組，回傳 validation error 且不清空既有 user 權限。
        """
        if not SysAccount.objects.filter(accounts_id=accounts_id).exists():
            raise serializers.ValidationError({"accounts_id": f"使用者帳號 '{accounts_id}' 不存在。"})

        with transaction.atomic():
            # 1. 查詢使用者指派的所有群組
            groups = SysAccountsGroup.objects.filter(accounts_id=accounts_id, hisystem=hisystem)
            if not groups.exists():
                raise serializers.ValidationError({"detail": "該使用者未指派任何群組權限。"})

            group_codes = list(groups.values_list('group_code', flat=True))

            # 2. 查詢這些群組的權限 (flag='2' or '20')
            group_popedoms = SysPopedom.objects.filter(
                accounts_id__in=group_codes,
                hisystem=hisystem,
                flag__in=['2', '20']
            )

            # 依 obj_name 分組整理
            menu_vis_by_obj = {}
            action_masks_by_obj = {}

            for gp in group_popedoms:
                obj_name = gp.obj_name
                if gp.flag == '2':
                    if obj_name not in menu_vis_by_obj:
                        menu_vis_by_obj[obj_name] = []
                    menu_vis_by_obj[obj_name].append(gp.prg_popedom)
                elif gp.flag == '20':
                    if obj_name not in action_masks_by_obj:
                        action_masks_by_obj[obj_name] = []
                    action_masks_by_obj[obj_name].append(gp.prg_popedom)

            # 3. 刪除使用者原本在該系統的個人權限記錄 (flag='1' and '10')
            SysPopedom.objects.filter(
                accounts_id=accounts_id,
                hisystem=hisystem,
                flag__in=['1', '10']
            ).delete()

            # 4. 合併選單可見性 (flag='1')
            for obj_name, vis_list in menu_vis_by_obj.items():
                final_vis = '1' if '1' in vis_list else '2'
                SysPopedom.objects.create(
                    accounts_id=accounts_id,
                    obj_name=obj_name,
                    flag='1',
                    hisystem=hisystem,
                    prg_popedom=final_vis
                )

            # 5. 合併操作權限遮罩 (flag='10')
            for obj_name, mask_list in action_masks_by_obj.items():
                final_mask = PermissionMatrixService.or_masks(mask_list)
                SysPopedom.objects.create(
                    accounts_id=accounts_id,
                    obj_name=obj_name,
                    flag='10',
                    hisystem=hisystem,
                    prg_popedom=final_mask
                )

    @staticmethod
    def get_permission_matrix(target_id: str, is_group: bool, hisystem: str) -> dict:
        """
        供前端 Matrix 讀取的選單權限矩陣結構。
        """
        PermissionMatrixService.validate_target(target_id, is_group, hisystem)
        menu_flag, action_flag = PermissionMatrixService.get_flags(is_group)

        # 1. 取得全部選單
        menus = SysMenu.objects.all().order_by('prg_serialno')

        # 2. 取得目標對象現有權限設定
        menu_perms = {p.obj_name: p.prg_popedom for p in SysPopedom.objects.filter(accounts_id=target_id, hisystem=hisystem, flag=menu_flag)}
        action_perms = {p.obj_name: p.prg_popedom for p in SysPopedom.objects.filter(accounts_id=target_id, hisystem=hisystem, flag=action_flag)}

        # 3. 取得系統動作描述
        descs = SysPopedomDesc.objects.filter(hisystem=hisystem).order_by('popedom_index')
        descs_by_obj = {}
        for d in descs:
            if d.obj_name not in descs_by_obj:
                descs_by_obj[d.obj_name] = []
            descs_by_obj[d.obj_name].append(d)

        # 4. 組裝資料
        menu_list = []
        for m in menus:
            obj_name = m.obj_name or ""
            fram_class = m.fram_class

            menu_visible = False
            actions_dict = {}
            action_defs = []

            if obj_name:
                # 判斷選單是否可見
                prg_pop = menu_perms.get(obj_name)
                if prg_pop == '1':
                    menu_visible = True
                elif prg_pop == '2':
                    menu_visible = False
                else:
                    menu_visible = False

                # 動作說明定義
                obj_descs = descs_by_obj.get(obj_name, [])
                for d in obj_descs:
                    action_defs.append({
                        "popedom_id": d.popedom_id,
                        "popedom_desc": d.popedom_desc,
                        "popedom_index": d.popedom_index
                    })

                # 解碼 Actions
                mask = action_perms.get(obj_name, PermissionMatrixService.empty_mask())
                actions_dict = PermissionMatrixService.decode_mask_to_actions(obj_name, hisystem, mask)

            menu_list.append({
                "prg_code": m.prg_code,
                "parent_code": m.parent_code,
                "prg_name": m.prg_name,
                "obj_name": obj_name,
                "fram_class": fram_class,
                "menu_visible": menu_visible,
                "actions": actions_dict,
                "action_defs": action_defs
            })

        return {
            "target_id": target_id,
            "is_group": is_group,
            "hisystem": hisystem,
            "menus": menu_list
        }

    @staticmethod
    def remove_group_permissions_from_user(accounts_id: str, group_code: str, hisystem: str):
        """
        從使用者中扣除指定群組的權限。
        其他群組仍享有的權限以及使用者個人手動設定之權限絕對不可被誤扣除。
        """
        user_perms = SysPopedom.objects.filter(accounts_id=accounts_id, hisystem=hisystem, flag__in=['1', '10'])
        removed_group_perms = SysPopedom.objects.filter(accounts_id=group_code, hisystem=hisystem, flag__in=['2', '20'])
        
        remaining_groups = SysAccountsGroup.objects.filter(accounts_id=accounts_id, hisystem=hisystem).exclude(group_code=group_code)
        remaining_group_codes = list(remaining_groups.values_list('group_code', flat=True))
        remaining_group_perms = SysPopedom.objects.filter(accounts_id__in=remaining_group_codes, hisystem=hisystem, flag__in=['2', '20'])
        
        user_menu = {p.obj_name: p.prg_popedom for p in user_perms if p.flag == '1'}
        user_action = {p.obj_name: p.prg_popedom for p in user_perms if p.flag == '10'}
        
        removed_menu = {p.obj_name: p.prg_popedom for p in removed_group_perms if p.flag == '2'}
        removed_action = {p.obj_name: p.prg_popedom for p in removed_group_perms if p.flag == '20'}
        
        rem_menu_lists = {}
        rem_action_lists = {}
        for gp in remaining_group_perms:
            obj = gp.obj_name
            if gp.flag == '2':
                rem_menu_lists.setdefault(obj, []).append(gp.prg_popedom)
            elif gp.flag == '20':
                rem_action_lists.setdefault(obj, []).append(gp.prg_popedom)
                
        rem_menu = {obj: ('1' if '1' in v else '2') for obj, v in rem_menu_lists.items()}
        rem_action = {obj: PermissionMatrixService.or_masks(v) for obj, v in rem_action_lists.items()}
        
        all_objs = set(user_menu.keys()) | set(user_action.keys()) | set(removed_menu.keys()) | set(removed_action.keys())
        
        with transaction.atomic():
            for obj in all_objs:
                # flag='10' actions
                u_act = user_action.get(obj)
                g_rem_act = rem_action.get(obj, PermissionMatrixService.empty_mask())
                g_rem_list = rem_action_lists.get(obj, [])
                g_removed_act = removed_action.get(obj, PermissionMatrixService.empty_mask())
                
                if u_act:
                    g_all_list = g_rem_list + [g_removed_act]
                    g_all_act = PermissionMatrixService.or_masks(g_all_list)
                    
                    u_norm = PermissionMatrixService.normalize_mask(u_act)
                    g_all_norm = PermissionMatrixService.normalize_mask(g_all_act)
                    g_rem_norm = PermissionMatrixService.normalize_mask(g_rem_act)
                    
                    u_manual = []
                    for idx in range(20):
                        if u_norm[idx] == '1' and g_all_norm[idx] == '0':
                            u_manual.append('1')
                        else:
                            u_manual.append('0')
                    u_manual = "".join(u_manual)
                    
                    new_act = []
                    for idx in range(20):
                        if g_rem_norm[idx] == '1' or u_manual[idx] == '1':
                            new_act.append('1')
                        else:
                            new_act.append('0')
                    new_act = "".join(new_act)
                    
                    SysPopedom.objects.update_or_create(
                        accounts_id=accounts_id,
                        obj_name=obj,
                        flag='10',
                        hisystem=hisystem,
                        defaults={'prg_popedom': new_act}
                    )
                
                # flag='1' menu visibility
                u_menu = user_menu.get(obj)
                g_rem_vis = rem_menu.get(obj)
                g_removed_vis = removed_menu.get(obj, '2')
                
                if u_menu:
                    g_all_vis = '1' if (g_rem_vis == '1' or g_removed_vis == '1') else '2'
                    
                    is_manual = False
                    if u_menu == '1' and g_all_vis == '2':
                        is_manual = True
                    elif u_menu == '2' and g_all_vis == '1':
                        is_manual = True
                        
                    if is_manual:
                        new_vis = u_menu
                    else:
                        new_vis = g_rem_vis if g_rem_vis else '2'
                        
                    SysPopedom.objects.update_or_create(
                        accounts_id=accounts_id,
                        obj_name=obj,
                        flag='1',
                        hisystem=hisystem,
                        defaults={'prg_popedom': new_vis}
                    )

    @staticmethod
    def recalculate_user_permissions_from_groups(accounts_id: str, hisystem: str):
        """
        根據當前所屬的所有群組重新計算權限（保留個人手動設定的權限）。
        """
        user_perms = SysPopedom.objects.filter(accounts_id=accounts_id, hisystem=hisystem, flag__in=['1', '10'])
        user_menu = {p.obj_name: p.prg_popedom for p in user_perms if p.flag == '1'}
        user_action = {p.obj_name: p.prg_popedom for p in user_perms if p.flag == '10'}

        groups = SysAccountsGroup.objects.filter(accounts_id=accounts_id, hisystem=hisystem)
        group_codes = list(groups.values_list('group_code', flat=True))
        group_perms = SysPopedom.objects.filter(accounts_id__in=group_codes, hisystem=hisystem, flag__in=['2', '20'])

        menu_lists = {}
        action_lists = {}
        for gp in group_perms:
            obj = gp.obj_name
            if gp.flag == '2':
                menu_lists.setdefault(obj, []).append(gp.prg_popedom)
            elif gp.flag == '20':
                action_lists.setdefault(obj, []).append(gp.prg_popedom)

        g_menu = {obj: ('1' if '1' in v else '2') for obj, v in menu_lists.items()}
        g_action = {obj: PermissionMatrixService.or_masks(v) for obj, v in action_lists.items()}

        all_objs = set(user_menu.keys()) | set(user_action.keys()) | set(g_menu.keys()) | set(g_action.keys())

        with transaction.atomic():
            for obj in all_objs:
                u_act = user_action.get(obj)
                g_act = g_action.get(obj, PermissionMatrixService.empty_mask())

                if u_act:
                    u_norm = PermissionMatrixService.normalize_mask(u_act)
                    g_norm = PermissionMatrixService.normalize_mask(g_act)

                    new_act = []
                    for idx in range(20):
                        if g_norm[idx] == '1' or (u_norm[idx] == '1' and g_norm[idx] == '0'):
                            new_act.append('1')
                        else:
                            new_act.append('0')
                    new_act = "".join(new_act)

                    SysPopedom.objects.update_or_create(
                        accounts_id=accounts_id,
                        obj_name=obj,
                        flag='10',
                        hisystem=hisystem,
                        defaults={'prg_popedom': new_act}
                    )

                u_menu = user_menu.get(obj)
                g_vis = g_menu.get(obj)

                if u_menu:
                    is_manual = False
                    g_vis_val = g_vis if g_vis else '2'
                    if u_menu == '1' and g_vis_val == '2':
                        is_manual = True
                    elif u_menu == '2' and g_vis_val == '1':
                        is_manual = True

                    new_vis = u_menu if is_manual else g_vis_val

                    SysPopedom.objects.update_or_create(
                        accounts_id=accounts_id,
                        obj_name=obj,
                        flag='1',
                        hisystem=hisystem,
                        defaults={'prg_popedom': new_vis}
                    )

    @staticmethod
    def delete_group_with_recalculation(group_code: str, hisystem: str):
        """
        刪除群組並重新計算所有成員的權限。
        """
        members = SysAccountsGroup.objects.filter(group_code=group_code, hisystem=hisystem)
        member_ids = list(members.values_list('accounts_id', flat=True))
        
        with transaction.atomic():
            for member_id in member_ids:
                PermissionMatrixService.remove_group_permissions_from_user(member_id, group_code, hisystem)
                
            members.delete()
            SysPopedom.objects.filter(accounts_id=group_code, hisystem=hisystem, flag__in=['2', '20']).delete()
            SysPopedomGroup.objects.filter(group_code=group_code, hisystem=hisystem).delete()
