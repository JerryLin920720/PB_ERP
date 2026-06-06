from django.core.cache import cache
from api.models import SysParameter

class SysParameterCache:
    """
    系統參數快取服務 (SysParameterCache)
    """

    @staticmethod
    def get_parameter(hisystem, parameterid):
        """
        取得參數值（字串形式），支援快取
        """
        key = f"sys_param:{hisystem}:{parameterid}"
        val = cache.get(key)
        if val is not None:
            return val
        
        try:
            param = SysParameter.objects.get(hisystem=hisystem, parameterid=parameterid)
            val = param.parametervalue or ""
            # 快取 10 分鐘 (600 秒)
            cache.set(key, val, 600)
            return val
        except SysParameter.DoesNotExist:
            return None

    @staticmethod
    def get_bool(hisystem, parameterid):
        """
        取得布林值參數。若值為 '1', 't', 'y', 'yes', 'true' 則為 True。
        """
        val = SysParameterCache.get_parameter(hisystem, parameterid)
        if val is None:
            return False
        return val.strip().lower() in ('1', 't', 'y', 'yes', 'true')

    @staticmethod
    def get_int(hisystem, parameterid, default=0):
        """
        取得整數參數，若無法解析則回傳 default。
        """
        val = SysParameterCache.get_parameter(hisystem, parameterid)
        if val is None:
            return default
        try:
            return int(val)
        except (ValueError, TypeError):
            return default

    @staticmethod
    def get_by_istype(istype):
        """
        取得特定類別/模組 (istype) 的所有參數 (以 dict {parameterid: value} 形式回傳)
        """
        key = f"sys_param_istype:{istype}"
        data = cache.get(key)
        if data is not None:
            return data
        
        params = SysParameter.objects.filter(istype=istype)
        data = {p.parameterid: p.parametervalue for p in params}
        cache.set(key, data, 600)
        return data

    @staticmethod
    def get_by_module(istype):
        """
        別名方法，對接 get_by_istype
        """
        return SysParameterCache.get_by_istype(istype)

    @staticmethod
    def invalidate(hisystem, parameterid):
        """
        清除特定參數之快取，同時關聯清除 istype 分類快取
        """
        key = f"sys_param:{hisystem}:{parameterid}"
        cache.delete(key)
        
        try:
            param = SysParameter.objects.get(hisystem=hisystem, parameterid=parameterid)
            if param.istype:
                cache.delete(f"sys_param_istype:{param.istype}")
        except SysParameter.DoesNotExist:
            pass

    @staticmethod
    def reload():
        """
        重新載入/清除所有參數快取
        """
        try:
            for p in SysParameter.objects.all():
                cache.delete(f"sys_param:{p.hisystem}:{p.parameterid}")
                if p.istype:
                    cache.delete(f"sys_param_istype:{p.istype}")
        except Exception:
            pass

    @staticmethod
    def clear():
        """
        清除所有快取
        """
        SysParameterCache.reload()
