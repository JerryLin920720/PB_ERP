import os
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from api.models import SysAccount, generate_pb_gkey

class Command(BaseCommand):
    help = 'Initialize ERP superuser and corresponding SysAccount'

    def handle(self, *args, **options):
        username = os.environ.get('ERP_SUPERUSER_USERNAME', 'admin')
        password = os.environ.get('ERP_SUPERUSER_PASSWORD', 'admin123456')
        display_name = os.environ.get('ERP_SUPERUSER_DISPLAY_NAME', '系統管理員')

        is_dev_fallback = (
            username == 'admin' and 
            password == 'admin123456'
        )

        if is_dev_fallback:
            self.stdout.write(
                self.style.WARNING(
                    '[WARNING] Using default development ERP superuser password. '
                    'Please change it in production.'
                )
            )

        # 0. Ensure unmanaged legacy tables exist in the database
        from django.db import connection
        with connection.cursor() as cursor:
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
        self.stdout.write(self.style.SUCCESS("Verified/Created legacy unmanaged tables: sys_menu, sys_popedom, sys_popedom_desc, sys_accounts_active."))

        # 1. Create or update Django User
        user, created = User.objects.get_or_create(username=username)
        user.set_password(password)
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.save()

        if created:
            self.stdout.write(self.style.SUCCESS(f"Created Django User: {username}"))
        else:
            self.stdout.write(self.style.SUCCESS(f"Updated Django User: {username}"))

        # 2. Create or update corresponding SysAccount
        sys_account = SysAccount.objects.filter(accounts_id=username).first()
        if sys_account:
            sys_account.accounts = display_name
            sys_account.user_pwd = password  # for legacy plain text auth compatibility
            sys_account.peopdom_class = "5"
            sys_account.status_sign = "0"
            sys_account.save()
            self.stdout.write(self.style.SUCCESS(f"Updated SysAccount: {username}"))
        else:
            new_gkey = generate_pb_gkey()
            new_user_id = generate_pb_gkey() # employee gkey
            sys_account = SysAccount.objects.create(
                gkey=new_gkey,
                hisystem="01",
                accounts_id=username,
                user_id=new_user_id,
                accounts=display_name,
                user_pwd=password,
                peopdom_class="5",
                status_sign="0"
            )
            self.stdout.write(self.style.SUCCESS(f"Created SysAccount: {username}"))
