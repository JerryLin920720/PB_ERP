from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction, connection
from django.db.models import Max
from django.utils import timezone
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class BillNoMixin:
    """
    通用單號自動產生機制 (對應 PB f_getbillno / sys_bill_setup)。
    為避免 PB 時代的 LOCK-GET-BILLNO-FIX 行鎖問題，改用資料庫級別的 transaction.atomic() 與 select_for_update()。
    """


    def acquire_billno_lock(self, lock_key: str):
        """
        取得 PostgreSQL advisory transaction lock，防範同一前綴第一號產生的 race condition。
        這把鎖在 transaction.atomic() 結束後會自動釋放。
        """
        if connection.vendor == 'postgresql':
            with connection.cursor() as cursor:
                # 使用 hashtext 將字串轉成 integer，如果衝突機率很低，對於取號場景已足夠
                cursor.execute("SELECT pg_advisory_xact_lock(hashtext(%s))", [lock_key])

    def get_billno_config(self):
        """取得單號設定檔"""
        return getattr(self, 'billno_config', None)

    @action(detail=False, methods=['post'], url_path='get-bill-no')
    def get_bill_no(self, request):
        config = self.get_billno_config()
        if not config:
            return Response({"success": False, "detail": "此作業尚未設定單號產生規則 (billno_config)"}, status=400)

        # 1. 取得必要參數
        bill_field = config.get("bill_field", "billno")
        date_field = config.get("date_field")
        prefix = config.get("prefix", "")
        separator = config.get("separator", "")
        date_format = config.get("date_format", "%y%m%d")
        serial_length = config.get("serial_length", 4)
        
        # 支援進階 segments 配置 (預留給未來完整對接 sys_bill_setup)
        segments = config.get("segments", [])

        # 2. 決定日期基準
        input_date_str = request.data.get("date")
        if input_date_str:
            try:
                base_date = datetime.strptime(input_date_str, "%Y-%m-%d").date()
            except ValueError:
                # 容錯處理：如果有傳但格式不對，就用今天
                base_date = timezone.localdate()
        else:
            base_date = timezone.localdate()

        try:
            # 3. 組合前綴字串 (Prefix + Date)
            if segments:
                # 若有宣告 segments，以 segments 邏輯組合 (進階)
                base_prefix = ""
                for seg in segments:
                    if seg.get("type") == "literal":
                        base_prefix += seg.get("value", "")
                    elif seg.get("type") == "date":
                        fmt = seg.get("format", "%y%m%d")
                        base_prefix += base_date.strftime(fmt)
                serial_length = next((s.get("length", 4) for s in segments if s.get("type") == "serial"), 4)
            else:
                # 預設簡易邏輯：Prefix + Separator + Date
                date_str = base_date.strftime(date_format) if date_format else ""
                base_prefix = f"{prefix}{separator}{date_str}"

            # 4. Transaction 與資料庫並發鎖定
            model_class = self.queryset.model
            
            with transaction.atomic():
                # 優先方案 A：PostgreSQL advisory transaction lock
                # 防範「完全沒有既有紀錄可鎖定 (第一號)」時的 race condition。
                model_label = f"{model_class._meta.app_label}.{model_class._meta.model_name}"
                lock_key = f"billno:{model_label}:{bill_field}:{base_prefix}"
                self.acquire_billno_lock(lock_key)

                # 保留 select_for_update，以確保同時間有實體 row 也在 DB level 被鎖定
                qs = model_class.objects.select_for_update().filter(**{f"{bill_field}__startswith": base_prefix})
                
                # 計算最大單號
                max_bill = qs.aggregate(max_val=Max(bill_field))['max_val']
                
                if max_bill:
                    # 解析流水號
                    # 假設單號就是 base_prefix + serial
                    serial_str = max_bill[len(base_prefix):]
                    if separator and serial_str.startswith(separator):
                        serial_str = serial_str[len(separator):]
                    
                    try:
                        next_serial = int(serial_str) + 1
                    except ValueError:
                        next_serial = 1
                else:
                    next_serial = 1

                # 組合新單號
                if segments:
                    serial_part = str(next_serial).zfill(serial_length)
                    new_bill_no = f"{base_prefix}{serial_part}"
                else:
                    serial_part = str(next_serial).zfill(serial_length)
                    new_bill_no = f"{base_prefix}{separator if separator and not base_prefix.endswith(separator) else ''}{serial_part}"
                
                return Response({
                    "success": True,
                    "bill_no": new_bill_no,
                    "field": bill_field
                })

        except Exception as e:
            logger.error(f"Generate bill no failed: {str(e)}", exc_info=True)
            return Response({"success": False, "detail": f"產生單號失敗：{str(e)}"}, status=500)
