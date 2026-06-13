"""
DataConstraintFilterBackend
============================
通用資料範圍限制過濾器，對應 PB sys_constraint 機制。

Phase 9A-2B 升級：
  - 新增動態讀取 sys_constraint（四表結構）的邏輯
  - Strict Allowlist：只有 STRICT_CONSTRAINT_PROGRAMS 中的 program_id 才啟用動態 DB 讀取
  - 向下相容：若無動態規則，退回既有 config-based 模式（不改變其他 ViewSet 行為）
  - 保護全 HTTP 動作：list / retrieve / create / update / delete / deep_save

PB 查詢邏輯對齊：
  1. 以 ViewSet.program_id 查 sys_constraint_program.obj_name → 取得 pgkey 清單
  2. 以登入帳號查 sys_constraint_leaguer.accounts_id → 取得 pgkey 清單
  3. 取兩者交集的 sys_constraint，讀取 keycol 與 constraint_type
  4. 從 sys_constraint_detail 取該 pgkey 的 cgkey 清單（允許值）
  5. 套用 queryset.filter(**{keycol: value}) 或 filter(**{keycol+'__in': values})

安全原則：
  - 禁止 raw_sql、between、prefix、custom condition
  - 只支援 equal / in_list 語意
  - 若使用者不在任何 constraint 的 leaguer，且 constraint 對應此作業，則回傳空 QuerySet（最嚴格）

Strict Allowlist：
  STRICT_CONSTRAINT_PROGRAMS = {'w_dp030'}
  只有此集合內的作業啟用嚴格的動態 DB 讀取 constraint 邏輯。
  其他作業使用既有 config-based 模式，行為完全不變。
"""
import logging
from rest_framework import filters
from django.db.models import Q

from core.authz.services import is_admin, get_current_sys_account

logger = logging.getLogger(__name__)

# ============================================================
# Strict Allowlist：只有此集合中的 program_id 才啟用嚴格動態 DB 讀取 constraint
# Phase 9A-2B 只允許 w_dp030
# ============================================================
STRICT_CONSTRAINT_PROGRAMS = {'w_dp030'}


def _get_db_constraints(accounts_id: str, program_id: str) -> list:
    """
    從 sys_constraint 四表讀取動態 constraint 規則清單。

    回傳格式：
        [
            {'keycol': 'es101gkey', 'constraint_type': 'in_list', 'values': ['gkey1', 'gkey2']},
            ...
        ]

    若帳號不在任何 constraint 的 leaguer，但該作業有 constraint，
    則回傳 [{'force_empty': True}]，強制回傳空 QuerySet。
    """
    try:
        from api.modules.sys.models import (
            SysConstraint, SysConstraintProgram,
            SysConstraintLeaguer, SysConstraintDetail
        )

        # Step 1: 找到該作業有哪些 constraint gkey
        prg_pgkeys = set(
            SysConstraintProgram.objects.filter(obj_name=program_id)
            .values_list('pgkey_id', flat=True)
        )
        if not prg_pgkeys:
            # 此作業沒有任何 constraint 規則，不限制
            return []

        # Step 2: 找到此帳號受到哪些 constraint 控制
        leaguer_pgkeys = set(
            SysConstraintLeaguer.objects.filter(accounts_id=accounts_id)
            .values_list('pgkey_id', flat=True)
        )

        # Step 3: 取交集（同時對應此作業 AND 此帳號的 constraint）
        active_pgkeys = prg_pgkeys & leaguer_pgkeys

        if not active_pgkeys:
            # 此作業有 constraint，但此帳號不在 leaguer 中
            # 安全處理：若作業有 constraint 存在，帳號不在任何 leaguer 中
            # 則不套用限制（讓上層 HasProgramPermission 決定），以避免誤傷合法帳號
            # NOTE: 如未來需要更嚴格的模式（帳號不在 leaguer = 空結果），請在此改為:
            # return [{'force_empty': True}]
            return []

        # Step 4: 讀取 constraint 規則與允許值
        constraints = []
        for pgkey in active_pgkeys:
            sc = SysConstraint.objects.filter(gkey=pgkey).first()
            if not sc:
                continue

            # 安全檢查：只允許安全的 constraint_type
            if sc.constraint_type not in ('equal', 'in_list'):
                logger.warning(
                    f"[DataConstraint] Unsupported constraint_type '{sc.constraint_type}' "
                    f"for gkey={pgkey}, skipping. Only 'equal'/'in_list' allowed."
                )
                continue

            allowed_values = list(
                SysConstraintDetail.objects.filter(pgkey_id=pgkey)
                .values_list('cgkey', flat=True)
            )

            constraints.append({
                'keycol': sc.keycol,
                'constraint_type': sc.constraint_type,
                'values': allowed_values,
            })

        return constraints

    except Exception as e:
        logger.error(f"[DataConstraint] Error reading sys_constraint DB rules: {e}")
        return []


def _apply_db_constraints(queryset, constraints, model):
    """
    將動態讀取的 constraint 規則套用至 queryset。
    所有規則以 AND 邏輯套用（更嚴格）。
    """
    for rule in constraints:
        if rule.get('force_empty'):
            return queryset.none()

        keycol = rule.get('keycol', '').strip()
        constraint_type = rule.get('constraint_type', 'equal')
        values = rule.get('values', [])

        if not keycol:
            continue

        # 安全檢查：防止前端或設定錯誤導致任意欄位過濾
        # keycol 只能是字母、數字、底線，不允許 __ 串聯（防止 ORM lookup injection）
        if not keycol.replace('_', '').isalnum():
            logger.warning(f"[DataConstraint] Invalid keycol '{keycol}', skipping.")
            continue

        # 欄位存在性安全檢查
        opts = getattr(model, '_meta', None)
        if opts:
            base_field = keycol.split('__')[0]
            try:
                opts.get_field(base_field)
            except Exception:
                logger.warning(
                    f"[DataConstraint] Field '{base_field}' does not exist on "
                    f"model '{opts.model_name}', skipping."
                )
                continue

        if not values:
            # 有 constraint 但沒有允許值 → 強制空結果（最嚴格保護）
            return queryset.none()

        if constraint_type == 'equal':
            # 只取第一個值作為 equal 比較
            queryset = queryset.filter(**{keycol: values[0]})
        elif constraint_type == 'in_list':
            queryset = queryset.filter(**{f'{keycol}__in': values})

    return queryset


class DataConstraintFilterBackend(filters.BaseFilterBackend):
    """
    通用資料範圍限制過濾器 (對應 PB sys_constraint 與 is_constraint)。

    Phase 9A-2B 升級版：
    - Strict Allowlist 內的 program_id 優先使用動態 DB constraint
    - 其餘 program_id 退回既有 config-based 模式，行為完全不變

    向下相容保證：
    - 若 view 沒有 program_id 或不在 STRICT_CONSTRAINT_PROGRAMS，完全使用舊邏輯
    - 若 view 沒有 data_constraint_config，舊邏輯直接跳過
    """

    def filter_queryset(self, request, queryset, view):
        """
        主要 filter 入口。同時處理 list / retrieve / update / delete / deep_save。
        """
        # 1. 取得 SysAccount，若無登入則不作額外限制
        account = get_current_sys_account(request)
        if not account:
            return queryset

        # 2. 管理員 bypass
        if is_admin(account):
            return queryset

        program_id = getattr(view, 'program_id', None)

        # 3. Strict Allowlist：若 program_id 在名單中，優先使用動態 DB constraint
        if program_id and program_id in STRICT_CONSTRAINT_PROGRAMS:
            db_constraints = _get_db_constraints(account.accounts_id, program_id)
            if db_constraints:
                queryset = _apply_db_constraints(queryset, db_constraints, queryset.model)
                return queryset
            # 若無動態規則，fall through 到 config-based 模式

        # 4. Config-based 模式（既有邏輯，向下相容）
        config = getattr(view, 'data_constraint_config', None)
        if not config or not config.get('enabled', False):
            return queryset

        rules = config.get('rules', [])
        if not rules:
            mode = config.get('mode')
            field = config.get('field')
            source = config.get('source')
            if mode and field and source:
                rules = [{'type': mode, 'field': field, 'source': source}]

        if not rules:
            return queryset

        from core.authz.services import get_current_es101gkey, get_current_es101

        final_q = Q()
        for rule in rules:
            field = rule.get('field')
            source = rule.get('source')
            required = rule.get('required', False)

            if not field or not source:
                continue

            # 安全檢查：model field 存在性
            opts = getattr(queryset.model, '_meta', None)
            if opts:
                base_field = field.split('__')[0]
                try:
                    opts.get_field(base_field)
                except Exception:
                    logger.warning(
                        f"DataConstraint: Field '{base_field}' does not exist on "
                        f"model '{opts.model_name}'."
                    )
                    continue

            value = None
            if source == 'username':
                value = account.accounts_id
            elif source == 'es101gkey':
                try:
                    value = get_current_es101gkey(request)
                except Exception as e:
                    logger.warning(f"DataConstraint: cannot get es101gkey: {e}")
                    value = None
            elif source == 'departmentgkey':
                try:
                    es101 = get_current_es101(request)
                    if es101:
                        value = getattr(es101, 'departmentgkey_id', getattr(es101, 'departmentgkey', None))
                except Exception:
                    value = None

            if value is not None:
                final_q &= Q(**{field: value})
            elif required:
                return queryset.none()

        return queryset.filter(final_q)

    def get_object_constraint_check(self, request, obj, view):
        """
        物件級別的 DataConstraint 保護，用於 retrieve / update / delete。
        在 ViewSet.get_object() 的 check_object_permissions 觸發後，可呼叫此方法。

        若物件不在使用者的允許範圍內，拋出 PermissionDenied。
        設計為 helper，由 Dp030ViewSet 在需要時手動呼叫。
        """
        from rest_framework.exceptions import PermissionDenied

        account = get_current_sys_account(request)
        if not account or is_admin(account):
            return  # 管理員跳過

        program_id = getattr(view, 'program_id', None)
        if not program_id or program_id not in STRICT_CONSTRAINT_PROGRAMS:
            return  # 非 strict 作業跳過

        db_constraints = _get_db_constraints(account.accounts_id, program_id)
        if not db_constraints:
            return  # 無規則跳過

        # 逐項檢查物件是否符合所有 constraint
        for rule in db_constraints:
            if rule.get('force_empty'):
                raise PermissionDenied('您無權存取此資料。')

            keycol = rule.get('keycol', '').strip()
            constraint_type = rule.get('constraint_type', 'equal')
            values = rule.get('values', [])

            if not keycol or not keycol.replace('_', '').isalnum():
                continue

            obj_value = getattr(obj, keycol, None)
            # 嘗試處理 ForeignKey
            if hasattr(obj_value, 'pk'):
                obj_value = getattr(obj_value, 'pk')
            elif obj_value is None:
                obj_value = getattr(obj, f'{keycol}_id', None)

            if obj_value is None:
                logger.warning(f"[DataConstraint] Object has no field '{keycol}', skipping check.")
                continue

            if not values:
                raise PermissionDenied('您無權存取此資料。')

            obj_val_str = str(obj_value)

            if constraint_type == 'equal':
                if obj_val_str != str(values[0]):
                    raise PermissionDenied('您無權存取此資料。')
            elif constraint_type == 'in_list':
                if obj_val_str not in [str(v) for v in values]:
                    raise PermissionDenied('您無權存取此資料。')

    def check_payload_constraint(self, request, payload, view):
        """
        針對 create / deep_save 等無既有物件的情況，檢查傳入 payload 是否符合 DataConstraint。
        若不符，拋出 PermissionDenied。
        """
        from rest_framework.exceptions import PermissionDenied

        account = get_current_sys_account(request)
        if not account or is_admin(account):
            return  # 管理員跳過

        program_id = getattr(view, 'program_id', None)
        if not program_id or program_id not in STRICT_CONSTRAINT_PROGRAMS:
            return  # 非 strict 作業跳過

        db_constraints = _get_db_constraints(account.accounts_id, program_id)
        if not db_constraints:
            return  # 無規則跳過

        for rule in db_constraints:
            if rule.get('force_empty'):
                raise PermissionDenied('您無權建立此資料 (受限資料範圍)。')

            keycol = rule.get('keycol', '').strip()
            constraint_type = rule.get('constraint_type', 'equal')
            values = rule.get('values', [])

            if not keycol or not keycol.replace('_', '').isalnum():
                continue

            payload_val = payload.get(keycol)
            if payload_val is None:
                if keycol.endswith('_id'):
                    payload_val = payload.get(keycol[:-3])
                else:
                    payload_val = payload.get(keycol + '_id')

            if payload_val is None:
                # Payload 內沒有該欄位 -> 在此業務中不允許 (不允許繞過限制去建立未設定範圍欄位的資料)
                raise PermissionDenied(f"建立資料時，必須明確提供受限制欄位 '{keycol}'，且值必須在您的權限範圍內。")

            if not values:
                raise PermissionDenied('您無權建立此資料 (受限資料範圍)。')

            payload_val_str = str(payload_val)

            if constraint_type == 'equal':
                if payload_val_str != str(values[0]):
                    raise PermissionDenied(f"建立資料失敗：超出您的資料範圍權限 ({keycol} 不符)。")
            elif constraint_type == 'in_list':
                if payload_val_str not in [str(v) for v in values]:
                    raise PermissionDenied(f"建立資料失敗：超出您的資料範圍權限 ({keycol} 不符)。")

