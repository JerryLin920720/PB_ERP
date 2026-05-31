from django.contrib.auth.backends import BaseBackend
from django.contrib.auth.models import User
from api.models import SysAccount

class SysAccountBackend(BaseBackend):
    """
    自訂 Django 認證後端，對接 legacy sys_accounts 資料表。
    """
    def authenticate(self, request, username=None, password=None, **kwargs):
        if not username or not password:
            return None

        try:
            # 1. 在 sys_accounts 中比對帳號 (case-insensitive)
            # 優先比對 accounts_id，其次比對 accounts
            account = SysAccount.objects.filter(accounts_id__iexact=username).first()
            if not account:
                account = SysAccount.objects.filter(accounts__iexact=username).first()

            if not account:
                return None

            # 2. 密碼驗證 (與舊系統明文比對一致)
            if account.user_pwd != password:
                return None

            # 3. 檢查帳號狀態 (status_sign = '0' 啟用，'1' 停用)
            if account.status_sign != '0':
                return None

            # 4. 同步取得或建立對應的 Django User
            # 我們將 accounts_id 對齊 Django User username，確保後續與 DRF Token 整合
            django_user, created = User.objects.get_or_create(
                username=account.accounts_id,
                defaults={
                    'first_name': account.accounts[:30],
                    'is_active': True,
                }
            )

            # 動態附加 SysAccount 實例至 user 物件
            django_user.sys_account = account
            return django_user

        except Exception as e:
            # 安全防護
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"SysAccountBackend authentication error: {str(e)}")
            return None

    def get_user(self, user_id):
        try:
            django_user = User.objects.get(pk=user_id)
            # 附加上關聯的 SysAccount
            account = SysAccount.objects.filter(accounts_id__iexact=django_user.username).first()
            django_user.sys_account = account
            return django_user
        except User.DoesNotExist:
            return None
