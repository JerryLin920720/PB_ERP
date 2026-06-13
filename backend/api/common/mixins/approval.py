from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.utils import timezone
from core.permissions import HasProgramPermission
import logging

logger = logging.getLogger(__name__)

class ApprovalMixin:
    """
    審核與反審核共用邏輯 (Backend Approval Abstraction)
    
    支援基於 PB 底層的 check / recheck 機制。
    由子類別提供 `approval_config` 進行欄位對應。
    """
    # 預設權限類別 (使用系統現有的 HasProgramPermission)
    # 不強制複寫，但加上 HasProgramPermission 可以利用其 Action 解析
    permission_classes = [HasProgramPermission]

    def get_approval_config(self):
        config = getattr(self, 'approval_config', None)
        if not config:
            raise NotImplementedError(f"{self.__class__.__name__} 必須定義 approval_config 才能使用 ApprovalMixin")
        return config

    def get_approval_user_info(self, request):
        """
        取得當前操作者的 es101gkey (SysAccount 所對應的員工)。
        """
        from api.models import SysAccount, Es101
        account = getattr(request.user, 'sys_account', None)
        if not account:
            account = SysAccount.objects.filter(accounts_id__iexact=request.user.username).first()
        if account and account.user_id:
            return Es101.objects.filter(gkey=account.user_id).first()
        return None

    def pre_check_hook(self, instance, request):
        pass

    def post_check_hook(self, instance, request):
        pass

    def pre_uncheck_hook(self, instance, request):
        pass

    def post_uncheck_hook(self, instance, request):
        pass


    def is_instance_approved(self, instance):
        config = self.get_approval_config()
        if not config:
            return False
            
        approved_field = config.get("approved_field", "is_approved")
        approved_value = config.get("approved_value", "Y")
        
        if getattr(instance, approved_field, None) == approved_value:
            return True
        return False

    def allow_edit_after_approve(self):
        config = self.get_approval_config()
        return config.get("allow_edit_after_approve", False)

    def allow_delete_after_approve(self):
        config = self.get_approval_config()
        return config.get("allow_delete_after_approve", False)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if self.is_instance_approved(instance) and not self.allow_edit_after_approve():
            return Response({"detail": "此資料已審核，請先反審核後再修改。"}, status=403)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        if self.is_instance_approved(instance) and not self.allow_edit_after_approve():
            return Response({"detail": "此資料已審核，請先反審核後再修改。"}, status=403)
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if self.is_instance_approved(instance) and not self.allow_delete_after_approve():
            return Response({"detail": "此資料已審核，請先反審核後再刪除。"}, status=403)
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'], url_path='check')

    def check(self, request, pk=None):
        config = self.get_approval_config()
        try:
            with transaction.atomic():
                instance = self.get_object()
                
                approved_field = config.get("approved_field", "is_approved")
                approved_value = config.get("approved_value", "Y")
                
                if not hasattr(instance, approved_field):
                    return Response({"success": False, "detail": f"Model 缺少 {approved_field} 欄位"}, status=400)
                
                if getattr(instance, approved_field) == approved_value:
                    return Response({
                        "success": False,
                        "detail": "此單據已審核，不可重複審核。"
                    }, status=400)
                
                # 1. pre_check_hook
                self.pre_check_hook(instance, request)
                
                # 2. 寫入欄位
                setattr(instance, approved_field, approved_value)
                update_fields = [approved_field]
                
                # 寫入 approver_field
                approver_field = config.get("approver_field")
                if approver_field and hasattr(instance, approver_field):
                    setattr(instance, approver_field, request.user.username)
                    update_fields.append(approver_field)
                
                # 寫入 approver_gkey_field
                approver_gkey_field = config.get("approver_gkey_field")
                if approver_gkey_field and hasattr(instance, approver_gkey_field):
                    es101 = self.get_approval_user_info(request)
                    if es101:
                        setattr(instance, approver_gkey_field, es101)
                        update_fields.append(approver_gkey_field)
                
                # 寫入 approve_date_field
                approve_date_field = config.get("approve_date_field")
                if approve_date_field and hasattr(instance, approve_date_field):
                    setattr(instance, approve_date_field, timezone.now())
                    update_fields.append(approve_date_field)
                
                # 寫入 modify_date_field
                modify_date_field = config.get("modify_date_field")
                if modify_date_field and hasattr(instance, modify_date_field):
                    # 有些 model 的 modify_date 是 auto_now，這時 setattr 可能不會作用，但保險起見還是設定
                    setattr(instance, modify_date_field, timezone.now())
                    update_fields.append(modify_date_field)
                
                instance.save(update_fields=update_fields)
                
                # 3. post_check_hook
                self.post_check_hook(instance, request)
                
                # 回傳最新 serializer data
                serializer = self.get_serializer(instance)
                return Response({
                    "success": True,
                    "message": "審核成功",
                    "data": serializer.data
                })
        except Exception as e:
            logger.error(f"Approval failed: {str(e)}", exc_info=True)
            return Response({"success": False, "detail": str(e)}, status=400)

    @action(detail=True, methods=['post'], url_path='uncheck')
    def uncheck(self, request, pk=None):
        config = self.get_approval_config()
        try:
            with transaction.atomic():
                instance = self.get_object()
                
                approved_field = config.get("approved_field", "is_approved")
                unapproved_value = config.get("unapproved_value", "N")
                
                if not hasattr(instance, approved_field):
                    return Response({"success": False, "detail": f"Model 缺少 {approved_field} 欄位"}, status=400)
                
                if getattr(instance, approved_field) == unapproved_value:
                    return Response({
                        "success": False,
                        "detail": "此單據尚未審核，無法進行反審核。"
                    }, status=400)
                
                # 1. pre_uncheck_hook
                self.pre_uncheck_hook(instance, request)
                
                # 2. 寫入欄位
                setattr(instance, approved_field, unapproved_value)
                update_fields = [approved_field]
                
                # 視 PB 行為決定是否清空 approver / approve_date 
                # (根據指示：若不確定 PB 是否清空，請採保守策略：只改 approved_field 與 modify_date_field)
                # 目前採保守策略：不清空 approver 與 approve_date_field
                
                # 寫入 modify_date_field
                modify_date_field = config.get("modify_date_field")
                if modify_date_field and hasattr(instance, modify_date_field):
                    setattr(instance, modify_date_field, timezone.now())
                    update_fields.append(modify_date_field)
                
                instance.save(update_fields=update_fields)
                
                # 3. post_uncheck_hook
                self.post_uncheck_hook(instance, request)
                
                # 回傳最新 serializer data
                serializer = self.get_serializer(instance)
                return Response({
                    "success": True,
                    "message": "反審核成功",
                    "data": serializer.data
                })
        except Exception as e:
            logger.error(f"Unapproval failed: {str(e)}", exc_info=True)
            return Response({"success": False, "detail": str(e)}, status=400)

