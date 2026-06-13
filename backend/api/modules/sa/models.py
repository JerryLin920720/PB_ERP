from django.db import models
from api.modules.common.models import generate_pb_gkey

class Sa006(models.Model):
    """
    業務部門其他費用定義檔 sa006
    供訂單 sa030 / 預告訂單 sa020 套用之費用項目（非單價費用）。
    計算方式 computemode：1=固定金額, 2=總金額比例, 3=總雙數比例
    加減項 agument：+1=外加, -1=扣減
    """
    gkey = models.CharField(
        primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey'
    )
    serialno = models.DecimalField(
        max_digits=10, decimal_places=0, db_column='serialno',
        blank=True, null=True,
        help_text='自動流水號'
    )
    typename = models.CharField(
        max_length=50, db_column='typename',
        help_text='費用項目名稱，如 Commission, Air Freight'
    )
    computemode = models.CharField(
        max_length=1, db_column='computemode', default='1',
        help_text='計算方式：1=固定金額, 2=總金額比例, 3=總雙數比例'
    )
    agument = models.CharField(
        max_length=2, db_column='agument', default='1',
        help_text='加減項：+1=外加, -1=折扣/扣減'
    )
    spercent = models.DecimalField(
        max_digits=10, decimal_places=4, blank=True, null=True, db_column='spercent',
        help_text='百分比/比例 (computemode=2 or 3 時有效)'
    )
    amount = models.DecimalField(
        max_digits=16, decimal_places=4, blank=True, null=True, db_column='amount',
        help_text='金額 (computemode=1 時有效)'
    )

    class Meta:
        app_label = 'api'
        db_table = 'sa006'
        ordering = ['serialno']
        verbose_name = '業務部其他費用定義'

    def __str__(self):
        return f"[{self.serialno}] {self.typename}"



class Sa007(models.Model):
    """
    報價其他費用定義檔 sa007
    供型體報價單 sa010 套用之其他附加費用定義。
    計算結構較 sa006 單純，僅支援固定金額。
    """
    gkey = models.CharField(
        primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey'
    )
    serialno = models.DecimalField(
        max_digits=10, decimal_places=0, db_column='serialno',
        blank=True, null=True,
        help_text='自動流水號'
    )
    typename = models.CharField(
        max_length=50, db_column='typename',
        help_text='費用項目名稱，如 Sampling Fee, Courier'
    )
    agument = models.CharField(
        max_length=2, db_column='agument', default='1',
        help_text='加減項：+1=外加, -1=折扣/扣減'
    )
    amount = models.DecimalField(
        max_digits=16, decimal_places=4, blank=True, null=True, db_column='amount',
        help_text='金額'
    )

    class Meta:
        app_label = 'api'
        db_table = 'sa007'
        ordering = ['serialno']
        verbose_name = '報價其他費用定義'

    def __str__(self):
        return f"[{self.serialno}] {self.typename}"



class Sa005(models.Model):
    """
    Assortment 尺碼配比套碼主檔 sa005
    供訂單 sa030 / 預告訂單 sa020 快速套入裝箱尺碼配比。
    包含 size1~size22 (尺碼標籤) 與 pairs1~pairs22 (各尺碼雙數) 的扁平化結構。
    ctnpairs = 各尺碼雙數總和（由前端自動計算或後端 save 時重算）。
    """
    gkey = models.CharField(
        primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey'
    )
    sa005_code = models.CharField(
        max_length=20, db_column='sa005_code',
        help_text='配比代碼 (用戶定義)'
    )
    ba010gkey = models.CharField(
        max_length=20, blank=True, null=True, db_column='ba010gkey',
        help_text='客戶外鍵 (字元型，對應 ba010.gkey)'
    )
    sa005_startsize = models.DecimalField(
        max_digits=5, decimal_places=1, blank=True, null=True, db_column='sa005_startsize',
        help_text='起始尺碼'
    )
    sa005_endsize = models.DecimalField(
        max_digits=5, decimal_places=1, blank=True, null=True, db_column='sa005_endsize',
        help_text='終止尺碼'
    )
    sa005_fullhalf = models.CharField(
        max_length=1, blank=True, null=True, db_column='sa005_fullhalf',
        help_text='跳號方式：1=全號, 2=半號, 3=連號雙碼'
    )
    sa005_maxsize = models.DecimalField(
        max_digits=5, decimal_places=1, blank=True, null=True, db_column='sa005_maxsize',
        help_text='最大尺碼 (跨大尺碼循環時使用)'
    )
    sa005_ctnpairs = models.DecimalField(
        max_digits=10, decimal_places=0, blank=True, null=True, db_column='sa005_ctnpairs',
        help_text='每箱總雙數 (自動累加 pairs1~22)'
    )
    # 尺碼標籤 size1~size22
    size1 = models.DecimalField(max_digits=5, decimal_places=1, blank=True, null=True, db_column='size1')
    size2 = models.DecimalField(max_digits=5, decimal_places=1, blank=True, null=True, db_column='size2')
    size3 = models.DecimalField(max_digits=5, decimal_places=1, blank=True, null=True, db_column='size3')
    size4 = models.DecimalField(max_digits=5, decimal_places=1, blank=True, null=True, db_column='size4')
    size5 = models.DecimalField(max_digits=5, decimal_places=1, blank=True, null=True, db_column='size5')
    size6 = models.DecimalField(max_digits=5, decimal_places=1, blank=True, null=True, db_column='size6')
    size7 = models.DecimalField(max_digits=5, decimal_places=1, blank=True, null=True, db_column='size7')
    size8 = models.DecimalField(max_digits=5, decimal_places=1, blank=True, null=True, db_column='size8')
    size9 = models.DecimalField(max_digits=5, decimal_places=1, blank=True, null=True, db_column='size9')
    size10 = models.DecimalField(max_digits=5, decimal_places=1, blank=True, null=True, db_column='size10')
    size11 = models.DecimalField(max_digits=5, decimal_places=1, blank=True, null=True, db_column='size11')
    size12 = models.DecimalField(max_digits=5, decimal_places=1, blank=True, null=True, db_column='size12')
    size13 = models.DecimalField(max_digits=5, decimal_places=1, blank=True, null=True, db_column='size13')
    size14 = models.DecimalField(max_digits=5, decimal_places=1, blank=True, null=True, db_column='size14')
    size15 = models.DecimalField(max_digits=5, decimal_places=1, blank=True, null=True, db_column='size15')
    size16 = models.DecimalField(max_digits=5, decimal_places=1, blank=True, null=True, db_column='size16')
    size17 = models.DecimalField(max_digits=5, decimal_places=1, blank=True, null=True, db_column='size17')
    size18 = models.DecimalField(max_digits=5, decimal_places=1, blank=True, null=True, db_column='size18')
    size19 = models.DecimalField(max_digits=5, decimal_places=1, blank=True, null=True, db_column='size19')
    size20 = models.DecimalField(max_digits=5, decimal_places=1, blank=True, null=True, db_column='size20')
    size21 = models.DecimalField(max_digits=5, decimal_places=1, blank=True, null=True, db_column='size21')
    size22 = models.DecimalField(max_digits=5, decimal_places=1, blank=True, null=True, db_column='size22')
    # 各尺碼雙數 pairs1~pairs22
    pairs1 = models.DecimalField(max_digits=10, decimal_places=0, blank=True, null=True, db_column='pairs1')
    pairs2 = models.DecimalField(max_digits=10, decimal_places=0, blank=True, null=True, db_column='pairs2')
    pairs3 = models.DecimalField(max_digits=10, decimal_places=0, blank=True, null=True, db_column='pairs3')
    pairs4 = models.DecimalField(max_digits=10, decimal_places=0, blank=True, null=True, db_column='pairs4')
    pairs5 = models.DecimalField(max_digits=10, decimal_places=0, blank=True, null=True, db_column='pairs5')
    pairs6 = models.DecimalField(max_digits=10, decimal_places=0, blank=True, null=True, db_column='pairs6')
    pairs7 = models.DecimalField(max_digits=10, decimal_places=0, blank=True, null=True, db_column='pairs7')
    pairs8 = models.DecimalField(max_digits=10, decimal_places=0, blank=True, null=True, db_column='pairs8')
    pairs9 = models.DecimalField(max_digits=10, decimal_places=0, blank=True, null=True, db_column='pairs9')
    pairs10 = models.DecimalField(max_digits=10, decimal_places=0, blank=True, null=True, db_column='pairs10')
    pairs11 = models.DecimalField(max_digits=10, decimal_places=0, blank=True, null=True, db_column='pairs11')
    pairs12 = models.DecimalField(max_digits=10, decimal_places=0, blank=True, null=True, db_column='pairs12')
    pairs13 = models.DecimalField(max_digits=10, decimal_places=0, blank=True, null=True, db_column='pairs13')
    pairs14 = models.DecimalField(max_digits=10, decimal_places=0, blank=True, null=True, db_column='pairs14')
    pairs15 = models.DecimalField(max_digits=10, decimal_places=0, blank=True, null=True, db_column='pairs15')
    pairs16 = models.DecimalField(max_digits=10, decimal_places=0, blank=True, null=True, db_column='pairs16')
    pairs17 = models.DecimalField(max_digits=10, decimal_places=0, blank=True, null=True, db_column='pairs17')
    pairs18 = models.DecimalField(max_digits=10, decimal_places=0, blank=True, null=True, db_column='pairs18')
    pairs19 = models.DecimalField(max_digits=10, decimal_places=0, blank=True, null=True, db_column='pairs19')
    pairs20 = models.DecimalField(max_digits=10, decimal_places=0, blank=True, null=True, db_column='pairs20')
    pairs21 = models.DecimalField(max_digits=10, decimal_places=0, blank=True, null=True, db_column='pairs21')
    pairs22 = models.DecimalField(max_digits=10, decimal_places=0, blank=True, null=True, db_column='pairs22')

    class Meta:
        app_label = 'api'
        db_table = 'sa005'
        ordering = ['sa005_code']
        verbose_name = 'Assortment尺碼配比主檔'

    def save(self, *args, **kwargs):
        # 自動累加 ctnpairs = sum(pairs1~22)
        total = 0
        for i in range(1, 23):
            v = getattr(self, f'pairs{i}', None)
            if v is not None:
                total += int(v)
        self.sa005_ctnpairs = total
        super().save(*args, **kwargs)

    def __str__(self):
        return f"[{self.sa005_code}] {self.sa005_ctnpairs} pairs/ctn"


