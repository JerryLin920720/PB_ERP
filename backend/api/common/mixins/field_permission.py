"""
FieldLevelPermissionMixin
=========================
對應 PB sys_accounts_column 的後端欄位級別權限中介層。

Phase 9A-2B：本 Mixin 只接入 Dp030Serializer，不影響其他任何 Serializer。

欄位控制類型（對齊 PB kind 值域）：
  - hide:     response 不回傳該欄位（pop from dict）；request 若送出則 400 ValidationError
  - readonly: response 正常回傳；request 若企圖修改則 400 ValidationError

安全原則：
  - 後端防護優先，前端 hidden/readonly 只是 UI 輔助
  - 管理員 (is_admin) 跳過欄位限制
  - 找不到 request context 時安全放行（不因此崩潰）
"""
import logging
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

logger = logging.getLogger(__name__)

VALID_KINDS = ('hide', 'readonly')


def _get_field_restrictions(accounts_id: str, obj_name: str) -> dict:
    """
    從 sys_accounts_column 讀取指定帳號在指定作業下的欄位限制。
    回傳格式：{db_name: kind}，如 {'cost': 'hide', 'price': 'readonly'}

    使用 try/except 防止資料表尚未存在時崩潰（如測試環境）。
    """
    try:
        from api.modules.sys.models import SysAccountsColumn
        qs = SysAccountsColumn.objects.filter(
            accounts_id=accounts_id,
            obj_name=obj_name,
            kind__in=VALID_KINDS
        ).values_list('db_name', 'kind')
        return {db_name: kind for db_name, kind in qs}
    except Exception as e:
        logger.warning(f"[FieldLevelPerm] Cannot read sys_accounts_column: {e}")
        return {}


class FieldLevelPermissionMixin:
    """
    DRF Serializer Mixin：根據 sys_accounts_column 動態控制欄位回傳與寫入。

    使用方式：
        class Dp030Serializer(FieldLevelPermissionMixin, serializers.ModelSerializer):
            class Meta:
                ...
            field_permission_obj_name = 'w_dp030'

    必須宣告 `field_permission_obj_name` 屬性（對應 obj_name）。
    """

    # 子類別必須設定此屬性，對應 sys_accounts_column.obj_name
    field_permission_obj_name: str = None

    def _get_request(self):
        """安全取得 request（可能不存在於非 API 情境）"""
        return getattr(self, 'context', {}).get('request')

    def _get_restrictions(self) -> dict:
        """
        取得當前使用者在此作業的欄位限制 dict。
        若無法取得（未登入、無 obj_name、管理員），回傳 {}。
        """
        obj_name = self.field_permission_obj_name
        if not obj_name:
            return {}

        request = self._get_request()
        if not request or not hasattr(request, 'user') or not request.user.is_authenticated:
            return {}

        # 取得 SysAccount
        from core.authz.services import get_current_sys_account, is_admin
        account = get_current_sys_account(request)
        if not account:
            return {}

        # 管理員跳過欄位限制
        if is_admin(account):
            return {}

        return _get_field_restrictions(account.accounts_id, obj_name)

    def to_representation(self, instance):
        """
        覆寫 to_representation：
        - hide 欄位：從回傳 dict 中剔除（不回傳給前端）
        - readonly 欄位：正常回傳
        """
        data = super().to_representation(instance)
        restrictions = self._get_restrictions()

        if not restrictions:
            return data

        hidden_fields = {f for f, k in restrictions.items() if k == 'hide'}
        for field_name in hidden_fields:
            data.pop(field_name, None)

        return data

    def to_internal_value(self, data):
        """
        覆寫 to_internal_value：
        - hide 欄位：request 若包含此欄位，拋出 400 ValidationError
        - readonly 欄位：request 若包含此欄位，拋出 400 ValidationError（不允許修改）
        """
        restrictions = self._get_restrictions()

        if restrictions:
            errors = {}
            for field_name, kind in restrictions.items():
                if field_name in data:
                    if kind == 'hide':
                        errors[field_name] = (
                            f"欄位 '{field_name}' 不存在或您無權存取此欄位。"
                        )
                    elif kind == 'readonly':
                        errors[field_name] = (
                            f"欄位 '{field_name}' 為唯讀，不允許修改。"
                        )

            if errors:
                raise ValidationError(errors)

        return super().to_internal_value(data)
