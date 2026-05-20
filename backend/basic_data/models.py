from django.db import models

class Ba003(models.Model):
    """
    產地基本資料檔 ba003
    已更新欄位以支援多語系
    """
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    serialno = models.DecimalField(max_digits=10, decimal_places=0, db_column='serialno')
    # 中文產地 (原 corigin)
    c_origin = models.CharField(max_length=50, unique=True, db_column='c_origin')
    # 英文產地 (原 eorigin)
    e_origin = models.CharField(max_length=50, unique=True, db_column='e_origin')
    # 法文產地 (新增)
    f_origin = models.CharField(max_length=50, blank=True, null=True, db_column='f_origin')
    # 義大利文產地 (新增)
    i_origin = models.CharField(max_length=50, blank=True, null=True, db_column='i_origin')

    class Meta:
        db_table = 'ba003'
        ordering = ['serialno']
        verbose_name = '產地基本資料'

    def __str__(self):
        # 顯示中文產地，但若為空則顯示英文
        return self.c_origin or self.e_origin
