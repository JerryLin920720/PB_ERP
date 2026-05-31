from django.db import connection
from django.utils import timezone
from rest_framework.test import APITestCase
from api.models import SysAccount, SysMenu, SysPopedom, SysPopedomDesc, SysAccountsActive
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
                    user_pwd VARCHAR(50),
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
                    vietnamname VARCHAR(40)
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

