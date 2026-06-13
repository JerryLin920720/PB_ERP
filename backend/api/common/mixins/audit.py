from core.authz.services import get_current_sys_account, get_current_es101gkey, model_has_field

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

class AuditFieldsMixin:
    """
    提供標準的 create / update 時的 Audit 欄位注入。
    """
    def perform_create(self, serializer):
        extra_fields = {}
        apply_create_audit_fields(extra_fields, self.request, model_cls=self.queryset.model)
        if self.queryset.model.__name__ == 'Ba001':
            extra_fields['f2type'] = 'BA'
        elif self.queryset.model.__name__ == 'Dp001':
            extra_fields['f2type'] = 'DP'
        serializer.save(**extra_fields)

    def perform_update(self, serializer):
        extra_fields = {}
        apply_update_audit_fields(extra_fields, self.request, model_cls=self.queryset.model)
        if self.queryset.model.__name__ == 'Ba001':
            extra_fields['f2type'] = 'BA'
        elif self.queryset.model.__name__ == 'Dp001':
            extra_fields['f2type'] = 'DP'
        serializer.save(**extra_fields)
