from django.db import connection
from django.utils import timezone
from rest_framework.test import APITestCase
from api.models import SysAccount, SysMenu, SysPopedom, SysPopedomDesc, SysAccountsActive, SysMenuColumn, SysPopedomGroup, SysAccountsGroup, Es101

from core.authz.services import (
    normalize_action,
    is_admin,
    get_permission_index,
    has_program_permission,
    has_menu_permission,
    build_permission_map,
    build_menu_tree,
)

class AuthzPermissionsTests(APITestCase):
    @classmethod
    def setUpClass(cls):
        # 由於 managed = False 在 Django 測試中預設不會建表，我們在此手動在測試資料庫中建立表格
        with connection.cursor() as cursor:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sys_accounts (
                    gkey VARCHAR(20) PRIMARY KEY,
                    hisystem VARCHAR(10),
                    accounts_id VARCHAR(50) UNIQUE,
                    user_id VARCHAR(20) UNIQUE,
                    accounts VARCHAR(50),
                    user_pwd VARCHAR(255),
                    peopdom_class VARCHAR(10),
                    create_date TIMESTAMP,
                    status_sign VARCHAR(1)
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sys_menu (
                    prg_code VARCHAR(20) PRIMARY KEY,
                    obj_name VARCHAR(40),
                    prg_name VARCHAR(40),
                    parent_code VARCHAR(10),
                    fram_class VARCHAR(1),
                    prg_serialno DECIMAL(10, 2),
                    sysflag VARCHAR(1),
                    chinesebigname VARCHAR(40),
                    chinesesimpname VARCHAR(40),
                    englishname VARCHAR(100),
                    vietnamname VARCHAR(40),
                    initflag VARCHAR(1),
                    startqty VARCHAR(4),
                    endqty VARCHAR(4),
                    yearly VARCHAR(4),
                    season VARCHAR(20),
                    pictype VARCHAR(1),
                    makerdf VARCHAR(1)
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sys_popedom (
                    id SERIAL PRIMARY KEY,
                    accounts_id VARCHAR(50),
                    obj_name VARCHAR(40),
                    prg_popedom VARCHAR(20),
                    flag VARCHAR(10),
                    hisystem VARCHAR(10)
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sys_popedom_desc (
                    id SERIAL PRIMARY KEY,
                    hisystem VARCHAR(10),
                    obj_name VARCHAR(40),
                    popedom_id VARCHAR(30),
                    popedom_desc VARCHAR(20),
                    popedom_index INTEGER
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sys_accounts_active (
                    gkey VARCHAR(20) PRIMARY KEY,
                    hisystem VARCHAR(10),
                    accounts_id VARCHAR(50),
                    logintime TIMESTAMP,
                    computername VARCHAR(50),
                    loginip VARCHAR(50),
                    spid INTEGER,
                    win_login VARCHAR(50)
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sys_menu_column (
                    hisystem VARCHAR(10),
                    obj_name VARCHAR(40),
                    db_name VARCHAR(50),
                    display_name VARCHAR(40),
                    PRIMARY KEY (hisystem, obj_name, db_name)
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sys_popedom_group (
                    hisystem VARCHAR(10),
                    group_code VARCHAR(20) PRIMARY KEY,
                    group_name VARCHAR(20)
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sys_accounts_group (
                    hisystem VARCHAR(10),
                    accounts_id VARCHAR(50),
                    group_code VARCHAR(20),
                    PRIMARY KEY (hisystem, accounts_id, group_code)
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS es101 (
                    gkey VARCHAR(20) PRIMARY KEY,
                    employeeno VARCHAR(20) UNIQUE,
                    idno VARCHAR(20),
                    chinesename VARCHAR(20),
                    englishname VARCHAR(30)
                )
            """)
            try:
                cursor.execute("ALTER TABLE sys_accounts ALTER COLUMN user_pwd TYPE VARCHAR(255)")
            except Exception:
                pass
        super().setUpClass()

    def setUp(self):
        # 建立測試帳號
        self.admin = SysAccount.objects.create(
            gkey="admin_gkey",
            hisystem="01",
            accounts_id="ADMIN",
            user_id="user_admin",
            accounts="Admin User",
            user_pwd="pwd",
            peopdom_class="5", # 管理員
            create_date=timezone.now(),
            status_sign="0"
        )
        self.user = SysAccount.objects.create(
            gkey="user_gkey",
            hisystem="01",
            accounts_id="USER",
            user_id="user_general",
            accounts="General User",
            user_pwd="pwd",
            peopdom_class="1", # 一般使用者
            create_date=timezone.now(),
            status_sign="0"
        )

    def test_normalize_action(self):
        # 驗證 Fallback 映射規則
        self.assertEqual(normalize_action("inquire"), "search")
        self.assertEqual(normalize_action("query"), "search")
        self.assertEqual(normalize_action("append"), "edit")
        self.assertEqual(normalize_action("insert"), "edit")
        self.assertEqual(normalize_action("cross"), "edit")
        self.assertEqual(normalize_action("recheck"), "check")
        self.assertEqual(normalize_action("prints"), "print")
        self.assertEqual(normalize_action("xcopy"), "new")
        self.assertEqual(normalize_action("some_other_action"), "some_other_action")

    def test_is_admin(self):
        # 1. 管理員 (peopdom_class = '5' / '9')
        self.assertTrue(is_admin(self.admin))
        # 2. 一般使用者 (peopdom_class = '1')
        self.assertFalse(is_admin(self.user))

    def test_get_permission_index_exact_and_fallback(self):
        # 註冊權限說明項目
        SysPopedomDesc.objects.create(
            hisystem="01",
            obj_name="w_dp030",
            popedom_id="new",
            popedom_desc="新增",
            popedom_index=1
        )
        SysPopedomDesc.objects.create(
            hisystem="01",
            obj_name="w_dp030",
            popedom_id="edit",
            popedom_desc="修改",
            popedom_index=2
        )
        SysPopedomDesc.objects.create(
            hisystem="01",
            obj_name="w_dp030",
            popedom_id="search",
            popedom_desc="尋找",
            popedom_index=3
        )

        # 精確匹配
        self.assertEqual(get_permission_index("w_dp030", "new"), 1)
        # Fallback 匹配 (query -> search)
        self.assertEqual(get_permission_index("w_dp030", "query"), 3)
        # Fallback 匹配 (insertrow -> new 先行)
        self.assertEqual(get_permission_index("w_dp030", "insertrow"), 1)

    def test_admin_passes_all_permissions(self):
        # 管理員不需要任何 sys_popedom 記錄即擁有所有權限
        self.assertTrue(has_program_permission(self.admin, "w_dp030", "delete"))
        self.assertTrue(has_menu_permission(self.admin, "w_dp030"))

    def test_general_user_no_popedom_has_no_menu_permission(self):
        # 一般使用者無 sys_popedom 記錄，預設無選單與操作權限
        self.assertFalse(has_menu_permission(self.user, "w_dp030"))
        self.assertFalse(has_program_permission(self.user, "w_dp030", "new", strict_backend=True))

    def test_flag_1_only_affects_menu_permission(self):
        # 設定 flag='1' 的選單可見性遮罩
        SysPopedom.objects.create(
            accounts_id=self.user.accounts_id,
            obj_name="w_dp030",
            prg_popedom="1111111111111",
            flag="1",
            hisystem="01"
        )
        
        # 選單應可見
        self.assertTrue(has_menu_permission(self.user, "w_dp030"))
        # 但操作按鈕不應可見 (因為無 flag='10' 記錄)
        self.assertFalse(has_program_permission(self.user, "w_dp030", "new", strict_backend=True))

    def test_flag_10_controls_button_action_permissions(self):
        # 註冊權限說明項目
        SysPopedomDesc.objects.create(
            hisystem="01",
            obj_name="w_dp030",
            popedom_id="new",
            popedom_desc="新增",
            popedom_index=1
        )
        SysPopedomDesc.objects.create(
            hisystem="01",
            obj_name="w_dp030",
            popedom_id="edit",
            popedom_desc="修改",
            popedom_index=2
        )
        
        # 設定 flag='10' 操作權限 (位元 1 啟用，位元 2 禁用)
        SysPopedom.objects.create(
            accounts_id=self.user.accounts_id,
            obj_name="w_dp030",
            prg_popedom="1000000000000",
            flag="10",
            hisystem="01"
        )

        # 位元 1 為 '1' -> 允許
        self.assertTrue(has_program_permission(self.user, "w_dp030", "new"))
        # 位元 2 為 '0' -> 拒絕
        self.assertFalse(has_program_permission(self.user, "w_dp030", "edit"))

    def test_bitmask_safety_with_short_prg_popedom(self):
        # 註冊 index=12
        SysPopedomDesc.objects.create(
            hisystem="01",
            obj_name="w_dp030",
            popedom_id="special",
            popedom_desc="特殊",
            popedom_index=12
        )
        
        # 長度只有 5 的遮罩字串 (小於 index 12)
        SysPopedom.objects.create(
            accounts_id=self.user.accounts_id,
            obj_name="w_dp030",
            prg_popedom="11111",
            flag="10",
            hisystem="01"
        )

        # 應安全地回傳 False，不引發陣列越界 exception
        self.assertFalse(has_program_permission(self.user, "w_dp030", "special"))

    def test_build_menu_tree_pruning(self):
        # 建立層級選單
        # 1. 模組資料夾 (fram_class='0') - 基本資料
        SysMenu.objects.create(
            prg_code="BA",
            obj_name="",
            prg_name="基本資料管理系統",
            parent_code=None,
            fram_class="0",
            prg_serialno=1,
            sysflag="0"
        )
        # 2. 模組資料夾 (fram_class='0') - 開發部門
        SysMenu.objects.create(
            prg_code="DP",
            obj_name="",
            prg_name="開發部門管理系統",
            parent_code=None,
            fram_class="0",
            prg_serialno=2,
            sysflag="0"
        )
        # 3. 作業項目 (fram_class='1') - 隸屬開發部門
        SysMenu.objects.create(
            prg_code="DP030",
            obj_name="w_dp030",
            prg_name="樣品單資料管理",
            parent_code="DP",
            fram_class="1",
            prg_serialno=3,
            sysflag="0"
        )

        # 一般使用者無任何選單權限時，菜單樹應完全被 Pruned 成空清單
        empty_tree = build_menu_tree(self.user)
        self.assertEqual(empty_tree, [])

        # 給予一般使用者 DP030 選單權限
        SysPopedom.objects.create(
            accounts_id=self.user.accounts_id,
            obj_name="w_dp030",
            prg_popedom="1000000000000",
            flag="1",
            hisystem="01"
        )

        user_tree = build_menu_tree(self.user)
        
        # 驗證:
        # - DP 包含 DP030 子項目，應被保留
        # - BA 目錄下沒有任何有權限的子作業，應被 Prune 排除
        self.assertEqual(len(user_tree), 1)
        self.assertEqual(user_tree[0]["label"], "開發部門管理系統")
        self.assertEqual(len(user_tree[0]["children"]), 1)
        self.assertEqual(user_tree[0]["children"][0]["programCode"], "DP030")
        self.assertEqual(user_tree[0]["children"][0]["permissionKey"], "w_dp030")

    def test_login_api_success(self):
        # 測試正常登入流程
        response = self.client.post("/api/auth/login/", {
            "username": "USER",
            "password": "pwd"
        }, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertIn("token", response.data)
        self.assertIn("user", response.data)
        self.assertEqual(response.data["user"]["username"], "USER")
        
        # 應自動寫入 SysAccountsActive
        active_sessions = SysAccountsActive.objects.filter(accounts_id="USER")
        self.assertTrue(active_sessions.exists())

    def test_login_api_failure(self):
        # 密碼錯誤
        response = self.client.post("/api/auth/login/", {
            "username": "USER",
            "password": "wrong_password"
        }, format="json")
        self.assertEqual(response.status_code, 401)
        
        # 帳號不存在
        response = self.client.post("/api/auth/login/", {
            "username": "NON_EXISTENT",
            "password": "pwd"
        }, format="json")
        self.assertEqual(response.status_code, 401)

    def _get_django_user(self):
        from django.contrib.auth.models import User
        django_user, _ = User.objects.get_or_create(
            username=self.user.accounts_id,
            defaults={
                'first_name': self.user.accounts[:30],
                'is_active': True,
            }
        )
        return django_user

    def test_logout_api(self):
        from rest_framework.authtoken.models import Token
        django_user = self._get_django_user()
        token, _ = Token.objects.get_or_create(user=django_user)
        
        # 先建立一個假 Session
        SysAccountsActive.objects.create(
            gkey="test_session_gkey",
            hisystem="01",
            accounts_id="USER",
            logintime=timezone.now(),
            computername="TestPC",
            loginip="127.0.0.1",
            spid=1234,
            win_login="TestUser"
        )
        
        self.client.credentials(HTTP_AUTHORIZATION="Token " + token.key)
        response = self.client.post("/api/auth/logout/")
        self.assertEqual(response.status_code, 200)
        
        # Session 應被刪除
        self.assertFalse(SysAccountsActive.objects.filter(accounts_id="USER").exists())

    def test_me_api(self):
        from rest_framework.authtoken.models import Token
        django_user = self._get_django_user()
        token, _ = Token.objects.get_or_create(user=django_user)
        
        self.client.credentials(HTTP_AUTHORIZATION="Token " + token.key)
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["username"], "USER")

    def test_permissions_api(self):
        from rest_framework.authtoken.models import Token
        django_user = self._get_django_user()
        token, _ = Token.objects.get_or_create(user=django_user)
        
        self.client.credentials(HTTP_AUTHORIZATION="Token " + token.key)
        response = self.client.get("/api/auth/permissions/")
        self.assertEqual(response.status_code, 200)

    def test_menu_api(self):
        from rest_framework.authtoken.models import Token
        django_user = self._get_django_user()
        token, _ = Token.objects.get_or_create(user=django_user)
        
        self.client.credentials(HTTP_AUTHORIZATION="Token " + token.key)
        response = self.client.get("/api/auth/menu/")
        self.assertEqual(response.status_code, 200)

    def test_dp031_action_level_permissions_override(self):
        from core import permissions, middleware
        from rest_framework.authtoken.models import Token
        
        # 1. 模擬正式運行環境 (關閉 TESTING 自動放行)
        orig_perm_testing = permissions.TESTING
        orig_mw_testing = middleware.TESTING
        permissions.TESTING = False
        middleware.TESTING = False
        
        try:
            django_user = self._get_django_user()
            token, _ = Token.objects.get_or_create(user=django_user)
            self.client.credentials(HTTP_AUTHORIZATION="Token " + token.key)
            
            # 建立正確登入之在線活躍記錄 (win_login="Web" 與帳號一致)
            session = SysAccountsActive.objects.create(
                gkey="test_session_active",
                hisystem="01",
                accounts_id="USER",
                logintime=timezone.now(),
                computername="WebBrowser",
                loginip="127.0.0.1",
                spid=9999,
                win_login="Web"
            )

            # 建立 SysPopedomDesc 動作索引紀錄，供 get_permission_index 查找
            SysPopedomDesc.objects.create(
                popedom_id="search",
                hisystem="01",
                obj_name="w_dp030",
                popedom_desc="查詢",
                popedom_index=1
            )
            SysPopedomDesc.objects.create(
                popedom_id="search",
                hisystem="01",
                obj_name="w_dp050",
                popedom_desc="查詢",
                popedom_index=1
            )
            
            # --- 測試案例 A：有 w_dp030、無 w_dp050 權限 ---
            SysPopedom.objects.filter(accounts_id="USER").delete()
            # 僅賦予 w_dp030 查詢權限 (遮罩第 0 位為 1)
            SysPopedom.objects.create(
                accounts_id="USER",
                obj_name="w_dp030",
                prg_popedom="1" + "0"*19,
                flag="10",
                hisystem="01"
            )
            
            # 呼叫一般 Dp031 CRUD (GET /api/dp031/) -> 成功
            response = self.client.get("/api/dp031/")
            self.assertEqual(response.status_code, 200)
            
            # 呼叫 dp050_query -> 403 (因為無 w_dp050 權限)
            response = self.client.get("/api/dp031/dp050_query/")
            self.assertEqual(response.status_code, 403)
            
            # --- 測試案例 B：有 w_dp050、無 w_dp030 權限 ---
            SysPopedom.objects.filter(accounts_id="USER").delete()
            # 僅賦予 w_dp050 查詢權限
            SysPopedom.objects.create(
                accounts_id="USER",
                obj_name="w_dp050",
                prg_popedom="1" + "0"*19,
                flag="10",
                hisystem="01"
            )
            
            # 呼叫一般 Dp031 CRUD (GET /api/dp031/) -> 403 (因為無 w_dp030 權限)
            response = self.client.get("/api/dp031/")
            self.assertEqual(response.status_code, 403)
            
            # 呼叫 dp050_query -> 成功進入 (因為未傳 dp031gkey 回傳 400，但不是被 403 阻擋)
            response = self.client.get("/api/dp031/dp050_query/")
            self.assertNotEqual(response.status_code, 403)
            
            # --- 測試案例 C：在線 Session 被踢除 (ActiveSessionMiddleware 驗證) ---
            session.delete()
            response = self.client.get("/api/dp031/")
            self.assertEqual(response.status_code, 401)
            
        finally:
            permissions.TESTING = orig_perm_testing
            middleware.TESTING = orig_mw_testing

    def test_ss001_backend_crud_and_permissions(self):
        from core import permissions, middleware
        from rest_framework.authtoken.models import Token

        # 1. 模擬正式運行環境 (關閉 TESTING 自動放行)
        orig_perm_testing = permissions.TESTING
        orig_mw_testing = middleware.TESTING
        permissions.TESTING = False
        middleware.TESTING = False

        try:
            # 建立 Django 用戶並取得 Token
            django_user = self._get_django_user()
            token, _ = Token.objects.get_or_create(user=django_user)
            self.client.credentials(HTTP_AUTHORIZATION="Token " + token.key)

            # 建立在線活躍記錄 (win_login="Web")
            session = SysAccountsActive.objects.create(
                gkey="active_session_ss001",
                hisystem="01",
                accounts_id="USER",
                logintime=timezone.now(),
                computername="WebBrowser",
                loginip="127.0.0.1",
                spid=8888,
                win_login="Web"
            )

            # 註冊 w_ss001 的權限動作索引
            SysPopedomDesc.objects.create(
                hisystem="01",
                obj_name="w_ss001",
                popedom_id="search",
                popedom_desc="查詢",
                popedom_index=1
            )
            SysPopedomDesc.objects.create(
                hisystem="01",
                obj_name="w_ss001",
                popedom_id="new",
                popedom_desc="新增",
                popedom_index=2
            )
            SysPopedomDesc.objects.create(
                hisystem="01",
                obj_name="w_ss001",
                popedom_id="edit",
                popedom_desc="修改",
                popedom_index=3
            )

            # ----------------------------------------------------
            # 測試 A: 無權限者被 403 擋下
            # ----------------------------------------------------
            # 清除所有 USER 權限記錄
            SysPopedom.objects.filter(accounts_id="USER").delete()

            # GET /api/sys-menu/ -> 403
            response = self.client.get("/api/sys-menu/")
            self.assertEqual(response.status_code, 403)

            # GET /api/sys-popedom-desc/ -> 403
            response = self.client.get("/api/sys-popedom-desc/")
            self.assertEqual(response.status_code, 403)

            # GET /api/sys-menu-column/ -> 403
            response = self.client.get("/api/sys-menu-column/")
            self.assertEqual(response.status_code, 403)

            # ----------------------------------------------------
            # 測試 B: 有權限者可查詢 / 新增 / 修改
            # ----------------------------------------------------
            # 賦予 w_ss001 查詢、新增、修改權限 (遮罩位元 1, 2, 3 為 1)
            SysPopedom.objects.create(
                accounts_id="USER",
                obj_name="w_ss001",
                prg_popedom="111" + "0"*17,
                flag="10",
                hisystem="01"
            )

            # 1. 測試 SysMenu
            # GET /api/sys-menu/ -> 200 OK
            response = self.client.get("/api/sys-menu/")
            self.assertEqual(response.status_code, 200)

            # POST /api/sys-menu/ -> 201 Created
            menu_data = {
                "prg_code": "TEST_PRG",
                "obj_name": "w_test_prg",
                "prg_name": "測試作業",
                "initflag": "1",
                "startqty": "0001",
                "endqty": "9999"
            }
            response = self.client.post("/api/sys-menu/", menu_data, format="json")
            self.assertEqual(response.status_code, 201)
            self.assertEqual(response.data["initflag"], "1")
            self.assertEqual(response.data["startqty"], "0001")

            # PATCH /api/sys-menu/TEST_PRG/ -> 200 OK
            response = self.client.patch("/api/sys-menu/TEST_PRG/", {"prg_name": "更新的測試作業"}, format="json")
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.data["prg_name"], "更新的測試作業")

            # 2. 測試 SysPopedomDesc
            # GET /api/sys-popedom-desc/ -> 200 OK
            response = self.client.get("/api/sys-popedom-desc/")
            self.assertEqual(response.status_code, 200)

            # POST /api/sys-popedom-desc/ -> 201 Created
            popedom_desc_data = {
                "popedom_id": "test_pop_id",
                "hisystem": "01",
                "obj_name": "w_test_prg",
                "popedom_desc": "測試功能",
                "popedom_index": 5
            }
            response = self.client.post("/api/sys-popedom-desc/", popedom_desc_data, format="json")
            self.assertEqual(response.status_code, 201)

            # PATCH /api/sys-popedom-desc/test_pop_id/ -> 200 OK
            response = self.client.patch("/api/sys-popedom-desc/test_pop_id/", {"popedom_desc": "更新的測試功能"}, format="json")
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.data["popedom_desc"], "更新的測試功能")

            # 3. 測試 SysMenuColumn
            # GET /api/sys-menu-column/ -> 200 OK
            response = self.client.get("/api/sys-menu-column/")
            self.assertEqual(response.status_code, 200)

            # POST /api/sys-menu-column/ -> 201 Created
            menu_column_data = {
                "hisystem": "01",
                "obj_name": "w_test_prg",
                "db_name": "test_col_name",
                "display_name": "測試欄位"
            }
            response = self.client.post("/api/sys-menu-column/", menu_column_data, format="json")
            self.assertEqual(response.status_code, 201)

            # PATCH /api/sys-menu-column/test_col_name/ -> 200 OK
            response = self.client.patch("/api/sys-menu-column/test_col_name/", {"display_name": "更新的測試欄位"}, format="json")
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.data["display_name"], "更新的測試欄位")

            # ----------------------------------------------------
            # 測試 C: 依過濾條件查詢
            # ----------------------------------------------------
            # 1. 測試 SysMenuColumn 可依 obj_name / hisystem 過濾
            response = self.client.get("/api/sys-menu-column/", {"obj_name": "w_test_prg"})
            self.assertEqual(response.status_code, 200)
            self.assertEqual(len(response.data), 1)
            self.assertEqual(response.data[0]["obj_name"], "w_test_prg")

            response = self.client.get("/api/sys-menu-column/", {"obj_name": "w_non_existent"})
            self.assertEqual(response.status_code, 200)
            self.assertEqual(len(response.data), 0)

            response = self.client.get("/api/sys-menu-column/", {"hisystem": "01"})
            self.assertEqual(response.status_code, 200)
            self.assertTrue(len(response.data) >= 1)

            # 2. 測試 SysPopedomDesc 可依 obj_name / hisystem 過濾
            response = self.client.get("/api/sys-popedom-desc/", {"obj_name": "w_test_prg"})
            self.assertEqual(response.status_code, 200)
            self.assertEqual(len(response.data), 1)
            self.assertEqual(response.data[0]["obj_name"], "w_test_prg")

            response = self.client.get("/api/sys-popedom-desc/", {"obj_name": "w_non_existent"})
            self.assertEqual(response.status_code, 200)
            self.assertEqual(len(response.data), 0)

            response = self.client.get("/api/sys-popedom-desc/", {"hisystem": "01"})
            self.assertEqual(response.status_code, 200)
            self.assertTrue(len(response.data) >= 1)

            # ----------------------------------------------------
            # 測試 D: 不影響既有 /api/auth/menu/ 與 /api/auth/permissions/
            # ----------------------------------------------------
            response = self.client.get("/api/auth/menu/")
            self.assertEqual(response.status_code, 200)

            response = self.client.get("/api/auth/permissions/")
            self.assertEqual(response.status_code, 200)

            # 清理剛才新增的資料
            session.delete()

        finally:
            # 復原測試環境 flag
            permissions.TESTING = orig_perm_testing
            middleware.TESTING = orig_mw_testing

    def test_ss001_behavior_alignment_validations(self):
        from core import permissions, middleware
        from rest_framework.authtoken.models import Token

        # 1. 模擬正式運行環境 (關閉 TESTING 自動放行)
        orig_perm_testing = permissions.TESTING
        orig_mw_testing = middleware.TESTING
        permissions.TESTING = False
        middleware.TESTING = False

        try:
            # 建立 Django 用戶並取得 Token
            django_user = self._get_django_user()
            token, _ = Token.objects.get_or_create(user=django_user)
            self.client.credentials(HTTP_AUTHORIZATION="Token " + token.key)

            # 建立在線活躍記錄 (win_login="Web")
            session = SysAccountsActive.objects.create(
                gkey="sess_ss001_val",
                hisystem="01",
                accounts_id="USER",
                logintime=timezone.now(),
                computername="WebBrowser",
                loginip="127.0.0.1",
                spid=8888,
                win_login="Web"
            )

            # 註冊 w_ss001 的權限動作索引
            SysPopedomDesc.objects.create(
                hisystem="01",
                obj_name="w_ss001",
                popedom_id="search",
                popedom_desc="查詢",
                popedom_index=1
            )
            SysPopedomDesc.objects.create(
                hisystem="01",
                obj_name="w_ss001",
                popedom_id="new",
                popedom_desc="新增",
                popedom_index=2
            )
            SysPopedomDesc.objects.create(
                hisystem="01",
                obj_name="w_ss001",
                popedom_id="edit",
                popedom_desc="修改",
                popedom_index=3
            )

            # 賦予 w_ss001 查詢、新增、修改權限
            SysPopedom.objects.filter(accounts_id="USER").delete()
            SysPopedom.objects.create(
                accounts_id="USER",
                obj_name="w_ss001",
                prg_popedom="111" + "0"*17,
                flag="10",
                hisystem="01"
            )

            # 1. 測試 popedom_index = 0 時後端阻擋
            popedom_data_0 = {
                "popedom_id": "test_pop_0",
                "hisystem": "01",
                "obj_name": "w_test_prg",
                "popedom_desc": "測試0",
                "popedom_index": 0
            }
            response = self.client.post("/api/sys-popedom-desc/", popedom_data_0, format="json")
            self.assertEqual(response.status_code, 400)
            self.assertIn("權限遮罩索引必須在 1 到 13 之間。", str(response.data))

            # 2. 測試 popedom_index = 14 時後端阻擋
            popedom_data_14 = {
                "popedom_id": "test_pop_14",
                "hisystem": "01",
                "obj_name": "w_test_prg",
                "popedom_desc": "測試14",
                "popedom_index": 14
            }
            response = self.client.post("/api/sys-popedom-desc/", popedom_data_14, format="json")
            self.assertEqual(response.status_code, 400)
            self.assertIn("權限遮罩索引必須在 1 到 13 之間。", str(response.data))

            # 3. 測試 popedom_index = 1~13 時可儲存
            for idx in [1, 7, 13]:
                popedom_data = {
                    "popedom_id": f"test_pop_{idx}",
                    "hisystem": "01",
                    "obj_name": "w_test_prg",
                    "popedom_desc": f"測試{idx}",
                    "popedom_index": idx
                }
                response = self.client.post("/api/sys-popedom-desc/", popedom_data, format="json")
                self.assertEqual(response.status_code, 201)

            # 4. 測試 sys_menu_column db_name 空白時阻擋
            col_data_blank_db = {
                "hisystem": "01",
                "obj_name": "w_test_prg",
                "db_name": "",
                "display_name": "測試欄位"
            }
            response = self.client.post("/api/sys-menu-column/", col_data_blank_db, format="json")
            self.assertEqual(response.status_code, 400)

            # 5. 測試 sys_menu_column display_name 空白時阻擋
            col_data_blank_display = {
                "hisystem": "01",
                "obj_name": "w_test_prg",
                "db_name": "test_col_blank_display",
                "display_name": ""
            }
            response = self.client.post("/api/sys-menu-column/", col_data_blank_display, format="json")
            self.assertEqual(response.status_code, 400)

            # 6. 測試刪除樹節點的防呆（檢查下級）與級聯刪除翻譯
            # 建立 parent 目錄
            SysMenu.objects.create(
                prg_code="P_VAL",
                obj_name="",
                prg_name="Parent Folder",
                fram_class="0",
                prg_serialno=1.0
            )
            # 建立 child 作業
            SysMenu.objects.create(
                prg_code="C_VAL",
                parent_code="P_VAL",
                obj_name="w_child_val",
                prg_name="Child Program",
                fram_class="1",
                prg_serialno=1.1
            )
            # 建立 child 關聯的翻譯欄位
            SysMenuColumn.objects.create(
                hisystem="01",
                obj_name="w_child_val",
                db_name="child_col_1",
                display_name="Child Column 1"
            )

            # 嘗試刪除 parent -> 應阻擋，因為有子節點
            response = self.client.post("/api/sys-menu/P_VAL/delete-node/")
            self.assertEqual(response.status_code, 400)
            self.assertIn("請先刪除下級節點！", response.data.get("detail", ""))

            # 嘗試刪除 child -> 應成功，且級聯刪除其 sys_menu_column
            response = self.client.post("/api/sys-menu/C_VAL/delete-node/")
            self.assertEqual(response.status_code, 200)
            self.assertFalse(SysMenu.objects.filter(prg_code="C_VAL").exists())
            self.assertFalse(SysMenuColumn.objects.filter(obj_name="w_child_val").exists())

            # 再次嘗試刪除 parent -> 應成功
            response = self.client.post("/api/sys-menu/P_VAL/delete-node/")
            self.assertEqual(response.status_code, 200)
            self.assertFalse(SysMenu.objects.filter(prg_code="P_VAL").exists())

            # 清理
            session.delete()

        finally:
            permissions.TESTING = orig_perm_testing
            middleware.TESTING = orig_mw_testing


class PermissionMatrixTests(AuthzPermissionsTests):
    def setUp(self):
        super().setUp()
        from django.contrib.auth.models import User
        from rest_framework.authtoken.models import Token
        
        # Create standard Django user for ADMIN and USER
        self.django_admin, _ = User.objects.get_or_create(
            username=self.admin.accounts_id,
            defaults={'first_name': self.admin.accounts, 'is_active': True}
        )
        self.admin_token, _ = Token.objects.get_or_create(user=self.django_admin)
        
        self.django_user, _ = User.objects.get_or_create(
            username=self.user.accounts_id,
            defaults={'first_name': self.user.accounts, 'is_active': True}
        )
        self.user_token, _ = Token.objects.get_or_create(user=self.django_user)
        
        # Default authorization headers to admin
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.admin_token.key)
        
        # Clear existing data to prevent interference
        SysPopedomDesc.objects.all().delete()
        SysPopedom.objects.all().delete()
        SysMenu.objects.all().delete()
        SysPopedomGroup.objects.all().delete()
        SysAccountsGroup.objects.all().delete()
        
        # Setup basic popedom descs
        SysPopedomDesc.objects.create(hisystem="01", obj_name="w_ss001", popedom_id="search", popedom_desc="查詢", popedom_index=1)
        SysPopedomDesc.objects.create(hisystem="01", obj_name="w_ss001", popedom_id="new", popedom_desc="新增", popedom_index=2)
        SysPopedomDesc.objects.create(hisystem="01", obj_name="w_ss001", popedom_id="edit", popedom_desc="修改", popedom_index=3)
        SysPopedomDesc.objects.create(hisystem="01", obj_name="w_ss001", popedom_id="delete", popedom_desc="刪除", popedom_index=4)
        
        SysPopedomDesc.objects.create(hisystem="01", obj_name="w_sy005", popedom_id="search", popedom_desc="查詢", popedom_index=1)
        SysPopedomDesc.objects.create(hisystem="01", obj_name="w_sy005", popedom_id="edit", popedom_desc="修改", popedom_index=2)
        
        # Setup basic menus
        SysMenu.objects.create(prg_code="SS", obj_name="", prg_name="系統設定", parent_code="", fram_class="0", prg_serialno=1.0)
        SysMenu.objects.create(prg_code="SS001", obj_name="w_ss001", prg_name="選單維護", parent_code="SS", fram_class="1", prg_serialno=2.0)

    def test_save_user_menu_visible_true(self):
        payload = {
            "target_id": "USER",
            "is_group": False,
            "hisystem": "01",
            "permissions": [
                {
                    "obj_name": "w_ss001",
                    "menu_visible": True,
                    "actions": {"search": True, "new": True, "edit": False}
                }
            ]
        }
        response = self.client.post("/api/auth/save-permissions/", payload, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["success"])
        self.assertTrue(response.data["should_refresh_permissions"])
        
        menu_p = SysPopedom.objects.get(accounts_id="USER", obj_name="w_ss001", flag="1", hisystem="01")
        self.assertEqual(menu_p.prg_popedom, "1")

    def test_save_user_menu_visible_false(self):
        payload = {
            "target_id": "USER",
            "is_group": False,
            "hisystem": "01",
            "permissions": [
                {
                    "obj_name": "w_ss001",
                    "menu_visible": False,
                    "actions": {"search": True, "new": True}
                }
            ]
        }
        response = self.client.post("/api/auth/save-permissions/", payload, format="json")
        self.assertEqual(response.status_code, 200)
        
        menu_p = SysPopedom.objects.get(accounts_id="USER", obj_name="w_ss001", flag="1", hisystem="01")
        self.assertEqual(menu_p.prg_popedom, "2")
        
        action_p = SysPopedom.objects.get(accounts_id="USER", obj_name="w_ss001", flag="10", hisystem="01")
        self.assertEqual(action_p.prg_popedom, "00000000000000000000")

    def test_save_user_action_new_edit(self):
        payload = {
            "target_id": "USER",
            "is_group": False,
            "hisystem": "01",
            "permissions": [
                {
                    "obj_name": "w_ss001",
                    "menu_visible": True,
                    "actions": {"search": True, "new": False, "edit": True, "delete": False}
                }
            ]
        }
        response = self.client.post("/api/auth/save-permissions/", payload, format="json")
        self.assertEqual(response.status_code, 200)
        
        action_p = SysPopedom.objects.get(accounts_id="USER", obj_name="w_ss001", flag="10", hisystem="01")
        self.assertEqual(action_p.prg_popedom, "10100000000000000000")

    def test_save_group_permission(self):
        SysPopedomGroup.objects.create(hisystem="01", group_code="GRP1", group_name="Group 1")
        payload = {
            "target_id": "GRP1",
            "is_group": True,
            "hisystem": "01",
            "permissions": [
                {
                    "obj_name": "w_ss001",
                    "menu_visible": True,
                    "actions": {"search": True, "new": True}
                }
            ]
        }
        response = self.client.post("/api/auth/save-permissions/", payload, format="json")
        self.assertEqual(response.status_code, 200)
        
        menu_p = SysPopedom.objects.get(accounts_id="GRP1", obj_name="w_ss001", flag="2", hisystem="01")
        self.assertEqual(menu_p.prg_popedom, "1")
        
        action_p = SysPopedom.objects.get(accounts_id="GRP1", obj_name="w_ss001", flag="20", hisystem="01")
        self.assertEqual(action_p.prg_popedom, "11000000000000000000")

    def test_save_unregistered_action(self):
        payload = {
            "target_id": "USER",
            "is_group": False,
            "hisystem": "01",
            "permissions": [
                {
                    "obj_name": "w_ss001",
                    "menu_visible": True,
                    "actions": {"search": True, "non_existent_action": True}
                }
            ]
        }
        response = self.client.post("/api/auth/save-permissions/", payload, format="json")
        self.assertEqual(response.status_code, 200)
        
        action_p = SysPopedom.objects.get(accounts_id="USER", obj_name="w_ss001", flag="10", hisystem="01")
        self.assertEqual(action_p.prg_popedom, "10000000000000000000")

    def test_save_invalid_target_id(self):
        payload = {
            "target_id": "NON_EXISTENT_USER",
            "is_group": False,
            "hisystem": "01",
            "permissions": []
        }
        response = self.client.post("/api/auth/save-permissions/", payload, format="json")
        self.assertEqual(response.status_code, 400)

    def test_no_w_sy005_edit_permission_returns_403(self):
        # Authenticate as USER (general user without w_sy005 edit permission)
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.user_token.key)
        
        payload = {
            "target_id": "USER",
            "is_group": False,
            "hisystem": "01",
            "permissions": []
        }
        response = self.client.post("/api/auth/save-permissions/", payload, format="json")
        self.assertEqual(response.status_code, 403)
        
        # Grant w_sy005 search permission
        SysPopedom.objects.create(
            accounts_id="USER", obj_name="w_sy005", flag="1", hisystem="01", prg_popedom="1"
        )
        SysPopedom.objects.create(
            accounts_id="USER", obj_name="w_sy005", flag="10", hisystem="01", prg_popedom="10000000000000000000"
        )
        
        # POST save-permissions should still fail (needs edit)
        response = self.client.post("/api/auth/save-permissions/", payload, format="json")
        self.assertEqual(response.status_code, 403)
        
        # Grant edit permission
        SysPopedom.objects.filter(accounts_id="USER", obj_name="w_sy005", flag="10").update(
            prg_popedom="11000000000000000000"
        )
        
        response = self.client.post("/api/auth/save-permissions/", payload, format="json")
        self.assertEqual(response.status_code, 200)

    def test_copy_user_to_user_permission(self):
        SysPopedom.objects.create(accounts_id="ADMIN", obj_name="w_ss001", flag="1", hisystem="01", prg_popedom="1")
        SysPopedom.objects.create(accounts_id="ADMIN", obj_name="w_ss001", flag="10", hisystem="01", prg_popedom="11100000000000000000")
        
        payload = {
            "source_id": "ADMIN",
            "is_source_group": False,
            "target_id": "USER",
            "is_target_group": False,
            "hisystem": "01"
        }
        response = self.client.post("/api/auth/copy-permissions/", payload, format="json")
        self.assertEqual(response.status_code, 200)
        
        menu_p = SysPopedom.objects.get(accounts_id="USER", obj_name="w_ss001", flag="1", hisystem="01")
        self.assertEqual(menu_p.prg_popedom, "1")
        action_p = SysPopedom.objects.get(accounts_id="USER", obj_name="w_ss001", flag="10", hisystem="01")
        self.assertEqual(action_p.prg_popedom, "11100000000000000000")

    def test_copy_group_to_user_flag_mapping(self):
        SysPopedomGroup.objects.create(hisystem="01", group_code="GRP1", group_name="Group 1")
        SysPopedom.objects.create(accounts_id="GRP1", obj_name="w_ss001", flag="2", hisystem="01", prg_popedom="1")
        SysPopedom.objects.create(accounts_id="GRP1", obj_name="w_ss001", flag="20", hisystem="01", prg_popedom="11000000000000000000")
        
        payload = {
            "source_id": "GRP1",
            "is_source_group": True,
            "target_id": "USER",
            "is_target_group": False,
            "hisystem": "01"
        }
        response = self.client.post("/api/auth/copy-permissions/", payload, format="json")
        self.assertEqual(response.status_code, 200)
        
        menu_p = SysPopedom.objects.get(accounts_id="USER", obj_name="w_ss001", flag="1", hisystem="01")
        self.assertEqual(menu_p.prg_popedom, "1")
        action_p = SysPopedom.objects.get(accounts_id="USER", obj_name="w_ss001", flag="10", hisystem="01")
        self.assertEqual(action_p.prg_popedom, "11000000000000000000")

    def test_copy_user_to_group_flag_mapping(self):
        SysPopedomGroup.objects.create(hisystem="01", group_code="GRP1", group_name="Group 1")
        SysPopedom.objects.create(accounts_id="USER", obj_name="w_ss001", flag="1", hisystem="01", prg_popedom="1")
        SysPopedom.objects.create(accounts_id="USER", obj_name="w_ss001", flag="10", hisystem="01", prg_popedom="11110000000000000000")
        
        payload = {
            "source_id": "USER",
            "is_source_group": False,
            "target_id": "GRP1",
            "is_target_group": True,
            "hisystem": "01"
        }
        response = self.client.post("/api/auth/copy-permissions/", payload, format="json")
        self.assertEqual(response.status_code, 200)
        
        menu_p = SysPopedom.objects.get(accounts_id="GRP1", obj_name="w_ss001", flag="2", hisystem="01")
        self.assertEqual(menu_p.prg_popedom, "1")
        action_p = SysPopedom.objects.get(accounts_id="GRP1", obj_name="w_ss001", flag="20", hisystem="01")
        self.assertEqual(action_p.prg_popedom, "11110000000000000000")

    def test_apply_group_permissions_or_merge(self):
        SysPopedomGroup.objects.create(hisystem="01", group_code="GRP1", group_name="Group 1")
        SysPopedomGroup.objects.create(hisystem="01", group_code="GRP2", group_name="Group 2")
        
        SysAccountsGroup.objects.create(hisystem="01", accounts_id="USER", group_code="GRP1")
        SysAccountsGroup.objects.create(hisystem="01", accounts_id="USER", group_code="GRP2")
        
        SysPopedom.objects.create(accounts_id="GRP1", obj_name="w_ss001", flag="2", hisystem="01", prg_popedom="1")
        SysPopedom.objects.create(accounts_id="GRP1", obj_name="w_ss001", flag="20", hisystem="01", prg_popedom="10000000000000000000")
        
        SysPopedom.objects.create(accounts_id="GRP2", obj_name="w_ss001", flag="2", hisystem="01", prg_popedom="2")
        SysPopedom.objects.create(accounts_id="GRP2", obj_name="w_ss001", flag="20", hisystem="01", prg_popedom="01100000000000000000")
        
        payload = {"accounts_id": "USER", "hisystem": "01"}
        response = self.client.post("/api/auth/apply-group-permissions/", payload, format="json")
        self.assertEqual(response.status_code, 200)
        
        menu_p = SysPopedom.objects.get(accounts_id="USER", obj_name="w_ss001", flag="1", hisystem="01")
        self.assertEqual(menu_p.prg_popedom, "1")
        
        action_p = SysPopedom.objects.get(accounts_id="USER", obj_name="w_ss001", flag="10", hisystem="01")
        self.assertEqual(action_p.prg_popedom, "11100000000000000000")

    def test_apply_group_permissions_no_groups(self):
        SysPopedom.objects.create(accounts_id="USER", obj_name="w_ss001", flag="1", hisystem="01", prg_popedom="1")
        SysPopedom.objects.create(accounts_id="USER", obj_name="w_ss001", flag="10", hisystem="01", prg_popedom="11110000000000000000")
        
        payload = {"accounts_id": "USER", "hisystem": "01"}
        response = self.client.post("/api/auth/apply-group-permissions/", payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("該使用者未指派任何群組權限。", response.data.get("detail", ""))
        
        self.assertTrue(SysPopedom.objects.filter(accounts_id="USER", flag="1").exists())
        self.assertTrue(SysPopedom.objects.filter(accounts_id="USER", flag="10").exists())

    def test_permission_matrix_read_api(self):
        SysPopedom.objects.create(accounts_id="USER", obj_name="w_ss001", flag="1", hisystem="01", prg_popedom="1")
        SysPopedom.objects.create(accounts_id="USER", obj_name="w_ss001", flag="10", hisystem="01", prg_popedom="11000000000000000000")
        
        response = self.client.get("/api/auth/permission-matrix/", {"target_id": "USER", "is_group": "false", "hisystem": "01"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["target_id"], "USER")
        self.assertEqual(response.data["is_group"], False)
        
        menus = response.data["menus"]
        ss001_node = next(m for m in menus if m["prg_code"] == "SS001")
        self.assertEqual(ss001_node["menu_visible"], True)
        self.assertEqual(ss001_node["actions"]["search"], True)
        self.assertEqual(ss001_node["actions"]["new"], True)
        self.assertEqual(ss001_node["actions"]["edit"], False)
        self.assertEqual(ss001_node["actions"]["delete"], False)

    def test_c1_3d_user_crud(self):
        # 1. Mock Es101
        emp = Es101.objects.create(gkey="emp_gkey_1", employeeno="E001", idno="ID001", chinesename="張三", englishname="John")
        
        # 2. Create User
        payload = {
            "accounts": "new_user",
            "user_pwd": "password123",
            "es101_employeeno": "E001",
            "peopdom_class": "1",
            "status_sign": "0",
            "hisystem": "01"
        }
        response = self.client.post("/api/auth/users/", payload, format="json")
        self.assertEqual(response.status_code, 201)
        created_user_id = response.data["accounts_id"]
        self.assertEqual(response.data["accounts"], "new_user")
        
        # Verify password is django-hashed
        u_obj = SysAccount.objects.get(accounts_id=created_user_id)
        from django.contrib.auth.hashers import check_password
        self.assertTrue(check_password("password123", u_obj.user_pwd))
        
        # 3. Update User
        update_payload = {
            "accounts": "new_user_updated",
            "peopdom_class": "2"
        }
        response = self.client.patch(f"/api/auth/users/{created_user_id}/", update_payload, format="json")
        if response.status_code != 200:
            print("PATCH USER RESPONSE DATA:", response.data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["accounts"], "new_user_updated")
        self.assertEqual(response.data["peopdom_class"], "2")
        
        # 4. Disable and Enable
        response = self.client.post(f"/api/auth/users/{created_user_id}/disable/")
        self.assertEqual(response.status_code, 200)
        u_obj.refresh_from_db()
        self.assertEqual(u_obj.status_sign, "1")
        
        response = self.client.post(f"/api/auth/users/{created_user_id}/enable/")
        self.assertEqual(response.status_code, 200)
        u_obj.refresh_from_db()
        self.assertEqual(u_obj.status_sign, "0")
        
        # 5. Delete User (cascade checks)
        # Create some popedom and user-group relation for this user first
        SysPopedom.objects.create(accounts_id=created_user_id, obj_name="w_ss001", flag="1", hisystem="01", prg_popedom="1")
        SysAccountsGroup.objects.create(accounts_id=created_user_id, group_code="GRP1", hisystem="01")
        
        response = self.client.delete(f"/api/auth/users/{created_user_id}/")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(SysAccount.objects.filter(accounts_id=created_user_id).exists())
        self.assertFalse(SysPopedom.objects.filter(accounts_id=created_user_id).exists())
        self.assertFalse(SysAccountsGroup.objects.filter(accounts_id=created_user_id).exists())

    def test_c1_3d_group_crud(self):
        # 1. Create Group
        payload = {
            "group_code": "NEW_GRP",
            "group_name": "New Test Group",
            "hisystem": "01"
        }
        response = self.client.post("/api/auth/groups/", payload, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["group_name"], "New Test Group")
        
        # 2. Update Group Name
        update_payload = {
            "group_name": "New Grp Updated"
        }
        response = self.client.patch(f"/api/auth/groups/NEW_GRP/?hisystem=01", update_payload, format="json")
        if response.status_code != 200:
            print("PATCH GROUP RESPONSE DATA:", response.data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["group_name"], "New Grp Updated")
        
        # 3. Delete Group with Recalculation
        # Let's set up a group GRP1 and assign USER to it. USER also has group GRP2.
        # USER has a manual override on 'w_ss001' action bit 3.
        SysPopedomGroup.objects.create(group_code="GRP1", group_name="Group One", hisystem="01")
        SysPopedomGroup.objects.create(group_code="GRP2", group_name="Group Two", hisystem="01")
        
        SysAccountsGroup.objects.create(accounts_id="USER", group_code="GRP1", hisystem="01")
        SysAccountsGroup.objects.create(accounts_id="USER", group_code="GRP2", hisystem="01")
        
        # GRP1 has 'w_ss001' action: '10000000000000000000'
        SysPopedom.objects.create(accounts_id="GRP1", obj_name="w_ss001", flag="20", hisystem="01", prg_popedom="10000000000000000000")
        # GRP2 has 'w_ss001' action: '01000000000000000000'
        SysPopedom.objects.create(accounts_id="GRP2", obj_name="w_ss001", flag="20", hisystem="01", prg_popedom="01000000000000000000")
        
        # User has action: '11100000000000000000' (bit 1 and 2 from GRP1 & GRP2, bit 3 is manual)
        SysPopedom.objects.create(accounts_id="USER", obj_name="w_ss001", flag="10", hisystem="01", prg_popedom="11100000000000000000")
        
        # Delete GRP1
        response = self.client.delete("/api/auth/groups/GRP1/?hisystem=01")
        if response.status_code != 200:
            print("DELETE GRP1 RESPONSE DATA:", response.data)
        self.assertEqual(response.status_code, 200)
        
        # Verify GRP1 is deleted
        self.assertFalse(SysPopedomGroup.objects.filter(group_code="GRP1").exists())
        self.assertFalse(SysAccountsGroup.objects.filter(group_code="GRP1").exists())
        self.assertFalse(SysPopedom.objects.filter(accounts_id="GRP1").exists())
        
        # Verify USER permissions: GRP1's bit 1 should be gone, but GRP2's bit 2 and manual bit 3 should remain -> '01100000000000000000'
        user_act = SysPopedom.objects.get(accounts_id="USER", obj_name="w_ss001", flag="10", hisystem="01")
        self.assertEqual(user_act.prg_popedom, "01100000000000000000")

    def test_c1_3d_user_group_assign_and_remove(self):
        # Setup Groups
        SysPopedomGroup.objects.create(group_code="GRP1", group_name="Group One", hisystem="01")
        SysPopedom.objects.create(accounts_id="GRP1", obj_name="w_ss001", flag="20", hisystem="01", prg_popedom="10000000000000000000")
        
        # User initially has empty permissions
        SysPopedom.objects.create(accounts_id="USER", obj_name="w_ss001", flag="10", hisystem="01", prg_popedom="00000000000000000000")
        
        # 1. POST assign: apply_permissions=false
        payload = {
            "accounts_id": "USER",
            "group_code": "GRP1",
            "hisystem": "01",
            "apply_permissions": False
        }
        response = self.client.post("/api/auth/user-groups/", payload, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(SysAccountsGroup.objects.filter(accounts_id="USER", group_code="GRP1").exists())
        
        # User permissions should still be empty
        user_act = SysPopedom.objects.get(accounts_id="USER", obj_name="w_ss001", flag="10", hisystem="01")
        self.assertEqual(user_act.prg_popedom, "00000000000000000000")
        
        # Remove connection
        SysAccountsGroup.objects.filter(accounts_id="USER", group_code="GRP1").delete()
        
        # 2. POST assign: apply_permissions=true
        payload["apply_permissions"] = True
        response = self.client.post("/api/auth/user-groups/", payload, format="json")
        self.assertEqual(response.status_code, 200)
        
        # User permissions should now have GRP1's bit 1 -> '10000000000000000000'
        user_act = SysPopedom.objects.get(accounts_id="USER", obj_name="w_ss001", flag="10", hisystem="01")
        self.assertEqual(user_act.prg_popedom, "10000000000000000000")
        
        # 3. DELETE remove: recalculate_permissions=false
        # We manually add bit 3 as override, total: '10100000000000000000'
        SysPopedom.objects.filter(accounts_id="USER", obj_name="w_ss001", flag="10", hisystem="01").update(prg_popedom="10100000000000000000")
        
        delete_payload = {
            "accounts_id": "USER",
            "group_code": "GRP1",
            "hisystem": "01",
            "recalculate_permissions": False
        }
        response = self.client.delete("/api/auth/user-groups/", delete_payload, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(SysAccountsGroup.objects.filter(accounts_id="USER", group_code="GRP1").exists())
        
        # User permissions should NOT change
        user_act = SysPopedom.objects.get(accounts_id="USER", obj_name="w_ss001", flag="10", hisystem="01")
        self.assertEqual(user_act.prg_popedom, "10100000000000000000")
        
        # Add connection back
        SysAccountsGroup.objects.create(accounts_id="USER", group_code="GRP1", hisystem="01")
        
        # 4. DELETE remove: recalculate_permissions=true
        delete_payload["recalculate_permissions"] = True
        response = self.client.delete("/api/auth/user-groups/", delete_payload, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(SysAccountsGroup.objects.filter(accounts_id="USER", group_code="GRP1").exists())
        
        # User permissions should recalculate: GRP1's bit 1 is removed, bit 3 manual remains -> '00100000000000000000'
        user_act = SysPopedom.objects.get(accounts_id="USER", obj_name="w_ss001", flag="10", hisystem="01")
        self.assertEqual(user_act.prg_popedom, "00100000000000000000")

    def test_c1_3d_self_modification_guards(self):
        # Authenticate as USER (a normal administrator for the context of these checks)
        # Grant USER permission to edit w_sy005
        SysPopedom.objects.create(accounts_id="USER", obj_name="w_sy005", flag="1", hisystem="01", prg_popedom="1")
        SysPopedom.objects.create(accounts_id="USER", obj_name="w_sy005", flag="10", hisystem="01", prg_popedom="11000000000000000000")
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.user_token.key)
        
        # 1. Block deleting self
        response = self.client.delete("/api/auth/users/USER/")
        self.assertEqual(response.status_code, 400)
        self.assertIn("禁止刪除自己當前登入的帳號。", response.data.get("detail", ""))
        
        # 2. Block disabling self
        response = self.client.post("/api/auth/users/USER/disable/")
        self.assertEqual(response.status_code, 400)
        self.assertIn("禁止停用自己當前登入的帳號。", response.data.get("detail", ""))
        
        # 3. Block non-superuser adding self to admin group
        SysPopedomGroup.objects.create(group_code="ADMIN_GRP", group_name="系統管理員群組", hisystem="01")
        payload = {
            "accounts_id": "USER",
            "group_code": "ADMIN_GRP",
            "hisystem": "01"
        }
        response = self.client.post("/api/auth/user-groups/", payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("非 superuser 管理員禁止將自己指派加入管理群組。", response.data.get("detail", ""))
        
        # 4. Block self-elevation (change own peopdom_class)
        update_payload = {
            "peopdom_class": "5"
        }
        response = self.client.patch("/api/auth/users/USER/", update_payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("禁止修改自己的權限等級。", response.data.get("detail", ""))
        
        # 5. Block removing last admin group
        SysAccountsGroup.objects.create(accounts_id="USER", group_code="ADMIN_GRP", hisystem="01")
        delete_payload = {
            "accounts_id": "USER",
            "group_code": "ADMIN_GRP",
            "hisystem": "01"
        }
        response = self.client.delete("/api/auth/user-groups/", delete_payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("一般管理員禁止移除自己最後一個管理群組。", response.data.get("detail", ""))





