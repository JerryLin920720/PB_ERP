from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'ba001', views.Ba001ViewSet, basename='ba001')
router.register(r'ba002', views.Ba002ViewSet, basename='ba002')
router.register(r'ba003', views.Ba003ViewSet, basename='ba003')
router.register(r'ba004', views.Ba004ViewSet, basename='ba004')
router.register(r'ba005', views.Ba005ViewSet, basename='ba005')
router.register(r'ba009', views.Ba009ViewSet, basename='ba009')
router.register(r'ba020', views.Ba020ViewSet, basename='ba020')
router.register(r'ba040', views.Ba040ViewSet, basename='ba040')
router.register(r'ba045', views.Ba045ViewSet, basename='ba045')
router.register(r'ba050', views.Ba050ViewSet, basename='ba050')
router.register(r'ba055', views.Ba055ViewSet, basename='ba055')
router.register(r'ba060', views.Ba060ViewSet, basename='ba060')
router.register(r'ba061', views.Ba061ViewSet, basename='ba061')
router.register(r'ab230', views.Ab230ViewSet, basename='ab230')
router.register(r'ab231', views.Ab231ViewSet, basename='ab231')
router.register(r'ba065', views.Ba065ViewSet, basename='ba065')
router.register(r'ba070', views.Ba070ViewSet, basename='ba070')
router.register(r'ba075', views.Ba075ViewSet, basename='ba075')
router.register(r'ba076', views.Ba076ViewSet, basename='ba076')
router.register(r'ba080', views.Ba080ViewSet, basename='ba080')
router.register(r'ba090', views.Ba090ViewSet, basename='ba090')
router.register(r'ba091', views.Ba091ViewSet, basename='ba091')
router.register(r'ba092', views.Ba092ViewSet, basename='ba092')
router.register(r'ba015', views.Ba015ViewSet, basename='ba015')
router.register(r'ba016', views.Ba016ViewSet, basename='ba016')
router.register(r'ba010', views.Ba010ViewSet, basename='ba010')
router.register(r'ba011', views.Ba011ViewSet, basename='ba011')
router.register(r'ba012', views.Ba012ViewSet, basename='ba012')
router.register(r'ba013', views.Ba013ViewSet, basename='ba013')
router.register(r'ba014', views.Ba014ViewSet, basename='ba014')
router.register(r'ba085', views.Ba085ViewSet, basename='ba085')
router.register(r'mr035', views.Mr035ViewSet, basename='mr035')
router.register(r'mr010', views.Mr010ViewSet, basename='mr010')
router.register(r'sys_accounts', views.SysAccountViewSet, basename='sys_accounts')
router.register(r'sys-menu', views.SysMenuViewSet, basename='sys-menu')
router.register(r'sys-popedom-desc', views.SysPopedomDescViewSet, basename='sys-popedom-desc')
router.register(r'sys-menu-column', views.SysMenuColumnViewSet, basename='sys-menu-column')
router.register(r'es101', views.Es101ViewSet, basename='es101')
router.register(r'es102', views.Es102ViewSet, basename='es102')
router.register(r'es103', views.Es103ViewSet, basename='es103')
router.register(r'es104', views.Es104ViewSet, basename='es104')

# 👞 開發部門管理系統 (Product Development - DP)
router.register(r'dp001', views.Dp001ViewSet, basename='dp001')
router.register(r'dp002', views.Dp002ViewSet, basename='dp002')
router.register(r'dp003', views.Dp003ViewSet, basename='dp003')
router.register(r'dp004', views.Dp004ViewSet, basename='dp004')
router.register(r'dp004a', views.Dp004AViewSet, basename='dp004a')

router.register(r'dp005', views.Dp005ViewSet, basename='dp005')
router.register(r'dp006', views.Dp006ViewSet, basename='dp006')
router.register(r'dp008', views.Dp008ViewSet, basename='dp008')
router.register(r'dp009', views.Dp009ViewSet, basename='dp009')
router.register(r'dp007', views.Dp007ViewSet, basename='dp007')
router.register(r'dp010', views.Dp010ViewSet, basename='dp010')
router.register(r'dp015', views.Dp015ViewSet, basename='dp015')
router.register(r'dp020', views.Dp020ViewSet, basename='dp020')
router.register(r'dp016', views.Dp016ViewSet, basename='dp016')
router.register(r'dp017', views.Dp017ViewSet, basename='dp017')
router.register(r'dp018', views.Dp018ViewSet, basename='dp018')
router.register(r'dp011', views.Dp011ViewSet, basename='dp011')
router.register(r'dp012', views.Dp012ViewSet, basename='dp012')
router.register(r'dp013', views.Dp013ViewSet, basename='dp013')
router.register(r'dp014', views.Dp014ViewSet, basename='dp014')
router.register(r'dp023', views.Dp023ViewSet, basename='dp023')
router.register(r'dp025', views.Dp025ViewSet, basename='dp025')
router.register(r'dp026', views.Dp026ViewSet, basename='dp026')
router.register(r'dp027', views.Dp027ViewSet, basename='dp027')
router.register(r'dp028', views.Dp028ViewSet, basename='dp028')
router.register(r'dp030', views.Dp030ViewSet, basename='dp030')
router.register(r'dp031', views.Dp031ViewSet, basename='dp031')
router.register(r'dp032', views.Dp032ViewSet, basename='dp032')
router.register(r'dp033', views.Dp033ViewSet, basename='dp033')
router.register(r'dp034', views.Dp034ViewSet, basename='dp034')
router.register(r'dp035', views.Dp035ViewSet, basename='dp035')
router.register(r'dp104', views.Dp104ViewSet, basename='dp104')
router.register(r'dp040', views.Dp040ViewSet, basename='dp040')
router.register(r'dp041', views.Dp041ViewSet, basename='dp041')
router.register(r'dp042', views.Dp042ViewSet, basename='dp042')
router.register(r'dp043', views.Dp043ViewSet, basename='dp043')
router.register(r'dp080', views.Dp080ViewSet, basename='dp080')
router.register(r'dp081', views.Dp081ViewSet, basename='dp081')
router.register(r'dp082', views.Dp082ViewSet, basename='dp082')
router.register(r'dp100', views.Dp100ViewSet, basename='dp100')
router.register(r'dp101', views.Dp101ViewSet, basename='dp101')
router.register(r'dp055', views.Dp055ViewSet, basename='dp055')  # DP055 樣品成本核算
router.register(r'dp060', views.Dp060ViewSet, basename='dp060')
router.register(r'dp065', views.Dp065ViewSet, basename='dp065')
router.register(r'dp070', views.Dp070ViewSet, basename='dp070')

router.register(r'dp095', views.Dp095ViewSet, basename='dp095')

router.register(r'mr001', views.Mr001ViewSet, basename='mr001')
router.register(r'mr002', views.Mr002ViewSet, basename='mr002')
router.register(r'mr015', views.Mr015ViewSet, basename='mr015')
router.register(r'mr016', views.Mr016ViewSet, basename='mr016')
router.register(r'mr020', views.Mr020ViewSet, basename='mr020')
router.register(r'mr025', views.Mr025ViewSet, basename='mr025')
router.register(r'mr030', views.Mr030ViewSet, basename='mr030')
router.register(r'mr031', views.Mr031ViewSet, basename='mr031')

# 💼 業務部門管理系統 (Sales Administration - SA) - Pattern A
router.register(r'sa001', views.Sa001ViewSet, basename='sa001')
router.register(r'sa005', views.Sa005ViewSet, basename='sa005')
router.register(r'sa006', views.Sa006ViewSet, basename='sa006')
router.register(r'sa007', views.Sa007ViewSet, basename='sa007')


urlpatterns = [
    path('', include(router.urls)),
    path('health/', views.system_health, name='system_health'),
    path('dashboard/stats/', views.dashboard_stats, name='dashboard_stats'),
    path('dashboard/analytics/', views.dashboard_analytics, name='dashboard_analytics'),
    path('uploads/images/', views.upload_image, name='upload_image'),
    
    # 🔐 Authentication and Authorization Endpoints
    path('auth/login/', views.auth_login, name='auth_login'),
    path('auth/logout/', views.auth_logout, name='auth_logout'),
    path('auth/me/', views.auth_me, name='auth_me'),
    path('auth/permissions/', views.auth_permissions, name='auth_permissions'),
    path('auth/menu/', views.auth_menu, name='auth_menu'),
    
    # 🔑 User & Group Permission matrix workbench endpoints
    path('auth/users/', views.auth_users, name='auth_users'),
    path('auth/users/<str:accounts_id>/', views.auth_user_detail, name='auth_user_detail'),
    path('auth/users/<str:accounts_id>/disable/', views.auth_user_disable, name='auth_user_disable'),
    path('auth/users/<str:accounts_id>/enable/', views.auth_user_enable, name='auth_user_enable'),
    path('auth/groups/', views.auth_groups, name='auth_groups'),
    path('auth/groups/<str:group_code>/', views.auth_group_detail, name='auth_group_detail'),
    path('auth/user-groups/', views.auth_user_groups, name='auth_user_groups'),
    path('auth/permission-matrix/', views.auth_permission_matrix, name='auth_permission_matrix'),
    path('auth/save-permissions/', views.auth_save_permissions, name='auth_save_permissions'),
    path('auth/copy-permissions/', views.auth_copy_permissions, name='auth_copy_permissions'),
    path('auth/apply-group-permissions/', views.auth_apply_group_permissions, name='auth_apply_group_permissions'),
]

