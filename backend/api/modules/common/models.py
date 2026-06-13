from django.db import models

from django.utils import timezone
import random

def generate_pb_gkey():
    """
    Python 模擬 PowerBuilder 原生 f_gkey()：
    格式: yymmddhhmmss + 3碼隨機/進程ID + 4碼遞增ID + 'A' = 20碼
    """
    now = timezone.localtime(timezone.now())
    # yymmddhhmmss (12 chars)
    time_str = now.strftime("%y%m%d%H%M%S")
    # 隨機 3碼
    spid_str = f"{random.randint(0, 999):03d}"
    # 隨機 4碼
    seq_str = f"{random.randint(1, 9999):04d}"
    
    gkey = f"{time_str}{spid_str}{seq_str}A"
    return gkey
from django.conf import settings
TESTING = getattr(settings, 'TESTING', False)

class Phrase(models.Model):
    """資材片語字庫檔 phrase"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    serialno = models.DecimalField(max_digits=10, decimal_places=0, db_column='serialno')
    es101gkey = models.CharField(max_length=20, db_column='es101gkey', blank=True, null=True)
    description = models.TextField(db_column='description')
    f2type = models.CharField(max_length=5, default='MR', db_column='f2type')

    class Meta:
        app_label = 'api'
        managed = False
        db_table = 'phrase'
        ordering = ['serialno']


