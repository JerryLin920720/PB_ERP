import logging
from django.http import JsonResponse
from django.conf import settings
from api.models import SysAccountsActive

import sys

logger = logging.getLogger(__name__)
TESTING = len(sys.argv) > 1 and sys.argv[1] == 'test'

class ActiveSessionMiddleware:
    """
    每次 API 請求檢查當前使用者的連線 Session 在 sys_accounts_active 中是否依舊存在。
    若被管理員踢除，直接回傳 401 迫使前端重新登入。
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if TESTING:
            return self.get_response(request)

        # 1. 檢查功能開關是否啟用
        if not getattr(settings, 'ENABLE_ACTIVE_SESSION_CHECK', True):
            return self.get_response(request)

        # 2. 排除 static、media、OPTIONS 預檢請求
        path = request.path
        if (
            path.startswith('/static/') or 
            path.startswith('/media/') or 
            request.method == 'OPTIONS'
        ):
            return self.get_response(request)

        # 3. 排除 auth/login/、auth/logout/ 等特殊驗證端點
        # auth/logout/ 允許即使 session 不存在也進行 token 清除
        if path in ('/api/auth/login/', '/api/auth/logout/'):
            return self.get_response(request)

        # 4. 僅對已登入的使用者進行校驗
        user = request.user
        if not user or not user.is_authenticated:
            # 支援 Token 認證：若請求頭包含 Token，手動解析以獲取使用者狀態進行 session 校驗
            auth_header = request.headers.get('Authorization') or request.META.get('HTTP_AUTHORIZATION') or ''
            if auth_header.startswith('Token '):
                try:
                    token_key = auth_header.split(' ')[1]
                    from rest_framework.authtoken.models import Token
                    token_obj = Token.objects.select_related('user').get(key=token_key)
                    user = token_obj.user
                except Exception:
                    pass

        if user and user.is_authenticated:
            try:
                # 查詢該使用者的活躍連線 (accounts_id 對齊 Django username)
                # 排除 win_login 不是 "Web" 的其他 PB 客戶端連線，避免因 PB 登出影響 Web
                session_exists = SysAccountsActive.objects.filter(
                    accounts_id__iexact=user.username,
                    win_login="Web"
                ).exists()

                if not session_exists:
                    logger.warning(f"Active session for user '{user.username}' was not found. Kicked out.")
                    response_data = {"detail": "您的登入連線已失效，請重新登入。"}
                    return JsonResponse(response_data, status=401)

            except Exception as e:
                # 安全降級：資料庫查詢出錯時不崩潰
                logger.error(f"ActiveSessionMiddleware database query error: {str(e)}")
                return self.get_response(request)

        return self.get_response(request)
