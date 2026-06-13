from collections import defaultdict
from core.authz.services import is_admin

from django.utils import timezone
from rest_framework.authtoken.models import Token
from api.modules.es.models import Es101
from django.contrib.auth import authenticate
from django.db.models import Q
from api.modules.common.models import generate_pb_gkey


from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated

from api.modules.sys.serializers import *
from django.contrib.auth import logout
from rest_framework import viewsets, mixins, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from api.common.permissions.program_permission import HasProgramPermission, HasSy005Permission
from django.shortcuts import get_object_or_404
from django.db import transaction
from api.modules.sys.models import *
from api.modules.sys.serializers import *
from api.modules.common.views import BaseDictionaryViewSet
from api.services.permission_matrix_service import PermissionMatrixService

class SysAccountViewSet(viewsets.ModelViewSet):
    """系統帳號授權 ViewSet"""
    queryset = SysAccount.objects.all()
    serializer_class = SysAccountSerializer

class SysParameterViewSet(mixins.ListModelMixin,
                            mixins.RetrieveModelMixin,
                            mixins.UpdateModelMixin,
                            viewsets.GenericViewSet):
    """
    系統參數設定 ViewSet (僅允許 list、retrieve、update)
    """
    http_method_names = ['get', 'patch', 'put', 'head', 'options']
    permission_classes = [HasProgramPermission]
    program_id = 'w_sy004'
    serializer_class = SysParameterSerializer
    lookup_field = 'parameterid'

    def get_queryset(self):
        from django.db.models.functions import Cast
        from django.db.models import IntegerField
        from core.authz.services import get_current_sys_account

        account = get_current_sys_account(self.request)
        is_prvl = int(account.peopdom_class or '1') if account else 1

        return SysParameter.objects.annotate(
            visitctrl_int=Cast('visitctrl', output_field=IntegerField())
        ).filter(visitctrl_int__lte=is_prvl).order_by('serialno')

    def get_object(self):
        queryset = self.filter_queryset(self.get_queryset())
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        parameterid = self.kwargs[lookup_url_kwarg]

        hisystem = self.request.query_params.get('hisystem') or self.request.data.get('hisystem')
        if not hisystem:
            raise serializers.ValidationError("Missing 'hisystem' query parameter or field.")

        obj = get_object_or_404(queryset, hisystem=hisystem, parameterid=parameterid)
        self.check_object_permissions(self.request, obj)
        return obj

    def perform_update(self, serializer):
        instance = serializer.save()
        from api.services.sys_parameter_cache import SysParameterCache
        SysParameterCache.invalidate(instance.hisystem, instance.parameterid)

class SysMenuViewSet(BaseDictionaryViewSet):
    """系統選單維護 ViewSet (SS001)"""
    program_id = 'w_ss001'
    queryset = SysMenu.objects.all()
    serializer_class = SysMenuSerializer

    @action(detail=True, methods=['post'], url_path='delete-node')
    def delete_node(self, request, pk=None):
        node = self.get_object()
        
        # 1. 檢查子節點是否存在
        if SysMenu.objects.filter(parent_code=node.prg_code).exists():
            return Response(
                {"detail": "請先刪除下級節點！"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # 2. 進行事務性級聯刪除
        with transaction.atomic():
            if node.obj_name:
                SysMenuColumn.objects.filter(obj_name=node.obj_name).delete()
            node.delete()
            
        return Response({"detail": "節點及其級聯翻譯刪除成功。"}, status=status.HTTP_200_OK)

class SysPopedomDescViewSet(BaseDictionaryViewSet):
    """權限描述說明維護 ViewSet (SS001)"""
    program_id = 'w_ss001'
    queryset = SysPopedomDesc.objects.all()
    serializer_class = SysPopedomDescSerializer

    def get_queryset(self):
        queryset = SysPopedomDesc.objects.all()
        obj_name = self.request.query_params.get('obj_name')
        hisystem = self.request.query_params.get('hisystem')
        if obj_name is not None:
            queryset = queryset.filter(obj_name=obj_name)
        if hisystem is not None:
            queryset = queryset.filter(hisystem=hisystem)
        return queryset

class SysMenuColumnViewSet(BaseDictionaryViewSet):
    """選單欄位翻譯維護 ViewSet (SS001)"""
    program_id = 'w_ss001'
    queryset = SysMenuColumn.objects.all()
    serializer_class = SysMenuColumnSerializer

    def get_queryset(self):
        queryset = SysMenuColumn.objects.all()
        obj_name = self.request.query_params.get('obj_name')
        hisystem = self.request.query_params.get('hisystem')
        if obj_name is not None:
            queryset = queryset.filter(obj_name=obj_name)
        if hisystem is not None:
            queryset = queryset.filter(hisystem=hisystem)
        return queryset


@api_view(['GET'])
@permission_classes([IsAuthenticated, HasSy005Permission])
def auth_permission_matrix(request):
    """
    GET /api/auth/permission-matrix/?target_id=...&is_group=false&hisystem=01
    供 C1-3C 前端 Matrix 讀取資料。
    """
    target_id = request.query_params.get('target_id')
    is_group_str = request.query_params.get('is_group')
    hisystem = request.query_params.get('hisystem')
    
    if not target_id or is_group_str is None or not hisystem:
        return Response({"detail": "請提供 target_id、is_group 與 hisystem 參數。"}, status=status.HTTP_400_BAD_REQUEST)
        
    is_group = str(is_group_str).lower() in ('true', '1')
    
    try:
        matrix_data = PermissionMatrixService.get_permission_matrix(target_id, is_group, hisystem)
        return Response(matrix_data)
    except serializers.ValidationError as e:
        return Response(e.detail, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated, HasSy005Permission])
def auth_save_permissions(request):
    """
    POST /api/auth/save-permissions/
    批次儲存使用者或群組權限。
    """
    serializer = SavePermissionsSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data
    
    try:
        PermissionMatrixService.save_permissions(
            target_id=data['target_id'],
            is_group=data['is_group'],
            hisystem=data['hisystem'],
            permissions=data['permissions']
        )
        return Response({
            "success": True,
            "should_refresh_permissions": True,
            "message": "權限儲存成功。"
        })
    except serializers.ValidationError as e:
        return Response(e.detail, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated, HasSy005Permission])
def auth_copy_permissions(request):
    """
    POST /api/auth/copy-permissions/
    複製來源 user/group 權限到目標 user/group。
    """
    serializer = CopyPermissionsSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data
    
    try:
        PermissionMatrixService.copy_permissions(
            source_id=data['source_id'],
            is_source_group=data['is_source_group'],
            target_id=data['target_id'],
            is_target_group=data['is_target_group'],
            hisystem=data['hisystem']
        )
        return Response({
            "success": True,
            "should_refresh_permissions": True,
            "message": "權限複製成功。"
        })
    except serializers.ValidationError as e:
        return Response(e.detail, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated, HasSy005Permission])
def auth_apply_group_permissions(request):
    """
    POST /api/auth/apply-group-permissions/
    將使用者所屬群組權限 OR 合併後寫入使用者權限。
    """
    serializer = ApplyGroupPermissionsSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data
    
    try:
        PermissionMatrixService.apply_group_permissions(
            accounts_id=data['accounts_id'],
            hisystem=data['hisystem']
        )
        return Response({
            "success": True,
            "should_refresh_permissions": True,
            "message": "群組權限套用成功。"
        })
    except serializers.ValidationError as e:
        return Response(e.detail, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)




@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated, HasSy005Permission])
def auth_users(request):
    """
    GET /api/auth/users/ -> 帳號列表
    POST /api/auth/users/ -> 新增帳號
    """
    if request.method == 'GET':
        queryset = SysAccount.objects.all().order_by('accounts_id')
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(accounts_id__icontains=search) | Q(accounts__icontains=search)
            )
        status_sign = request.query_params.get('status_sign')
        if status_sign is not None:
            queryset = queryset.filter(status_sign=status_sign)
        serializer = SysAccountSerializer(queryset, many=True)
        return Response(serializer.data)
        
    elif request.method == 'POST':
        # 自我提權防護：非 superuser 管理員不可創建大於自己級別的帳號
        current_user = request.user
        operator_acct = SysAccount.objects.filter(Q(accounts_id=current_user.username) | Q(accounts=current_user.username)).first()
        operator_level = int(operator_acct.peopdom_class) if operator_acct else 1
        
        if 'peopdom_class' in request.data:
            new_class = int(request.data['peopdom_class'])
            if new_class > operator_level and not current_user.is_superuser:
                return Response({"detail": "一般管理員不可將權限等級提升至大於自己。"}, status=status.HTTP_400_BAD_REQUEST)
                
        serializer = SysAccountCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user_obj = serializer.save()
        return Response(SysAccountSerializer(user_obj).data, status=status.HTTP_201_CREATED)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated, HasSy005Permission])
def auth_user_detail(request, accounts_id):
    """
    PATCH /api/auth/users/{accounts_id}/ -> 編輯帳號
    DELETE /api/auth/users/{accounts_id}/ -> 刪除帳號 (級聯)
    """
    user_obj = get_object_or_404(SysAccount, accounts_id=accounts_id)
    current_user = request.user
    is_self = (user_obj.accounts_id == current_user.username or user_obj.accounts == current_user.username)
    
    if request.method == 'PATCH':
        if is_self:
            if 'peopdom_class' in request.data and str(request.data['peopdom_class']) != str(user_obj.peopdom_class):
                return Response({"detail": "禁止修改自己的權限等級。"}, status=status.HTTP_400_BAD_REQUEST)
            if 'status_sign' in request.data and str(request.data['status_sign']) != str(user_obj.status_sign):
                return Response({"detail": "禁止停用/變更自己的帳號狀態。"}, status=status.HTTP_400_BAD_REQUEST)
                
        # 自我提權防護
        operator_acct = SysAccount.objects.filter(Q(accounts_id=current_user.username) | Q(accounts=current_user.username)).first()
        operator_level = int(operator_acct.peopdom_class) if operator_acct else 1
        if 'peopdom_class' in request.data:
            new_class = int(request.data['peopdom_class'])
            if new_class > operator_level and not current_user.is_superuser:
                return Response({"detail": "一般管理員不可將權限等級提升至大於自己。"}, status=status.HTTP_400_BAD_REQUEST)
                
        serializer = SysAccountUpdateSerializer(user_obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_user = serializer.save()
        return Response(SysAccountSerializer(updated_user).data)
        
    elif request.method == 'DELETE':
        if is_self:
            return Response({"detail": "禁止刪除自己當前登入的帳號。"}, status=status.HTTP_400_BAD_REQUEST)
            
        with transaction.atomic():
            SysPopedom.objects.filter(accounts_id=user_obj.accounts_id).delete()
            SysAccountsGroup.objects.filter(accounts_id=user_obj.accounts_id).delete()
            user_obj.delete()
        return Response({"success": True, "message": "使用者刪除成功。"})


@api_view(['POST'])
@permission_classes([IsAuthenticated, HasSy005Permission])
def auth_user_disable(request, accounts_id):
    user_obj = get_object_or_404(SysAccount, accounts_id=accounts_id)
    is_self = (user_obj.accounts_id == request.user.username or user_obj.accounts == request.user.username)
    if is_self:
        return Response({"detail": "禁止停用自己當前登入的帳號。"}, status=status.HTTP_400_BAD_REQUEST)
    user_obj.status_sign = '1'
    user_obj.save()
    return Response({"success": True, "message": "帳號已停用。"})


@api_view(['POST'])
@permission_classes([IsAuthenticated, HasSy005Permission])
def auth_user_enable(request, accounts_id):
    user_obj = get_object_or_404(SysAccount, accounts_id=accounts_id)
    user_obj.status_sign = '0'
    user_obj.save()
    return Response({"success": True, "message": "帳號已啟用。"})


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated, HasSy005Permission])
def auth_groups(request):
    """
    GET /api/auth/groups/ -> 群組列表
    POST /api/auth/groups/ -> 新增群組
    """
    if request.method == 'GET':
        queryset = SysPopedomGroup.objects.all().order_by('group_code')
        hisystem = request.query_params.get('hisystem')
        if hisystem:
            queryset = queryset.filter(hisystem=hisystem)
        serializer = SysPopedomGroupSerializer(queryset, many=True)
        return Response(serializer.data)
        
    elif request.method == 'POST':
        serializer = SysPopedomGroupCRUDSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        group_obj = serializer.save()
        return Response(SysPopedomGroupSerializer(group_obj).data, status=status.HTTP_201_CREATED)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated, HasSy005Permission])
def auth_group_detail(request, group_code):
    """
    PATCH /api/auth/groups/{group_code}/ -> 編輯群組名稱
    DELETE /api/auth/groups/{group_code}/ -> 刪除群組 (級聯重算)
    """
    hisystem = request.query_params.get('hisystem') or request.data.get('hisystem')
    if hisystem:
        group_obj = get_object_or_404(SysPopedomGroup, group_code=group_code, hisystem=hisystem)
    else:
        group_obj = get_object_or_404(SysPopedomGroup, group_code=group_code)
        hisystem = group_obj.hisystem
        
    if request.method == 'PATCH':
        serializer = SysPopedomGroupCRUDSerializer(group_obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_group = serializer.save()
        return Response(SysPopedomGroupSerializer(updated_group).data)
        
    elif request.method == 'DELETE':
        members_count = SysAccountsGroup.objects.filter(group_code=group_code, hisystem=hisystem).count()
        PermissionMatrixService.delete_group_with_recalculation(group_code, hisystem)
        return Response({
            "success": True,
            "message": f"群組刪除成功，已移除該群組關聯，共 {members_count} 位成員完成權限重算。"
        })


@api_view(['GET', 'POST', 'DELETE'])
@permission_classes([IsAuthenticated, HasSy005Permission])
def auth_user_groups(request):
    """
    GET /api/auth/user-groups/ -> 獲取使用者群組
    POST /api/auth/user-groups/ -> 指派使用者加入群組 (選擇性 OR 套用)
    DELETE /api/auth/user-groups/ -> 將使用者移出群組 (選擇性 OutGroup 扣減)
    """
    if request.method == 'GET':
        accounts_id = request.query_params.get('accounts_id')
        hisystem = request.query_params.get('hisystem')
        if not accounts_id or not hisystem:
            return Response({"detail": "請提供 accounts_id 與 hisystem。"}, status=status.HTTP_400_BAD_REQUEST)
        if not SysAccount.objects.filter(accounts_id=accounts_id).exists():
            return Response({"detail": f"使用者帳號 '{accounts_id}' 不存在。"}, status=status.HTTP_400_BAD_REQUEST)
        user_groups = SysAccountsGroup.objects.filter(accounts_id=accounts_id, hisystem=hisystem)
        group_codes = list(user_groups.values_list('group_code', flat=True))
        return Response(group_codes)
        
    elif request.method == 'POST':
        accounts_id = request.data.get('accounts_id')
        group_code = request.data.get('group_code')
        hisystem = request.data.get('hisystem')
        apply_permissions_val = request.data.get('apply_permissions')
        apply_permissions = str(apply_permissions_val).lower() in ('true', '1') if apply_permissions_val is not None else True
        
        if not accounts_id or not group_code or not hisystem:
            return Response({"detail": "請提供 accounts_id, group_code 與 hisystem。"}, status=status.HTTP_400_BAD_REQUEST)
            
        user_obj = SysAccount.objects.filter(accounts_id=accounts_id).first()
        if not user_obj:
            return Response({"detail": "使用者不存在。"}, status=status.HTTP_400_BAD_REQUEST)
        if not SysPopedomGroup.objects.filter(group_code=group_code, hisystem=hisystem).exists():
            return Response({"detail": "權限群組不存在。"}, status=status.HTTP_400_BAD_REQUEST)
            
        # 自我修改防護：非 superuser 管理員禁止自我加入管理群組
        current_user = request.user
        is_self = (user_obj.accounts_id == current_user.username or user_obj.accounts == current_user.username)
        if is_self and not current_user.is_superuser:
            grp = SysPopedomGroup.objects.get(group_code=group_code, hisystem=hisystem)
            if 'admin' in grp.group_name.lower() or '管理' in grp.group_name:
                return Response({"detail": "非 superuser 管理員禁止將自己指派加入管理群組。"}, status=status.HTTP_400_BAD_REQUEST)
                
        SysAccountsGroup.objects.update_or_create(
            accounts_id=accounts_id,
            group_code=group_code,
            hisystem=hisystem
        )
        
        if apply_permissions:
            PermissionMatrixService.apply_group_permissions(accounts_id, hisystem)
            
        return Response({"success": True, "message": "指派群組成功。"})
        
    elif request.method == 'DELETE':
        accounts_id = request.data.get('accounts_id') or request.query_params.get('accounts_id')
        group_code = request.data.get('group_code') or request.query_params.get('group_code')
        hisystem = request.data.get('hisystem') or request.query_params.get('hisystem')
        recalculate_permissions_val = request.data.get('recalculate_permissions')
        if recalculate_permissions_val is None:
            recalculate_permissions_val = request.query_params.get('recalculate_permissions')
        recalculate_permissions = str(recalculate_permissions_val).lower() in ('true', '1') if recalculate_permissions_val is not None else True
        
        if not accounts_id or not group_code or not hisystem:
            return Response({"detail": "請提供 accounts_id, group_code 與 hisystem。"}, status=status.HTTP_400_BAD_REQUEST)
            
        user_obj = SysAccount.objects.filter(accounts_id=accounts_id).first()
        if not user_obj:
            return Response({"detail": "使用者不存在。"}, status=status.HTTP_400_BAD_REQUEST)
            
        # 自我修改防護：禁止自我移除最後一個管理群組
        current_user = request.user
        is_self = (user_obj.accounts_id == current_user.username or user_obj.accounts == current_user.username)
        if is_self and not current_user.is_superuser:
            all_grp_codes = list(SysAccountsGroup.objects.filter(accounts_id=accounts_id, hisystem=hisystem).values_list('group_code', flat=True))
            admin_grps = SysPopedomGroup.objects.filter(group_code__in=all_grp_codes, hisystem=hisystem, group_name__icontains='管理')
            if admin_grps.filter(group_code=group_code).exists() and admin_grps.count() <= 1:
                return Response({"detail": "一般管理員禁止移除自己最後一個管理群組。"}, status=status.HTTP_400_BAD_REQUEST)
                
        SysAccountsGroup.objects.filter(
            accounts_id=accounts_id,
            group_code=group_code,
            hisystem=hisystem
        ).delete()
        
        if recalculate_permissions:
            PermissionMatrixService.remove_group_permissions_from_user(accounts_id, group_code, hisystem)
            
        return Response({"success": True, "message": "移除群組成功。"})


@api_view(['POST'])
@permission_classes([AllowAny])
def auth_login(request):
    username = request.data.get('username')
    password = request.data.get('password')
    if not username or not password:
        return Response({"detail": "請輸入帳號與密碼。"}, status=status.HTTP_400_BAD_REQUEST)

    user = authenticate(request, username=username, password=password)
    if not user:
        return Response({"detail": "帳號或密碼錯誤。"}, status=status.HTTP_401_UNAUTHORIZED)

    token, _ = Token.objects.get_or_create(user=user)

    # 寫入重複登入 active session
    account = _get_sys_account(user)
    if account:
        # 單一 Session 強制機制：清空之前的連線
        SysAccountsActive.objects.filter(accounts_id=account.accounts_id).delete()
        SysAccountsActive.objects.create(
            gkey=generate_pb_gkey(),
            hisystem=account.hisystem or '01',
            accounts_id=account.accounts_id,
            logintime=timezone.now(),
            computername="WebBrowser",
            loginip=request.META.get('REMOTE_ADDR', '127.0.0.1'),
            spid=9999,
            win_login="Web"
        )

    return Response({
        "token": token.key,
        "user": _get_user_info_response(user)
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def auth_logout(request):
    account = _get_sys_account(request.user)
    if not account:
        return Response({
            "success": False,
            "detail": "找不到對應的 ERP 使用者帳號。"
        }, status=status.HTTP_404_NOT_FOUND)

    # 刪除 active session
    SysAccountsActive.objects.filter(accounts_id=account.accounts_id).delete()
    # 刪除 token
    if hasattr(request, 'auth') and request.auth:
        request.auth.delete()
    return Response({"detail": "Successfully logged out."})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def auth_me(request):
    account = _get_sys_account(request.user)
    if not account:
        return Response({
            "success": False,
            "detail": "找不到對應的 ERP 使用者帳號。"
        }, status=status.HTTP_404_NOT_FOUND)

    return Response(_get_user_info_response(request.user))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def auth_permissions(request):
    account = _get_sys_account(request.user)
    if not account:
        return Response({
            "success": False,
            "detail": "找不到對應的 ERP 使用者帳號。"
        }, status=status.HTTP_404_NOT_FOUND)

    perm_map = build_permission_map(account)
    return Response(perm_map)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def auth_menu(request):
    account = _get_sys_account(request.user)
    if not account:
        return Response({
            "success": False,
            "detail": "找不到對應的 ERP 使用者帳號。"
        }, status=status.HTTP_404_NOT_FOUND)

    menu_tree = build_menu_tree(account)
    return Response(menu_tree)


# ============================================================================
# 💼 業務部門管理系統 (Sales Administration - SA) ViewSets
# Pattern A 單表 CRUD 作業
# ============================================================================


def _get_sys_account(user):
    account = getattr(user, 'sys_account', None)
    if not account:
        account = SysAccount.objects.filter(accounts_id__iexact=user.username).first()
        if account:
            user.sys_account = account
    return account



def _get_user_info_response(user):
    display_name = user.username
    employee_no = user.username
    email = ""
    privilege_class = "1"
    es101gkey = None

    account = _get_sys_account(user)
    field_permissions = defaultdict(dict)
    if account:
        privilege_class = account.peopdom_class
        es101gkey = account.user_id
        es101 = Es101.objects.filter(gkey=account.user_id).first()
        if es101:
            display_name = es101.englishname or es101.chinesename or user.username
            employee_no = es101.employeeno or user.username
            email = es101.email or ""
            
        # Fetch field permissions
        columns = SysAccountsColumn.objects.filter(accounts_id=account.accounts_id)
        for col in columns:
            field_permissions[col.obj_name][col.db_name] = col.kind

    if not es101gkey:
        from django.conf import settings
        if getattr(settings, 'DEBUG', False):
            es101gkey = getattr(settings, 'DEFAULT_DEV_ES101GKEY', None)

    return {
        "username": user.username,
        "display_name": display_name,
        "employee_no": employee_no,
        "privilege_class": privilege_class,
        "email": email,
        "es101gkey": es101gkey,
        "field_permissions": dict(field_permissions)
    }















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


from rest_framework.decorators import action
from api.modules.sys.serializers import SysAccountsColumnSerializer, SysAccountsColumnBatchSaveSerializer
from django.db import transaction

class SysAccountsColumnViewSet(viewsets.ModelViewSet):
    """
    Phase 9B-3 欄位權限設定 API
    提供 accounts_id + obj_name 的查詢與 batch_save 功能
    """
    queryset = SysAccountsColumn.objects.all()
    serializer_class = SysAccountsColumnSerializer
    permission_classes = [IsAuthenticated, HasSy005Permission]

    def get_queryset(self):
        qs = super().get_queryset()
        accounts_id = self.request.query_params.get('accounts_id')
        obj_name = self.request.query_params.get('obj_name')
        hisystem = self.request.query_params.get('hisystem', '01')
        
        if accounts_id:
            qs = qs.filter(accounts_id=accounts_id)
        if obj_name:
            qs = qs.filter(obj_name=obj_name)
        if hisystem:
            qs = qs.filter(hisystem=hisystem)
            
        return qs

    @action(detail=False, methods=['post'], url_path='batch_save')
    def batch_save(self, request):
        serializer = SysAccountsColumnBatchSaveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        
        accounts_id = data['accounts_id']
        obj_name = data['obj_name']
        hisystem = data['hisystem']
        columns = data['columns']
        
        try:
            with transaction.atomic():
                # 嚴格限制 Replace-All 的刪除範圍
                SysAccountsColumn.objects.filter(
                    hisystem=hisystem,
                    accounts_id=accounts_id,
                    obj_name=obj_name
                ).delete()
                
                # 寫入新設定
                for col in columns:
                    SysAccountsColumn.objects.create(
                        hisystem=hisystem,
                        accounts_id=accounts_id,
                        obj_name=obj_name,
                        db_name=col['db_name'],
                        kind=col['kind']
                    )
            return Response({"success": True, "message": "欄位權限批次儲存成功。"})
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

from api.models import SysConstraint, SysConstraintProgram, SysConstraintLeaguer, SysConstraintDetail
from api.modules.sys.serializers import SysConstraintBatchSaveSerializer

class SysConstraintViewSet(viewsets.ViewSet):
    """
    Phase 9B-4 資料範圍約束 API
    提供 accounts_id + obj_name 的查詢與 batch_save 功能
    """
    permission_classes = [IsAuthenticated, HasSy005Permission]

    def list(self, request):
        accounts_id = request.query_params.get('accounts_id')
        obj_name = request.query_params.get('obj_name')
        hisystem = request.query_params.get('hisystem', '01')

        if not accounts_id or not obj_name:
            return Response({"detail": "accounts_id and obj_name are required"}, status=status.HTTP_400_BAD_REQUEST)

        # 找出符合的 SysConstraint
        leaguer_pgkeys = SysConstraintLeaguer.objects.filter(accounts_id=accounts_id).values_list('pgkey_id', flat=True)
        prog_pgkeys = SysConstraintProgram.objects.filter(obj_name=obj_name, pgkey_id__in=leaguer_pgkeys).values_list('pgkey_id', flat=True)

        constraints = SysConstraint.objects.filter(gkey__in=prog_pgkeys, hisystem=hisystem)
        
        result = []
        for c in constraints:
            details = SysConstraintDetail.objects.filter(pgkey=c)
            values = [{"cgkey": d.cgkey, "cname": d.cname} for d in details]
            result.append({
                "hisystem": c.hisystem,
                "accounts_id": accounts_id,
                "obj_name": obj_name,
                "keycol": c.keycol,
                "constraint_type": c.constraint_type,
                "values": values
            })
        
        return Response(result)

    @action(detail=False, methods=['post'], url_path='batch_save')
    def batch_save(self, request):
        serializer = SysConstraintBatchSaveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        accounts_id = data['accounts_id']
        obj_name = data['obj_name']
        hisystem = data['hisystem']
        keycol = data['keycol']
        constraint_type = data['constraint_type']
        values = data['values']

        try:
            with transaction.atomic():
                # 1. 尋找舊有的 constraint pgkeys 準備刪除
                # 範圍限制: hisystem + accounts_id + obj_name + keycol
                leaguer_pgkeys = SysConstraintLeaguer.objects.filter(accounts_id=accounts_id).values_list('pgkey_id', flat=True)
                prog_pgkeys = SysConstraintProgram.objects.filter(obj_name=obj_name, pgkey_id__in=leaguer_pgkeys).values_list('pgkey_id', flat=True)
                
                # 刪除符合 keycol 的 constraint (因為有 CASCADE，子表也會被刪除)
                SysConstraint.objects.filter(gkey__in=prog_pgkeys, hisystem=hisystem, keycol=keycol).delete()

                # 2. 如果 values 不為空，則建立新的 constraint
                if values:
                    new_pgkey = generate_pb_gkey()
                    SysConstraint.objects.create(
                        gkey=new_pgkey,
                        hisystem=hisystem,
                        cname=f"{accounts_id}_{obj_name}_{keycol}",
                        keycol=keycol,
                        constraint_type=constraint_type
                    )

                    SysConstraintProgram.objects.create(
                        pgkey_id=new_pgkey,
                        obj_name=obj_name
                    )

                    SysConstraintLeaguer.objects.create(
                        pgkey_id=new_pgkey,
                        accounts_id=accounts_id
                    )

                    for val in values:
                        SysConstraintDetail.objects.create(
                            pgkey_id=new_pgkey,
                            cgkey=val['cgkey'],
                            cname=val.get('cname')
                        )

            return Response({"success": True, "message": "資料範圍約束儲存成功。"})
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
