from django.db import connection
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework import status
from api.models import SysParameter, SysAccount, SysPopedom, SysPopedomDesc
from api.services.sys_parameter_cache import SysParameterCache
from core import permissions, middleware

class SysParameterTests(APITestCase):
    @classmethod
    def setUpClass(cls):
        # Create managed=False tables that SysParameterViewSet and HasProgramPermission depend on
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
        # Enable permissions checking for testing
        self.orig_testing = permissions.TESTING
        self.orig_mw_testing = middleware.TESTING
        permissions.TESTING = False
        middleware.TESTING = False
        
        # Clear database records
        SysParameter.objects.all().delete()
        SysAccount.objects.all().delete()
        SysPopedom.objects.all().delete()
        SysPopedomDesc.objects.all().delete()
        
        # Seed popedom descriptions for w_sy004
        SysPopedomDesc.objects.create(
            hisystem='01',
            obj_name='w_sy004',
            popedom_id='search',
            popedom_desc='查詢',
            popedom_index=1
        )
        SysPopedomDesc.objects.create(
            hisystem='01',
            obj_name='w_sy004',
            popedom_id='edit',
            popedom_desc='修改',
            popedom_index=2
        )
        
        # Create default users
        self.admin = SysAccount.objects.create(
            gkey="admin_gkey",
            hisystem="01",
            accounts_id="ADMIN",
            user_id="user_admin",
            accounts="Admin User",
            user_pwd="pwd",
            peopdom_class="9",
            status_sign="0"
        )
        
        self.user_low = SysAccount.objects.create(
            gkey="user_low_gkey",
            hisystem="01",
            accounts_id="USER_LOW",
            user_id="user_low",
            accounts="Low Privilege User",
            user_pwd="pwd",
            peopdom_class="1",
            status_sign="0"
        )
        
        self.user_high = SysAccount.objects.create(
            gkey="user_high_gkey",
            hisystem="01",
            accounts_id="USER_HIGH",
            user_id="user_high",
            accounts="High Privilege User",
            user_pwd="pwd",
            peopdom_class="8",
            status_sign="0"
        )

        # Grant w_sy004 permissions (search & edit) to self.user_low and self.user_high
        SysPopedom.objects.create(
            accounts_id="USER_LOW",
            obj_name="w_sy004",
            prg_popedom="1100000000000",
            flag="10",
            hisystem="01"
        )
        SysPopedom.objects.create(
            accounts_id="USER_HIGH",
            obj_name="w_sy004",
            prg_popedom="1100000000000",
            flag="10",
            hisystem="01"
        )
        # Also need flag='1' for menu
        SysPopedom.objects.create(
            accounts_id="USER_LOW",
            obj_name="w_sy004",
            prg_popedom="1100000000000",
            flag="1",
            hisystem="01"
        )
        SysPopedom.objects.create(
            accounts_id="USER_HIGH",
            obj_name="w_sy004",
            prg_popedom="1100000000000",
            flag="1",
            hisystem="01"
        )

        # Set up active sessions for token middleware checks
        from api.models import SysAccountsActive
        SysAccountsActive.objects.create(
            gkey="active_admin",
            hisystem="01",
            accounts_id="ADMIN",
            logintime=timezone.now(),
            computername="WebBrowser",
            loginip="127.0.0.1",
            spid=9991,
            win_login="Web"
        )
        SysAccountsActive.objects.create(
            gkey="active_user_low",
            hisystem="01",
            accounts_id="USER_LOW",
            logintime=timezone.now(),
            computername="WebBrowser",
            loginip="127.0.0.1",
            spid=9992,
            win_login="Web"
        )
        SysAccountsActive.objects.create(
            gkey="active_user_high",
            hisystem="01",
            accounts_id="USER_HIGH",
            logintime=timezone.now(),
            computername="WebBrowser",
            loginip="127.0.0.1",
            spid=9993,
            win_login="Web"
        )

    def tearDown(self):
        # Restore permissions testing flag
        permissions.TESTING = self.orig_testing
        middleware.TESTING = self.orig_mw_testing
        super().tearDown()

    def _get_token(self, sys_account):
        from django.contrib.auth.models import User
        from rest_framework.authtoken.models import Token
        django_user, _ = User.objects.get_or_create(
            username=sys_account.accounts_id,
            defaults={
                'first_name': sys_account.accounts[:30],
                'is_active': True,
            }
        )
        token, _ = Token.objects.get_or_create(user=django_user)
        return token.key

    def test_migration_table_exists(self):
        # Verify SysParameter table is created and querying works
        p = SysParameter.objects.create(
            hisystem="01",
            parameterid="test_param",
            parametervalue="test_val",
            visitctrl="1",
            istype="modules"
        )
        self.assertEqual(SysParameter.objects.count(), 1)
        self.assertEqual(p._meta.db_table, "sys_parameter")

    def test_low_privilege_visible_limits(self):
        SysParameter.objects.create(hisystem="01", parameterid="p1", visitctrl="1", parametervalue="v1")
        SysParameter.objects.create(hisystem="01", parameterid="p2", visitctrl="5", parametervalue="v2")
        SysParameter.objects.create(hisystem="01", parameterid="p3", visitctrl="9", parametervalue="v3")
        
        # 1. USER_LOW (level 1)
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self._get_token(self.user_low))
        res = self.client.get("/api/sys-parameter/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['parameterid'], "p1")
        
        # 2. USER_HIGH (level 8)
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self._get_token(self.user_high))
        res = self.client.get("/api/sys-parameter/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 2)
        p_ids = [p['parameterid'] for p in res.data]
        self.assertIn("p1", p_ids)
        self.assertIn("p2", p_ids)
        
        # 3. ADMIN (level 9)
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self._get_token(self.admin))
        res = self.client.get("/api/sys-parameter/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 3)

    def test_update_restrictions(self):
        p = SysParameter.objects.create(hisystem="01", parameterid="p1", visitctrl="1", parametervalue="v1", description="desc")
        
        # USER_LOW tries to update parametervalue -> Success
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self._get_token(self.user_low))
        res = self.client.patch("/api/sys-parameter/p1/?hisystem=01", {"parametervalue": "new_v1"})
        self.assertEqual(res.status_code, 200)
        p.refresh_from_db()
        self.assertEqual(p.parametervalue, "new_v1")
        
        # USER_LOW tries to update description -> Failure (400)
        res = self.client.patch("/api/sys-parameter/p1/?hisystem=01", {"description": "new_desc"})
        self.assertEqual(res.status_code, 400)
        
        # USER_LOW tries to update visitctrl -> Failure (400)
        res = self.client.patch("/api/sys-parameter/p1/?hisystem=01", {"visitctrl": "9"})
        self.assertEqual(res.status_code, 400)

        # USER_HIGH tries to update description -> Success
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self._get_token(self.user_high))
        res = self.client.patch("/api/sys-parameter/p1/?hisystem=01", {"description": "new_desc"})
        self.assertEqual(res.status_code, 200)
        p.refresh_from_db()
        self.assertEqual(p.description, "new_desc")

    def test_post_and_delete_denied(self):
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self._get_token(self.user_high))
        res = self.client.post("/api/sys-parameter/", {"hisystem": "01", "parameterid": "new_p", "visitctrl": "1"})
        self.assertEqual(res.status_code, 405) # Method Not Allowed
        
        SysParameter.objects.create(hisystem="01", parameterid="p1", visitctrl="1", parametervalue="v1")
        res = self.client.delete("/api/sys-parameter/p1/?hisystem=01")
        self.assertEqual(res.status_code, 405)

    def test_cache_invalidation(self):
        p = SysParameter.objects.create(hisystem="01", parameterid="LDAP", visitctrl="1", parametervalue="0")
        
        # Load into cache
        self.assertEqual(SysParameterCache.get_parameter("01", "LDAP"), "0")
        
        # Update via API
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self._get_token(self.user_high))
        res = self.client.patch("/api/sys-parameter/LDAP/?hisystem=01", {"parametervalue": "1"})
        self.assertEqual(res.status_code, 200)
        
        # Verify cache is invalidated and loads new value
        self.assertEqual(SysParameterCache.get_parameter("01", "LDAP"), "1")

    def test_w_sy004_permissions(self):
        user_no_perms = SysAccount.objects.create(
            gkey="user_no_perms_gkey",
            hisystem="01",
            accounts_id="USER_NO_PERMS",
            user_id="user_no_perms",
            accounts="No Perms User",
            user_pwd="pwd",
            peopdom_class="1",
            status_sign="0"
        )
        from api.models import SysAccountsActive
        SysAccountsActive.objects.create(
            gkey="active_user_no_perms",
            hisystem="01",
            accounts_id="USER_NO_PERMS",
            logintime=timezone.now(),
            computername="WebBrowser",
            loginip="127.0.0.1",
            spid=9994,
            win_login="Web"
        )
        
        SysParameter.objects.create(hisystem="01", parameterid="p1", visitctrl="1", parametervalue="v1")
        
        # Query without permission -> 403
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self._get_token(user_no_perms))
        res = self.client.get("/api/sys-parameter/")
        self.assertEqual(res.status_code, 403)
        
        # Update without permission -> 403
        res = self.client.patch("/api/sys-parameter/p1/?hisystem=01", {"parametervalue": "v2"})
        self.assertEqual(res.status_code, 403)
