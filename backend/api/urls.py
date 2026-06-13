from django.urls import path, include
from rest_framework.routers import DefaultRouter


from api.modules.ba.views import (
    Ab230ViewSet,
    Ab231ViewSet,
    Ba001ViewSet,
    Ba002ViewSet,
    Ba003ViewSet,
    Ba004ViewSet,
    Ba005ViewSet,
    Ba009ViewSet,
    Ba010ViewSet,
    Ba011ViewSet,
    Ba012ViewSet,
    Ba013ViewSet,
    Ba014ViewSet,
    Ba015ViewSet,
    Ba016ViewSet,
    Ba020ViewSet,
    Ba040ViewSet,
    Ba045ViewSet,
    Ba050ViewSet,
    Ba055ViewSet,
    Ba060ViewSet,
    Ba061ViewSet,
    Ba065ViewSet,
    Ba070ViewSet,
    Ba075ViewSet,
    Ba076ViewSet,
    Ba080ViewSet,
    Ba085ViewSet,
    Ba090ViewSet,
    Ba091ViewSet,
    Ba092ViewSet
)
from api.modules.common.views import (
    dashboard_stats,
    system_health,
    upload_image
)
from api.modules.dp.views import (
    Dp001ViewSet,
    Dp002ViewSet,
    Dp003ViewSet,
    Dp004AViewSet,
    Dp004ViewSet,
    Dp005ViewSet,
    Dp006ViewSet,
    Dp007ViewSet,
    Dp008ViewSet,
    Dp009ViewSet,
    Dp010ViewSet,
    Dp011ViewSet,
    Dp012ViewSet,
    Dp013ViewSet,
    Dp014ViewSet,
    Dp015ViewSet,
    Dp016ViewSet,
    Dp017ViewSet,
    Dp018ViewSet,
    Dp020ViewSet,
    Dp023ViewSet,
    Dp025ViewSet,
    Dp026ViewSet,
    Dp027ViewSet,
    Dp028ViewSet,
    Dp030ViewSet,
    Dp031ViewSet,
    Dp032ViewSet,
    Dp033ViewSet,
    Dp034ViewSet,
    Dp035ViewSet,
    Dp040ViewSet,
    Dp041ViewSet,
    Dp042ViewSet,
    Dp043ViewSet,
    Dp055ViewSet,
    Dp060ViewSet,
    Dp065ViewSet,
    Dp070ViewSet,
    Dp080ViewSet,
    Dp081ViewSet,
    Dp082ViewSet,
    Dp095ViewSet,
    Dp100ViewSet,
    Dp101ViewSet,
    Dp104ViewSet,
    dashboard_analytics
)
from api.modules.es.views import (
    Es101ViewSet,
    Es102ViewSet,
    Es103ViewSet,
    Es104ViewSet
)
from api.modules.mr.views import (
    Mr001ViewSet,
    Mr002ViewSet,
    Mr010ViewSet,
    Mr015ViewSet,
    Mr016ViewSet,
    Mr020ViewSet,
    Mr025ViewSet,
    Mr030ViewSet,
    Mr031ViewSet,
    Mr035ViewSet
)
from api.modules.sa.views import (
    Sa001ViewSet,
    Sa005ViewSet,
    Sa006ViewSet,
    Sa007ViewSet
)
from api.modules.sys.views import (
    SysAccountsColumnViewSet,
    SysAccountViewSet,
    SysConstraintViewSet,
    SysMenuColumnViewSet,
    SysMenuViewSet,
    SysParameterViewSet,
    SysPopedomDescViewSet,
    auth_apply_group_permissions,
    auth_copy_permissions,
    auth_group_detail,
    auth_groups,
    auth_login,
    auth_logout,
    auth_me,
    auth_menu,
    auth_permission_matrix,
    auth_permissions,
    auth_save_permissions,
    auth_user_detail,
    auth_user_disable,
    auth_user_enable,
    auth_user_groups,
    auth_users
)


router = DefaultRouter()
router.register(r'ba001', Ba001ViewSet, basename='ba001')
router.register(r'ba002', Ba002ViewSet, basename='ba002')
router.register(r'ba003', Ba003ViewSet, basename='ba003')
router.register(r'ba004', Ba004ViewSet, basename='ba004')
router.register(r'ba005', Ba005ViewSet, basename='ba005')
router.register(r'ba009', Ba009ViewSet, basename='ba009')
router.register(r'ba020', Ba020ViewSet, basename='ba020')
router.register(r'ba040', Ba040ViewSet, basename='ba040')
router.register(r'ba045', Ba045ViewSet, basename='ba045')
router.register(r'ba050', Ba050ViewSet, basename='ba050')
router.register(r'ba055', Ba055ViewSet, basename='ba055')
router.register(r'ba060', Ba060ViewSet, basename='ba060')
router.register(r'ba061', Ba061ViewSet, basename='ba061')
router.register(r'ab230', Ab230ViewSet, basename='ab230')
router.register(r'ab231', Ab231ViewSet, basename='ab231')
router.register(r'ba065', Ba065ViewSet, basename='ba065')
router.register(r'ba070', Ba070ViewSet, basename='ba070')
router.register(r'ba075', Ba075ViewSet, basename='ba075')
router.register(r'ba076', Ba076ViewSet, basename='ba076')
router.register(r'ba080', Ba080ViewSet, basename='ba080')
router.register(r'ba090', Ba090ViewSet, basename='ba090')
router.register(r'ba091', Ba091ViewSet, basename='ba091')
router.register(r'ba092', Ba092ViewSet, basename='ba092')
router.register(r'ba015', Ba015ViewSet, basename='ba015')
router.register(r'ba016', Ba016ViewSet, basename='ba016')
router.register(r'ba010', Ba010ViewSet, basename='ba010')
router.register(r'ba011', Ba011ViewSet, basename='ba011')
router.register(r'ba012', Ba012ViewSet, basename='ba012')
router.register(r'ba013', Ba013ViewSet, basename='ba013')
router.register(r'ba014', Ba014ViewSet, basename='ba014')
router.register(r'ba085', Ba085ViewSet, basename='ba085')
router.register(r'mr035', Mr035ViewSet, basename='mr035')
router.register(r'mr010', Mr010ViewSet, basename='mr010')
router.register(r'sys_accounts', SysAccountViewSet, basename='sys_accounts')
router.register(r'sys-menu', SysMenuViewSet, basename='sys-menu')
router.register(r'sys-popedom-desc', SysPopedomDescViewSet, basename='sys-popedom-desc')
router.register(r'sys-menu-column', SysMenuColumnViewSet, basename='sys-menu-column')
router.register(r'sys-parameter', SysParameterViewSet, basename='sys-parameter')
router.register(r'sys-accounts-column', SysAccountsColumnViewSet, basename='sys-accounts-column')
router.register(r'sys-constraint', SysConstraintViewSet, basename='sys-constraint')
router.register(r'es101', Es101ViewSet, basename='es101')
router.register(r'es102', Es102ViewSet, basename='es102')
router.register(r'es103', Es103ViewSet, basename='es103')
router.register(r'es104', Es104ViewSet, basename='es104')

# 👞 開發部門管理系統 (Product Development - DP)
router.register(r'dp001', Dp001ViewSet, basename='dp001')
router.register(r'dp002', Dp002ViewSet, basename='dp002')
router.register(r'dp003', Dp003ViewSet, basename='dp003')
router.register(r'dp004', Dp004ViewSet, basename='dp004')
router.register(r'dp004a', Dp004AViewSet, basename='dp004a')

router.register(r'dp005', Dp005ViewSet, basename='dp005')
router.register(r'dp006', Dp006ViewSet, basename='dp006')
router.register(r'dp008', Dp008ViewSet, basename='dp008')
router.register(r'dp009', Dp009ViewSet, basename='dp009')
router.register(r'dp007', Dp007ViewSet, basename='dp007')
router.register(r'dp010', Dp010ViewSet, basename='dp010')
router.register(r'dp015', Dp015ViewSet, basename='dp015')
router.register(r'dp020', Dp020ViewSet, basename='dp020')
router.register(r'dp016', Dp016ViewSet, basename='dp016')
router.register(r'dp017', Dp017ViewSet, basename='dp017')
router.register(r'dp018', Dp018ViewSet, basename='dp018')
router.register(r'dp011', Dp011ViewSet, basename='dp011')
router.register(r'dp012', Dp012ViewSet, basename='dp012')
router.register(r'dp013', Dp013ViewSet, basename='dp013')
router.register(r'dp014', Dp014ViewSet, basename='dp014')
router.register(r'dp023', Dp023ViewSet, basename='dp023')
router.register(r'dp025', Dp025ViewSet, basename='dp025')
router.register(r'dp026', Dp026ViewSet, basename='dp026')
router.register(r'dp027', Dp027ViewSet, basename='dp027')
router.register(r'dp028', Dp028ViewSet, basename='dp028')
router.register(r'dp030', Dp030ViewSet, basename='dp030')
router.register(r'dp031', Dp031ViewSet, basename='dp031')
router.register(r'dp032', Dp032ViewSet, basename='dp032')
router.register(r'dp033', Dp033ViewSet, basename='dp033')
router.register(r'dp034', Dp034ViewSet, basename='dp034')
router.register(r'dp035', Dp035ViewSet, basename='dp035')
router.register(r'dp104', Dp104ViewSet, basename='dp104')
router.register(r'dp040', Dp040ViewSet, basename='dp040')
router.register(r'dp041', Dp041ViewSet, basename='dp041')
router.register(r'dp042', Dp042ViewSet, basename='dp042')
router.register(r'dp043', Dp043ViewSet, basename='dp043')
router.register(r'dp080', Dp080ViewSet, basename='dp080')
router.register(r'dp081', Dp081ViewSet, basename='dp081')
router.register(r'dp082', Dp082ViewSet, basename='dp082')
router.register(r'dp100', Dp100ViewSet, basename='dp100')
router.register(r'dp101', Dp101ViewSet, basename='dp101')
router.register(r'dp055', Dp055ViewSet, basename='dp055')  # DP055 樣品成本核算
router.register(r'dp060', Dp060ViewSet, basename='dp060')
router.register(r'dp065', Dp065ViewSet, basename='dp065')
router.register(r'dp070', Dp070ViewSet, basename='dp070')

router.register(r'dp095', Dp095ViewSet, basename='dp095')

router.register(r'mr001', Mr001ViewSet, basename='mr001')
router.register(r'mr002', Mr002ViewSet, basename='mr002')
router.register(r'mr015', Mr015ViewSet, basename='mr015')
router.register(r'mr016', Mr016ViewSet, basename='mr016')
router.register(r'mr020', Mr020ViewSet, basename='mr020')
router.register(r'mr025', Mr025ViewSet, basename='mr025')
router.register(r'mr030', Mr030ViewSet, basename='mr030')
router.register(r'mr031', Mr031ViewSet, basename='mr031')

# 💼 業務部門管理系統 (Sales Administration - SA) - Pattern A
router.register(r'sa001', Sa001ViewSet, basename='sa001')
router.register(r'sa005', Sa005ViewSet, basename='sa005')
router.register(r'sa006', Sa006ViewSet, basename='sa006')
router.register(r'sa007', Sa007ViewSet, basename='sa007')


urlpatterns = [
    path('', include(router.urls)),
    path('health/', system_health, name='system_health'),
    path('dashboard/stats/', dashboard_stats, name='dashboard_stats'),
    path('dashboard/analytics/', dashboard_analytics, name='dashboard_analytics'),
    path('uploads/images/', upload_image, name='upload_image'),
    
    # 🔐 Authentication and Authorization Endpoints
    path('auth/login/', auth_login, name='auth_login'),
    path('auth/logout/', auth_logout, name='auth_logout'),
    path('auth/me/', auth_me, name='auth_me'),
    path('auth/permissions/', auth_permissions, name='auth_permissions'),
    path('auth/menu/', auth_menu, name='auth_menu'),
    
    # 🔑 User & Group Permission matrix workbench endpoints
    path('auth/users/', auth_users, name='auth_users'),
    path('auth/users/<str:accounts_id>/', auth_user_detail, name='auth_user_detail'),
    path('auth/users/<str:accounts_id>/disable/', auth_user_disable, name='auth_user_disable'),
    path('auth/users/<str:accounts_id>/enable/', auth_user_enable, name='auth_user_enable'),
    path('auth/groups/', auth_groups, name='auth_groups'),
    path('auth/groups/<str:group_code>/', auth_group_detail, name='auth_group_detail'),
    path('auth/user-groups/', auth_user_groups, name='auth_user_groups'),
    path('auth/permission-matrix/', auth_permission_matrix, name='auth_permission_matrix'),
    path('auth/save-permissions/', auth_save_permissions, name='auth_save_permissions'),
    path('auth/copy-permissions/', auth_copy_permissions, name='auth_copy_permissions'),
    path('auth/apply-group-permissions/', auth_apply_group_permissions, name='auth_apply_group_permissions'),
]

