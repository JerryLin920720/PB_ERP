from django.db import models, transaction
from django.db.models import Max
from django.utils import timezone
import random
import string

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

class Ba001(models.Model):
    """
    個人片語字庫檔 ba001
    """
    gkey = models.CharField(
        primary_key=True, 
        max_length=20, 
        default=generate_pb_gkey, 
        db_column='gkey',
        help_text='唯一物理主鍵'
    )
    serialno = models.DecimalField(
        max_digits=10, 
        decimal_places=0, 
        db_column='serialno',
        help_text='動態累加流水號'
    )
    es101gkey = models.CharField(
        max_length=20, 
        db_column='es101gkey',
        help_text='關聯之員工帳戶鍵'
    )
    description = models.TextField(
        db_column='description',
        help_text='片語內容'
    )
    f2type = models.CharField(
        max_length=5, 
        default='BA', 
        db_column='f2type',
        help_text='業務分類區分碼'
    )

    class Meta:
        db_table = 'ba001'
        ordering = ['f2type', 'serialno']
        verbose_name = '個人片語字庫'

    def __str__(self):
        return f"[{self.serialno}] {self.description[:20]}"

class Ba002(models.Model):
    """
    國家基本資料檔 ba002
    """
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    serialno = models.DecimalField(max_digits=10, decimal_places=0, db_column='serialno')
    ccountry = models.CharField(max_length=50, unique=True, db_column='ccountry')
    ecountry = models.CharField(max_length=50, unique=True, db_column='ecountry')

    class Meta:
        db_table = 'ba002'
        ordering = ['serialno']
        verbose_name = '國家基本資料'

    def __str__(self):
        return f"{self.ccountry} ({self.ecountry})"

class Ba003(models.Model):
    """
    產地基本資料檔 ba003
    """
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    serialno = models.DecimalField(max_digits=10, decimal_places=0, db_column='serialno')
    corigin = models.CharField(max_length=50, unique=True, db_column='corigin')
    eorigin = models.CharField(max_length=50, unique=True, db_column='eorigin')

    class Meta:
        db_table = 'ba003'
        ordering = ['serialno']
        verbose_name = '產地基本資料'

    def __str__(self):
        return f"{self.corigin} ({self.eorigin})"

class Ba004(models.Model):
    """
    區域基本資料檔 ba004
    """
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    serialno = models.DecimalField(max_digits=10, decimal_places=0, db_column='serialno')
    areacode = models.CharField(max_length=10, blank=True, null=True, db_column='areacode') # 原生規格非必填
    carea = models.CharField(max_length=50, unique=True, db_column='carea')
    earea = models.CharField(max_length=50, unique=True, db_column='earea')

    class Meta:
        db_table = 'ba004'
        ordering = ['serialno']
        verbose_name = '區域基本資料'

    def __str__(self):
        return f"{self.carea} ({self.earea})"


class Ba005(models.Model):
    """公司基本資料設定 ba005"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    companycode = models.CharField(max_length=10, unique=True, db_column='companycode')
    shortname = models.CharField(max_length=20, unique=True, db_column='shortname')
    cname = models.CharField(max_length=60, db_column='cname')
    ename = models.CharField(max_length=60, db_column='ename')
    tel1 = models.CharField(max_length=40, blank=True, null=True, db_column='tel1')
    tel2 = models.CharField(max_length=40, blank=True, null=True, db_column='tel2')
    fax1 = models.CharField(max_length=40, blank=True, null=True, db_column='fax1')
    fax2 = models.CharField(max_length=40, blank=True, null=True, db_column='fax2')
    caddress = models.CharField(max_length=200, blank=True, null=True, db_column='caddress')
    eaddress = models.CharField(max_length=250, blank=True, null=True, db_column='eaddress')
    taxaddress = models.CharField(max_length=250, blank=True, null=True, db_column='taxaddress')
    shipper = models.CharField(max_length=250, blank=True, null=True, db_column='shipper')
    contact = models.CharField(max_length=30, blank=True, null=True, db_column='contact')
    boss = models.CharField(max_length=20, blank=True, null=True, db_column='boss')
    taxno = models.CharField(max_length=20, blank=True, null=True, db_column='taxno')
    email = models.CharField(max_length=50, blank=True, null=True, db_column='email')
    website = models.CharField(max_length=100, blank=True, null=True, db_column='website')
    logopath = models.FileField(upload_to='company_logos/', blank=True, null=True, db_column='logopath')
    remark = models.TextField(blank=True, null=True, default='empty', db_column='remark')
    major = models.CharField(max_length=1, default='N', db_column='major')
    type = models.CharField(max_length=1, default='1', db_column='type')

    class Meta:
        db_table = 'ba005'
        ordering = ['companycode']
        verbose_name = '公司基本資料'

    def __str__(self):
        return self.shortname

    def save(self, *args, **kwargs):
        with transaction.atomic():
            if self.major == 'Y':
                # 先將該公司類型下的其他公司的 major 全部改為 'N'
                if self.pk:
                    Ba005.objects.exclude(pk=self.pk).update(major='N')
                else:
                    Ba005.objects.all().update(major='N')
            super().save(*args, **kwargs)


class Ba009(models.Model):
    """品牌資料檔 ba009"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    serialno = models.DecimalField(max_digits=10, decimal_places=0, db_column='serialno')
    cbrand = models.CharField(max_length=30, unique=True, db_column='cbrand')
    ebrand = models.CharField(max_length=50, blank=True, null=True, db_column='ebrand')

    class Meta:
        db_table = 'ba009'
        ordering = ['serialno']
        verbose_name = '品牌資料'

    def __str__(self):
        return self.cbrand


class Ba020(models.Model):
    """材料與供應商類別設定 ba020"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    type = models.CharField(max_length=20, db_column='type')
    code = models.CharField(max_length=20, db_column='code')
    category = models.CharField(max_length=50, unique=True, db_column='category')

    class Meta:
        db_table = 'ba020'
        ordering = ['type', 'category']
        verbose_name = '材料商與供應商分類字典'

    def __str__(self):
        return f"{self.code} - {self.category}"


class Ba040(models.Model):
    """銀行基本資料設定 ba040"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    bankno = models.CharField(max_length=10, unique=True, db_column='bankno')
    shortname = models.CharField(max_length=20, db_column='shortname')
    cbankname = models.CharField(max_length=80, db_column='cbankname')
    ebankname = models.CharField(max_length=150, blank=True, null=True, db_column='ebankname')
    tel = models.CharField(max_length=40, blank=True, null=True, db_column='tel')
    fax = models.CharField(max_length=40, blank=True, null=True, db_column='fax')
    swift = models.CharField(max_length=100, blank=True, null=True, db_column='swift')
    caddress = models.CharField(max_length=100, blank=True, null=True, db_column='caddress')
    eaddress = models.CharField(max_length=250, blank=True, null=True, db_column='eaddress')
    cable = models.CharField(max_length=250, blank=True, null=True, db_column='cable')
    accountno = models.CharField(max_length=30, blank=True, null=True, db_column='accountno')
    accountname = models.CharField(max_length=50, blank=True, null=True, db_column='accountname')
    telex = models.CharField(max_length=100, blank=True, null=True, db_column='telex')
    lcdescription = models.TextField(blank=True, null=True, db_column='lcdescription')
    bankinginformation = models.TextField(blank=True, null=True, db_column='bankinginformation')
    remark = models.TextField(blank=True, null=True, db_column='remark')

    class Meta:
        db_table = 'ba040'
        ordering = ['bankno']
        verbose_name = '銀行基本資料'

    def __str__(self):
        return self.shortname


class Ba045(models.Model):
    """部門設定檔 ba045"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    serialno = models.DecimalField(max_digits=10, decimal_places=0, db_column='serialno')
    department = models.CharField(max_length=50, unique=True, db_column='department')

    class Meta:
        db_table = 'ba045'
        ordering = ['serialno']
        verbose_name = '部門設定'

    def __str__(self):
        return self.department


class Ba050(models.Model):
    """職務設定檔 ba050 (注意：原廠欄位拼寫為 jobpositon，少了一個 i)"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    serialno = models.DecimalField(max_digits=10, decimal_places=0, db_column='serialno')
    jobpositon = models.CharField(max_length=50, unique=True, db_column='jobpositon')

    class Meta:
        db_table = 'ba050'
        ordering = ['serialno']
        verbose_name = '職務設定'

    def __str__(self):
        return self.jobpositon


class Ba055(models.Model):
    """季節設定檔 ba055"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    serialno = models.DecimalField(max_digits=10, decimal_places=0, db_column='serialno')
    groupcode = models.CharField(max_length=10, unique=True, db_column='groupcode')
    groupname = models.CharField(max_length=30, blank=True, null=True, db_column='groupname')

    class Meta:
        db_table = 'ba055'
        ordering = ['serialno']
        verbose_name = '季節設定'

    def __str__(self):
        return f"{self.groupcode} ({self.groupname or ''})"


class Ba060(models.Model):
    """全域幣別主檔 ba060"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    serialno = models.DecimalField(max_digits=10, decimal_places=0, db_column='serialno')
    currencyno = models.CharField(max_length=10, unique=True, db_column='currencyno')
    currency = models.CharField(max_length=20, db_column='currency')
    exrate = models.DecimalField(max_digits=16, decimal_places=4, blank=True, null=True, db_column='exrate')

    class Meta:
        db_table = 'ba060'
        ordering = ['serialno']
        verbose_name = '全域幣別主檔'

    def __str__(self):
        return self.currencyno

class Ba061(models.Model):
    """全域幣別歷史匯率明細檔 ba061"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    ba060gkey = models.ForeignKey(Ba060, on_delete=models.CASCADE, db_column='ba060gkey')
    rate = models.DecimalField(max_digits=16, decimal_places=4, db_column='rate')
    effectivedate = models.DateTimeField(db_column='effectivedate')
    losectivedate = models.DateTimeField(db_column='losectivedate')
    chk = models.CharField(max_length=1, default='N', db_column='chk')

    class Meta:
        db_table = 'ba061'
        ordering = ['-effectivedate']
        verbose_name = '全域幣別歷史匯率'

    def save(self, *args, **kwargs):
        with transaction.atomic():
            super().save(*args, **kwargs)
            if self.chk == 'Y':
                Ba061.objects.filter(ba060gkey=self.ba060gkey).exclude(gkey=self.gkey).update(chk='N')
                self.ba060gkey.exrate = self.rate
                self.ba060gkey.save()

class Ab230(models.Model):
    """財務交叉匯率主檔 ab230"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    serialno = models.DecimalField(max_digits=10, decimal_places=0, db_column='serialno')
    ba060gkey1 = models.ForeignKey(Ba060, related_name='base_pair', on_delete=models.CASCADE, db_column='ba060gkey1')
    ba060gkey2 = models.ForeignKey(Ba060, related_name='target_pair', on_delete=models.CASCADE, db_column='ba060gkey2')
    exrate = models.DecimalField(max_digits=16, decimal_places=8, blank=True, null=True, db_column='exrate')

    class Meta:
        db_table = 'ab230'
        ordering = ['serialno']
        verbose_name = '財務交叉匯率主檔'

    def save(self, *args, **kwargs):
        from decimal import Decimal
        with transaction.atomic():
            super().save(*args, **kwargs)
            
            if self.ba060gkey1 == self.ba060gkey2:
                Ab230.objects.filter(gkey=self.gkey).update(exrate=Decimal('1.0'))
                return

            mirror_exists = Ab230.objects.filter(
                ba060gkey1=self.ba060gkey2,
                ba060gkey2=self.ba060gkey1
            ).first()
            
            mirror_rate = None
            if self.exrate and self.exrate > 0:
                mirror_rate = Decimal('1.0') / self.exrate

            if not mirror_exists:
                current_max = Ab230.objects.aggregate(Max('serialno'))['serialno__max'] or 0
                Ab230.objects.create(
                    ba060gkey1=self.ba060gkey2,
                    ba060gkey2=self.ba060gkey1,
                    exrate=mirror_rate,
                    serialno=current_max + 1
                )
            else:
                if mirror_exists.exrate != mirror_rate:
                    Ab230.objects.filter(gkey=mirror_exists.gkey).update(exrate=mirror_rate)

    def delete(self, *args, **kwargs):
        with transaction.atomic():
            mirror = Ab230.objects.filter(ba060gkey1=self.ba060gkey2, ba060gkey2=self.ba060gkey1).first()
            super().delete(*args, **kwargs)
            if mirror:
                # Directly delete from objects to prevent recursion
                Ab230.objects.filter(gkey=mirror.gkey).delete()

class Ab231(models.Model):
    """財務交叉匯率歷史明細檔 ab231"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    ab230gkey = models.ForeignKey(Ab230, on_delete=models.CASCADE, db_column='ab230gkey')
    serialno = models.DecimalField(max_digits=10, decimal_places=0, db_column='serialno')
    exrate = models.DecimalField(max_digits=16, decimal_places=8, db_column='exrate')
    effectivedate = models.DateTimeField(db_column='effectivedate')
    chk = models.CharField(max_length=1, default='N', db_column='chk')

    class Meta:
        db_table = 'ab231'
        ordering = ['-effectivedate', 'serialno']
        verbose_name = '財務交叉匯率歷史'

    def save(self, *args, **kwargs):
        from decimal import Decimal
        with transaction.atomic():
            super().save(*args, **kwargs)
            
            # If chk == 'Y', update parent and unset siblings
            if self.chk == 'Y':
                Ab231.objects.filter(ab230gkey=self.ab230gkey).exclude(gkey=self.gkey).update(chk='N')
                self.ab230gkey.exrate = self.exrate
                self.ab230gkey.save() # Trigger Ab230.save() mirror update
            
            # Mirror Detail Logic:
            parent = self.ab230gkey
            mirror_parent = Ab230.objects.filter(
                ba060gkey1=parent.ba060gkey2,
                ba060gkey2=parent.ba060gkey1
            ).first()
            
            if mirror_parent and parent.ba060gkey1 != parent.ba060gkey2:
                mirror_rate = None
                if self.exrate and self.exrate > 0:
                    mirror_rate = Decimal('1.0') / self.exrate
                
                # Check if mirror detail already exists for same effective date
                mirror_detail = Ab231.objects.filter(
                    ab230gkey=mirror_parent,
                    effectivedate=self.effectivedate
                ).first()
                
                if not mirror_detail:
                    current_max = Ab231.objects.filter(ab230gkey=mirror_parent).aggregate(Max('serialno'))['serialno__max'] or 0
                    # Using self.__class__.objects.create directly to avoid recursive loop triggering same dates indefinitely.
                    # Wait, creating will trigger its own save(). To prevent loop, check if it's already updated.
                    # Let's use the static create/update methods.
                    new_gkey = generate_pb_gkey()
                    Ab231.objects.create(
                        gkey=new_gkey,
                        ab230gkey=mirror_parent,
                        serialno=current_max + 1,
                        exrate=mirror_rate,
                        effectivedate=self.effectivedate,
                        chk=self.chk
                    )
                else:
                    if mirror_detail.exrate != mirror_rate or mirror_detail.chk != self.chk:
                        # Use filter.update to avoid loop!
                        Ab231.objects.filter(gkey=mirror_detail.gkey).update(
                            exrate=mirror_rate,
                            chk=self.chk
                        )
                        if self.chk == 'Y':
                            Ab231.objects.filter(ab230gkey=mirror_parent).exclude(gkey=mirror_detail.gkey).update(chk='N')
                            mirror_parent.exrate = mirror_rate
                            mirror_parent.exrate = mirror_rate
                            mirror_parent.save()

    def delete(self, *args, **kwargs):
        with transaction.atomic():
            parent = self.ab230gkey
            mirror_parent = Ab230.objects.filter(ba060gkey1=parent.ba060gkey2, ba060gkey2=parent.ba060gkey1).first()
            if mirror_parent:
                mirror_detail = Ab231.objects.filter(ab230gkey=mirror_parent, effectivedate=self.effectivedate).first()
                if mirror_detail:
                    # Direct DB delete to avoid recursive loop
                    Ab231.objects.filter(gkey=mirror_detail.gkey).delete()
            super().delete(*args, **kwargs)


class Ba065(models.Model):
    """交易港口基本檔 ba065"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    serialno = models.DecimalField(max_digits=10, decimal_places=0, db_column='serialno')
    term = models.CharField(max_length=50, unique=True, db_column='term')

    class Meta:
        db_table = 'ba065'
        ordering = ['serialno']
        verbose_name = '交易港口'

    def __str__(self):
        return self.term


class Ba070(models.Model):
    """交易條件基本檔 ba070"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    serialno = models.DecimalField(max_digits=10, decimal_places=0, db_column='serialno')
    termtype = models.CharField(max_length=30, unique=True, db_column='termtype')

    class Meta:
        db_table = 'ba070'
        ordering = ['serialno']
        verbose_name = '交易條件'

    def __str__(self):
        return self.termtype


class Ba075(models.Model):
    """付款條件大類主檔 ba075"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    serialno = models.DecimalField(max_digits=10, decimal_places=0, db_column='serialno')
    paymenttype = models.CharField(max_length=20, unique=True, db_column='paymenttype')

    class Meta:
        db_table = 'ba075'
        ordering = ['serialno']
        verbose_name = '付款條件大類'

    def __str__(self):
        return self.paymenttype


class Ba076(models.Model):
    """付款條件明細檔 ba076 (外鍵關聯 ba075)"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    ba075gkey = models.ForeignKey(Ba075, on_delete=models.CASCADE, db_column='ba075gkey', to_field='gkey')
    payment = models.CharField(max_length=100, unique=True, db_column='payment')
    days = models.DecimalField(max_digits=10, decimal_places=0, blank=True, null=True, db_column='days')

    class Meta:
        db_table = 'ba076'
        verbose_name = '付款條件明細'

    def __str__(self):
        return self.payment


class Ba080(models.Model):
    """配件設定檔 ba080 — 對應 w_ba080 (鞋材配件類型字典)"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    serialno = models.DecimalField(max_digits=10, decimal_places=0, db_column='serialno')
    accessory = models.CharField(max_length=50, unique=True, db_column='accessory')
    description = models.CharField(max_length=100, blank=True, null=True, db_column='description')

    class Meta:
        db_table = 'ba080'
        ordering = ['serialno']
        verbose_name = '配件設定'

    def __str__(self):
        return self.accessory


class Ba090(models.Model):
    """快遞公司設定檔 ba090"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    serialno = models.DecimalField(max_digits=10, decimal_places=0, db_column='serialno')
    express = models.CharField(max_length=20, unique=True, db_column='express')

    class Meta:
        db_table = 'ba090'
        ordering = ['serialno']
        verbose_name = '快遞公司'

    def __str__(self):
        return self.express


class Ba091(models.Model):
    """運輸方式設定檔 ba091"""
    SHIP_TYPE_CHOICES = [
        ('1', 'SEA'), ('2', 'AIR'), ('3', 'EXPRESS'), ('4', 'OTHER'),
    ]
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    serialno = models.DecimalField(max_digits=10, decimal_places=0, db_column='serialno')
    shipvia = models.CharField(max_length=10, unique=True, db_column='shipvia')
    type = models.CharField(max_length=1, choices=SHIP_TYPE_CHOICES, db_column='type')

    class Meta:
        db_table = 'ba091'
        ordering = ['serialno']
        verbose_name = '運輸方式'

    def __str__(self):
        return f"{self.shipvia} ({self.get_type_display()})"


class Ba092(models.Model):
    """
    單位設定檔 ba092
    ⚠️ 歷史技術債：物理欄位名為 express，但實際存放的是鞋業單位 (PRS, DZ, PCS)
    """
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    serialno = models.DecimalField(max_digits=10, decimal_places=0, db_column='serialno')
    express = models.CharField(max_length=20, unique=True, db_column='express')

    class Meta:
        db_table = 'ba092'
        ordering = ['serialno']
        verbose_name = '單位設定'

    def __str__(self):
        return self.express


class Ba015(models.Model):
    """供應鏈實體統一主檔 (工廠/材料商/供應商) ba015"""
    ENTITY_TYPES = (
        ('1', '工廠'),
        ('2', '材料商'),
        ('3', '供應商'),
    )
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    type = models.CharField(max_length=1, choices=ENTITY_TYPES, default='1', db_column='type')
    factno = models.CharField(max_length=20, unique=True, db_column='factno')
    shortname = models.CharField(max_length=50, db_column='shortname')
    factname = models.CharField(max_length=100, db_column='factname')
    engfactname = models.CharField(max_length=60, blank=True, null=True, db_column='engfactname')
    ba003gkey = models.ForeignKey('Ba003', blank=True, null=True, on_delete=models.SET_NULL, db_column='ba003gkey')
    tel1 = models.CharField(max_length=40, blank=True, null=True, db_column='tel1')
    tel2 = models.CharField(max_length=40, blank=True, null=True, db_column='tel2')
    fax1 = models.CharField(max_length=40, blank=True, null=True, db_column='fax1')
    fax2 = models.CharField(max_length=40, blank=True, null=True, db_column='fax2')
    caddress = models.CharField(max_length=200, blank=True, null=True, db_column='caddress')
    eaddress = models.CharField(max_length=250, blank=True, null=True, db_column='eaddress')
    email = models.CharField(max_length=50, blank=True, null=True, db_column='email')
    website = models.CharField(max_length=100, blank=True, null=True, db_column='website')
    boss = models.CharField(max_length=20, blank=True, null=True, db_column='boss')
    bosstel = models.CharField(max_length=40, blank=True, null=True, db_column='bosstel')
    idno = models.CharField(max_length=30, blank=True, null=True, db_column='idno')
    ba075gkey = models.ForeignKey('Ba075', blank=True, null=True, on_delete=models.SET_NULL, db_column='ba075gkey')
    payment = models.CharField(max_length=100, blank=True, null=True, db_column='payment')
    ba070gkey = models.ForeignKey('Ba070', blank=True, null=True, on_delete=models.SET_NULL, db_column='ba070gkey')
    term = models.CharField(max_length=50, blank=True, null=True, db_column='term')
    ba060gkey = models.ForeignKey('Ba060', blank=True, null=True, on_delete=models.SET_NULL, db_column='ba060gkey')
    monthqty = models.DecimalField(max_digits=10, decimal_places=0, blank=True, null=True, db_column='monthqty')
    fmonthqty = models.DecimalField(max_digits=10, decimal_places=0, blank=True, null=True, db_column='fmonthqty')
    photopath = models.CharField(max_length=500, blank=True, null=True, db_column='photopath')
    parentgkey = models.ForeignKey('self', blank=True, null=True, on_delete=models.SET_NULL, related_name='branches', db_column='parentgkey')
    ba020gkey = models.ForeignKey('Ba020', blank=True, null=True, on_delete=models.SET_NULL, db_column='ba020gkey')
    bankinfo = models.TextField(blank=True, null=True, db_column='bankinfo')
    remark = models.TextField(blank=True, null=True, db_column='remark')
    yesno = models.CharField(max_length=2, default='Y', db_column='yesno')
    modifydate = models.DateTimeField(auto_now=True, db_column='modifydate')

    class Meta:
        db_table = 'ba015'
        ordering = ['factno']
        verbose_name = '供應鏈實體'

    def __str__(self):
        return f"[{self.factno}] {self.shortname}"


class Ba016(models.Model):
    """統一外部聯絡人明細子表 ba016"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    ba015gkey = models.ForeignKey(Ba015, on_delete=models.CASCADE, related_name='contacts', db_column='ba015gkey')
    contact = models.CharField(max_length=30, db_column='contact')
    department = models.CharField(max_length=30, blank=True, null=True, db_column='department')
    jobposition = models.CharField(max_length=30, blank=True, null=True, db_column='jobposition')
    tel = models.CharField(max_length=40, blank=True, null=True, db_column='tel')
    fax = models.CharField(max_length=40, blank=True, null=True, db_column='fax')
    mobilephone = models.CharField(max_length=40, blank=True, null=True, db_column='mobilephone')
    email = models.CharField(max_length=50, blank=True, null=True, db_column='email')
    parentgkey = models.ForeignKey('Ba015', blank=True, null=True, on_delete=models.SET_NULL, db_column='parentgkey', related_name='sub_contacts')

    class Meta:
        db_table = 'ba016'
        verbose_name = '外部聯絡人'


class Ba010(models.Model):
    """製鞋客戶大主檔 ba010"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    custno = models.CharField(max_length=20, unique=True, db_column='custno')
    shortname = models.CharField(max_length=30, db_column='shortname')
    custname = models.CharField(max_length=50, blank=True, null=True, db_column='custname')
    engcustname = models.CharField(max_length=60, blank=True, null=True, db_column='engcustname')
    ba010gkey = models.ForeignKey('self', blank=True, null=True, on_delete=models.SET_NULL, related_name='sub_agents', db_column='ba010gkey')
    tel1 = models.CharField(max_length=40, blank=True, null=True, db_column='tel1')
    tel2 = models.CharField(max_length=40, blank=True, null=True, db_column='tel2')
    fax1 = models.CharField(max_length=40, blank=True, null=True, db_column='fax1')
    fax2 = models.CharField(max_length=40, blank=True, null=True, db_column='fax2')
    caddress = models.CharField(max_length=100, blank=True, null=True, db_column='caddress')
    eaddress = models.TextField(blank=True, null=True, db_column='eaddress') 
    email = models.CharField(max_length=50, blank=True, null=True, db_column='email')
    website = models.CharField(max_length=100, blank=True, null=True, db_column='website')
    boss = models.CharField(max_length=20, blank=True, null=True, db_column='boss')
    shipto = models.CharField(max_length=60, blank=True, null=True, db_column='shipto')
    ba075gkey = models.ForeignKey('Ba075', blank=True, null=True, on_delete=models.SET_NULL, db_column='ba075gkey')
    payment = models.CharField(max_length=100, blank=True, null=True, db_column='payment')
    ba070gkey = models.ForeignKey('Ba070', blank=True, null=True, on_delete=models.SET_NULL, db_column='ba070gkey')
    term = models.CharField(max_length=50, blank=True, null=True, db_column='term')
    ba065gkey = models.ForeignKey('Ba065', blank=True, null=True, on_delete=models.SET_NULL, db_column='ba065gkey')
    express = models.CharField(max_length=20, blank=True, null=True, db_column='express')
    accountno = models.CharField(max_length=20, blank=True, null=True, db_column='accountno')
    ba002gkey = models.ForeignKey('Ba002', blank=True, null=True, on_delete=models.SET_NULL, db_column='ba002gkey')
    ba060gkey = models.ForeignKey('Ba060', blank=True, null=True, on_delete=models.SET_NULL, db_column='ba060gkey')
    unitprice = models.DecimalField(max_digits=8, decimal_places=4, blank=True, null=True, db_column='unitprice')
    ebcomm = models.DecimalField(max_digits=8, decimal_places=4, blank=True, null=True, db_column='ebcomm')
    cusebcomm = models.DecimalField(max_digits=8, decimal_places=4, blank=True, null=True, db_column='cusebcomm')
    othencost = models.DecimalField(max_digits=6, decimal_places=3, blank=True, null=True, db_column='othencost')
    laprice = models.DecimalField(max_digits=8, decimal_places=4, blank=True, null=True, db_column='laprice')
    
    forwarder = models.TextField(blank=True, null=True, db_column='forwarder')
    notify = models.TextField(blank=True, null=True, db_column='notify')
    specialinstruction = models.TextField(blank=True, null=True, db_column='specialinstruction')
    packinginstruction = models.TextField(blank=True, null=True, db_column='packinginstruction')
    mainmark = models.TextField(blank=True, null=True, db_column='mainmark')
    sidemark = models.TextField(blank=True, null=True, db_column='sidemark')
    lcstipulation = models.TextField(blank=True, null=True, db_column='lcstipulation')
    factname = models.TextField(blank=True, null=True, db_column='factname')
    packingremark = models.TextField(blank=True, null=True, db_column='packingremark')
    remark = models.TextField(blank=True, null=True, db_column='remark')

    packingpath = models.CharField(max_length=100, blank=True, null=True, db_column='packingpath')
    mainmarkpath = models.CharField(max_length=120, blank=True, null=True, db_column='mainmarkpath')
    sidemarkpath = models.CharField(max_length=120, blank=True, null=True, db_column='sidemarkpath')

    class Meta:
        db_table = 'ba010'
        ordering = ['custno']
        verbose_name = '客戶主檔'

    def __str__(self):
        return f"[{self.custno}] {self.shortname}"


class Ba011(models.Model):
    """客戶品牌關聯檔 ba011"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    ba010gkey = models.ForeignKey(Ba010, on_delete=models.CASCADE, related_name='brands', db_column='ba010gkey')
    ba009gkey = models.ForeignKey('Ba009', on_delete=models.CASCADE, db_column='ba009gkey')

    class Meta:
        db_table = 'ba011'
        verbose_name = '客戶經營品牌'


class Ba012(models.Model):
    """客戶 QC 驗貨官明細檔 ba012"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    ba010gkey = models.ForeignKey(Ba010, on_delete=models.CASCADE, related_name='qcs', db_column='ba010gkey')
    es101gkey = models.CharField(max_length=20, blank=True, null=True, db_column='es101gkey')
    qccontact = models.CharField(max_length=20, db_column='qccontact')
    tel = models.CharField(max_length=40, blank=True, null=True, db_column='tel')
    fax = models.CharField(max_length=40, blank=True, null=True, db_column='fax')
    mobilephone = models.CharField(max_length=40, blank=True, null=True, db_column='mobilephone')
    email = models.CharField(max_length=50, blank=True, null=True, db_column='email')

    class Meta:
        db_table = 'ba012'
        verbose_name = '客戶QC驗貨官'


class Ba013(models.Model):
    """客戶提供配件明細檔 ba013"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    ba010gkey = models.ForeignKey(Ba010, on_delete=models.CASCADE, related_name='accessories', db_column='ba010gkey')
    ba080gkey = models.ForeignKey('Ba080', on_delete=models.CASCADE, db_column='ba080gkey')
    serialno = models.DecimalField(max_digits=10, decimal_places=0, db_column='serialno')
    description = models.CharField(max_length=100, blank=True, null=True, db_column='description')
    unit = models.CharField(max_length=40, blank=True, null=True, db_column='unit')
    pairs = models.DecimalField(max_digits=10, decimal_places=0, blank=True, null=True, db_column='pairs')
    supplytype = models.CharField(max_length=30, blank=True, null=True, db_column='supplytype')

    class Meta:
        db_table = 'ba013'
        ordering = ['serialno']
        verbose_name = '客戶提供配件'


class Ba014(models.Model):
    """客戶業務聯絡人明細檔 ba014"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    ba010gkey = models.ForeignKey(Ba010, on_delete=models.CASCADE, related_name='contacts', db_column='ba010gkey')
    contact = models.CharField(max_length=30, db_column='contact')
    department = models.CharField(max_length=30, blank=True, null=True, db_column='department')
    jobposition = models.CharField(max_length=30, blank=True, null=True, db_column='jobposition')
    tel = models.CharField(max_length=40, blank=True, null=True, db_column='tel')
    fax = models.CharField(max_length=40, blank=True, null=True, db_column='fax')
    mobilephone = models.CharField(max_length=40, blank=True, null=True, db_column='mobilephone')
    email = models.CharField(max_length=50, blank=True, null=True, db_column='email')

    class Meta:
        db_table = 'ba014'
        verbose_name = '客戶聯絡窗口'


class SysAccount(models.Model):
    """系統帳號授權表 sys_accounts"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    hisystem = models.CharField(max_length=10, default='01', db_column='hisystem')
    accounts_id = models.CharField(max_length=50, unique=True, db_column='accounts_id')
    user_id = models.CharField(max_length=20, unique=True, db_column='user_id') 
    accounts = models.CharField(max_length=50, db_column='accounts') 
    user_pwd = models.CharField(max_length=50, db_column='user_pwd')
    peopdom_class = models.CharField(max_length=10, default='1', db_column='peopdom_class')
    create_date = models.DateTimeField(auto_now_add=True, db_column='create_date')
    status_sign = models.CharField(max_length=1, default='0', db_column='status_sign') 

    class Meta:
        managed = False
        db_table = 'sys_accounts'


class Ba085(models.Model):
    """SIZERUN 尺碼設定 ba085"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    serialno = models.DecimalField(max_digits=10, decimal_places=0, db_column='serialno', blank=True, null=True)
    startsize = models.DecimalField(max_digits=5, decimal_places=1, db_column='startsize')
    fullhalf = models.CharField(max_length=1, db_column='fullhalf') 
    endsize = models.DecimalField(max_digits=5, decimal_places=1, db_column='endsize')
    maxsize = models.DecimalField(max_digits=5, decimal_places=1, blank=True, null=True, db_column='maxsize')
    sizerange = models.CharField(max_length=30, db_column='sizerange', blank=True)

    class Meta:
        db_table = 'ba085'
        ordering = ['serialno']
        verbose_name = 'SIZERUN尺碼設定'

    def save(self, *args, **kwargs):
        # Auto generate display range string e.g. "6 - 12" or "6 / 12"
        connector = ' - '
        if self.fullhalf == '2':
            connector = ' / '
        elif self.fullhalf == '3':
            connector = ' & '
        
        self.sizerange = f"{self.startsize}{connector}{self.endsize}"
        super().save(*args, **kwargs)


class Es101(models.Model):
    """員工核心人事主檔 es101"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    employeeno = models.CharField(max_length=20, unique=True, db_column='employeeno')
    idno = models.CharField(max_length=20, unique=True, db_column='idno')
    chinesename = models.CharField(max_length=20, db_column='chinesename')
    englishname = models.CharField(max_length=30, db_column='englishname')
    ba045gkey = models.ForeignKey('Ba045', blank=True, null=True, on_delete=models.SET_NULL, db_column='ba045gkey')
    ba050gkey = models.ForeignKey('Ba050', blank=True, null=True, on_delete=models.SET_NULL, db_column='ba050gkey')
    ba005gkey = models.ForeignKey('Ba005', blank=True, null=True, on_delete=models.SET_NULL, db_column='ba005gkey')
    ba004gkey = models.ForeignKey('Ba004', blank=True, null=True, on_delete=models.SET_NULL, db_column='ba004gkey')
    sex = models.CharField(max_length=1, blank=True, null=True, db_column='sex') 
    marry = models.CharField(max_length=1, blank=True, null=True, db_column='marry') 
    bloodtype = models.CharField(max_length=1, blank=True, null=True, db_column='bloodtype')
    military = models.CharField(max_length=1, blank=True, null=True, db_column='military')
    height = models.DecimalField(max_digits=5, decimal_places=0, blank=True, null=True, db_column='height')
    weight = models.DecimalField(max_digits=5, decimal_places=0, blank=True, null=True, db_column='weight')
    birthday = models.DateTimeField(blank=True, null=True, db_column='birthday')
    birthplace = models.CharField(max_length=20, blank=True, null=True, db_column='birthplace')
    arrivaldate = models.DateTimeField(blank=True, null=True, db_column='arrivaldate')
    leavedate = models.DateTimeField(blank=True, null=True, db_column='leavedate')
    tel = models.CharField(max_length=40, blank=True, null=True, db_column='tel')
    mobilephone = models.CharField(max_length=40, blank=True, null=True, db_column='mobilephone')
    registertel = models.CharField(max_length=40, blank=True, null=True, db_column='registertel')
    contactaddress = models.CharField(max_length=100, blank=True, null=True, db_column='contactaddress')
    registeraddress = models.CharField(max_length=100, blank=True, null=True, db_column='registeraddress')
    email = models.CharField(max_length=50, blank=True, null=True, db_column='email')
    extension = models.CharField(max_length=10, blank=True, null=True, db_column='extension')
    languageability = models.CharField(max_length=100, blank=True, null=True, db_column='languageability')
    driverlicences = models.CharField(max_length=100, blank=True, null=True, db_column='driverlicences')
    systemuser = models.CharField(max_length=1, default='N', db_column='systemuser')
    signpath = models.CharField(max_length=200, blank=True, null=True, db_column='signpath')
    signerpic = models.CharField(max_length=200, blank=True, null=True, db_column='signerpic')
    remark = models.TextField(blank=True, null=True, db_column='remark')

    liaison = models.CharField(max_length=20, blank=True, null=True, db_column='liaison')
    relationship = models.CharField(max_length=20, blank=True, null=True, db_column='relationship')
    rtel = models.CharField(max_length=40, blank=True, null=True, db_column='rtel')
    rmobilephone = models.CharField(max_length=40, blank=True, null=True, db_column='rmobilephone')
    raddress = models.CharField(max_length=100, blank=True, null=True, db_column='raddress')

    class Meta:
        db_table = 'es101'
        ordering = ['employeeno']
        verbose_name = '員工帳號基本資料'

    def save(self, *args, **kwargs):
        self.employeeno = self.employeeno.upper()
        super().save(*args, **kwargs)
        
        # 安全連鎖: Sync with SysAccount
        if self.systemuser == 'Y':
            account = SysAccount.objects.filter(user_id=self.gkey).first()
            if not account:
                SysAccount.objects.create(
                    accounts_id=self.employeeno,
                    user_id=self.gkey,
                    accounts=self.englishname or self.chinesename,
                    user_pwd=self.employeeno, 
                    status_sign='0'
                )
            else:
                SysAccount.objects.filter(user_id=self.gkey).update(status_sign='0')
        else:
            SysAccount.objects.filter(user_id=self.gkey).update(status_sign='1')

    def delete(self, *args, **kwargs):
        # De-provision before hard delete to ensure security
        SysAccount.objects.filter(user_id=self.gkey).update(status_sign='1')
        super().delete(*args, **kwargs)


class Es102(models.Model):
    """員工學歷 es102"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    es101gkey = models.ForeignKey(Es101, on_delete=models.CASCADE, related_name='educations', db_column='es101gkey')
    schoolname = models.CharField(max_length=50, db_column='schoolname')
    daterange = models.CharField(max_length=30, blank=True, null=True, db_column='daterange')
    yearterm = models.DecimalField(max_digits=5, decimal_places=0, blank=True, null=True, db_column='yearterm')
    daynight = models.CharField(max_length=1, blank=True, null=True, db_column='daynight') 
    graduate = models.CharField(max_length=1, blank=True, null=True, db_column='graduate') 

    class Meta:
        db_table = 'es102'


class Es103(models.Model):
    """員工經歷 es103"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    es101gkey = models.ForeignKey(Es101, on_delete=models.CASCADE, related_name='experiences', db_column='es101gkey')
    companyname = models.CharField(max_length=50, db_column='companyname')
    jobposition = models.CharField(max_length=50, blank=True, null=True, db_column='jobposition')
    daterange = models.CharField(max_length=30, blank=True, null=True, db_column='daterange')
    salary = models.DecimalField(max_digits=12, decimal_places=4, blank=True, null=True, db_column='salary')

    class Meta:
        db_table = 'es103'


class Es104(models.Model):
    """員工眷屬 es104"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    es101gkey = models.ForeignKey(Es101, on_delete=models.CASCADE, related_name='families', db_column='es101gkey')
    relationship = models.CharField(max_length=50, db_column='relationship')
    familyname = models.CharField(max_length=50, db_column='familyname')
    birthday = models.DateTimeField(blank=True, null=True, db_column='birthday')
    companyname = models.CharField(max_length=30, blank=True, null=True, db_column='companyname')

    class Meta:
        db_table = 'es104'


# ============================================================================
# 👞 開發部門管理系統模組 (Product Development - DP)
# ============================================================================

class Dp001(models.Model):
    """開發片語字庫 dp001"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    serialno = models.DecimalField(max_digits=10, decimal_places=0, db_column='serialno')
    es101gkey = models.CharField(max_length=20, db_column='es101gkey')
    description = models.TextField(db_column='description')
    f2type = models.CharField(max_length=5, default='DP', db_column='f2type')

    class Meta:
        db_table = 'dp001'
        ordering = ['serialno']
        verbose_name = '開發片語字庫'

    def __str__(self):
        return f"[{self.serialno}] {self.description[:20]}"


class Dp002(models.Model):
    """樣品類別設定 dp002"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    serialno = models.DecimalField(max_digits=10, decimal_places=0, db_column='serialno')
    sampletype = models.CharField(max_length=20, unique=True, db_column='sampletype')
    samplename = models.CharField(max_length=50, blank=True, null=True, db_column='samplename')
    sampleename = models.CharField(max_length=50, blank=True, null=True, db_column='sampleename')

    class Meta:
        db_table = 'dp002'
        ordering = ['serialno']
        verbose_name = '樣品類別設定'

    def __str__(self):
        return f"{self.sampletype} - {self.samplename}"


class Dp003(models.Model):
    """鞋種類別設定 dp003"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    serialno = models.DecimalField(max_digits=10, decimal_places=0, db_column='serialno')
    shoetype = models.CharField(max_length=20, unique=True, db_column='shoetype')
    eshoetype = models.CharField(max_length=50, blank=True, null=True, db_column='eshoetype')

    class Meta:
        db_table = 'dp003'
        ordering = ['shoetype']
        verbose_name = '鞋種類別設定'

    def __str__(self):
        return self.shoetype


class Dp004(models.Model):
    """鞋種性別設定 (Master) dp004"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    serialno = models.DecimalField(max_digits=10, decimal_places=0, db_column='serialno')
    gender = models.CharField(max_length=20, db_column='gender', unique=True)
    sizetype = models.CharField(max_length=1, default='1', db_column='sizetype') # 1:US, 2:EU, 3:UK, 4:JP, 5:OT
    startsize = models.DecimalField(max_digits=4, decimal_places=1, default=0, db_column='startsize')
    fullhalf = models.CharField(max_length=1, default='1', db_column='fullhalf') # 1:-, 2:／, 3:&
    endsize = models.DecimalField(max_digits=4, decimal_places=1, default=0, db_column='endsize')
    maxsize = models.DecimalField(max_digits=4, decimal_places=1, default=0, db_column='maxsize')

    class Meta:
        db_table = 'dp004'
        ordering = ['serialno']
        verbose_name = '鞋種性別設定'

    def __str__(self):
        return self.gender


class Dp004A(models.Model):
    """鞋種性別尺碼對照表明細 (Detail) dp004a"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    dp004gkey = models.ForeignKey(Dp004, related_name='sizes', on_delete=models.CASCADE, db_column='dp004gkey')
    serialno = models.DecimalField(max_digits=10, decimal_places=0, db_column='serialno')
    tszus = models.CharField(max_length=10, blank=True, null=True, db_column='tszus')
    tszeu = models.CharField(max_length=10, blank=True, null=True, db_column='tszeu')
    tszuk = models.CharField(max_length=20, blank=True, null=True, db_column='tszuk')
    tszjp = models.CharField(max_length=10, blank=True, null=True, db_column='tszjp')
    tszot = models.CharField(max_length=10, blank=True, null=True, db_column='tszot')

    class Meta:
        db_table = 'dp004a'
        ordering = ['serialno']


class Dp005(models.Model):
    """部位類別設定 dp005"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    serialno = models.DecimalField(max_digits=10, decimal_places=0, db_column='serialno')
    partgroup = models.CharField(max_length=50, db_column='partgroup')
    epartgroup = models.CharField(max_length=50, db_column='epartgroup')
    parttype = models.CharField(max_length=10, blank=True, null=True, db_column='parttype')

    class Meta:
        db_table = 'dp005'
        ordering = ['serialno']
        verbose_name = '部位類別設定'

    def __str__(self):
        return f"{self.partgroup} ({self.epartgroup})"


class Dp006(models.Model):
    """部位基本資料 dp006 (指向 dp005)"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    serialno = models.DecimalField(max_digits=10, decimal_places=0, db_column='serialno')
    parts = models.CharField(max_length=50, db_column='parts')
    eparts = models.CharField(max_length=50, db_column='eparts')
    dp005gkey = models.ForeignKey(Dp005, on_delete=models.PROTECT, related_name='parts', db_column='dp005gkey')

    class Meta:
        db_table = 'dp006'
        ordering = ['serialno']
        verbose_name = '部位基本資料'

    def __str__(self):
        return f"{self.parts} ({self.eparts})"


class Dp008(models.Model):
    """Sock Label 設定 dp008"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    serialno = models.DecimalField(max_digits=10, decimal_places=0, db_column='serialno')
    socklabel = models.CharField(max_length=100, db_column='socklabel')

    class Meta:
        db_table = 'dp008'
        ordering = ['serialno']
        verbose_name = 'Sock Label 設定'

    def __str__(self):
        return self.socklabel


class Dp009(models.Model):
    """部件加工方式設定 dp009"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    serialno = models.DecimalField(max_digits=10, decimal_places=0, db_column='serialno')
    cmakedescription = models.CharField(max_length=200, db_column='cmakedescription')
    emakedescription = models.CharField(max_length=100, db_column='emakedescription', null=True, blank=True)

    class Meta:
        db_table = 'dp009'
        ordering = ['serialno']
        verbose_name = '部件加工方式設定'

    def __str__(self):
        return self.cmakedescription


class Dp007(models.Model):
    """鞋種部位設定 (多對多關聯中間表) dp007"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    dp003gkey = models.ForeignKey(Dp003, on_delete=models.CASCADE, related_name='assigned_parts', db_column='dp003gkey')
    dp006gkey = models.ForeignKey(Dp006, on_delete=models.CASCADE, related_name='assigned_shoe_kinds', db_column='dp006gkey')

    class Meta:
        db_table = 'dp007'
        unique_together = ('dp003gkey', 'dp006gkey')
        verbose_name = '鞋種部位設定'

    def __str__(self):
        return f"鞋種:{self.dp003gkey.shoetype} -> 部位:{self.dp006gkey.parts}"


class Dp010(models.Model):
    """楦頭基本資料 dp010"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    lastno = models.CharField(max_length=20, db_column='lastno')
    ba010gkey = models.ForeignKey('Ba010', on_delete=models.PROTECT, null=True, blank=True, db_column='ba010gkey')
    ba015gkey = models.ForeignKey('Ba015', on_delete=models.PROTECT, null=True, blank=True, db_column='ba015gkey', related_name='dp010_factory')
    dp004gkey = models.ForeignKey('Dp004', on_delete=models.PROTECT, null=True, blank=True, db_column='dp004gkey')
    startsize = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True, db_column='startsize')
    fullhalf = models.CharField(max_length=1, null=True, blank=True, db_column='fullhalf')
    endsize = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True, db_column='endsize')
    maxsize = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True, db_column='maxsize')
    issuedate = models.DateTimeField(null=True, blank=True, db_column='issuedate')
    cfmdate = models.DateTimeField(null=True, blank=True, db_column='cfmdate')
    palmrange = models.CharField(max_length=30, null=True, blank=True, db_column='palmrange')
    waistline = models.CharField(max_length=30, null=True, blank=True, db_column='waistline')
    backrange = models.CharField(max_length=30, null=True, blank=True, db_column='backrange')
    length = models.CharField(max_length=30, null=True, blank=True, db_column='length')
    girth = models.CharField(max_length=30, null=True, blank=True, db_column='girth')
    lasttype = models.CharField(max_length=30, null=True, blank=True, db_column='lasttype')
    toecharacter = models.CharField(max_length=30, null=True, blank=True, db_column='toecharacter')
    toespring = models.CharField(max_length=30, null=True, blank=True, db_column='toespring')
    heelsharp = models.CharField(max_length=30, null=True, blank=True, db_column='heelsharp')
    description = models.TextField(null=True, blank=True, db_column='description')
    remark = models.TextField(null=True, blank=True, db_column='remark')
    modifydate = models.DateTimeField(auto_now=True, db_column='modifydate')
    basicsize = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True, db_column='basicsize')
    photopath = models.CharField(max_length=400, null=True, blank=True, db_column='PhotoPath')
    year = models.CharField(max_length=4, null=True, blank=True, db_column='year')
    ba055gkey = models.ForeignKey('Ba055', on_delete=models.PROTECT, null=True, blank=True, db_column='ba055gkey')
    apba015gkey = models.ForeignKey('Ba015', on_delete=models.PROTECT, null=True, blank=True, db_column='apba015gkey', related_name='dp010_adopt_fty')
    dp015gkey = models.ForeignKey('Dp015', on_delete=models.PROTECT, null=True, blank=True, db_column='dp015gkey')
    dp020gkey = models.ForeignKey('Dp020', on_delete=models.PROTECT, null=True, blank=True, db_column='dp020gkey')
    adopted = models.CharField(max_length=1, default='N', db_column='adopted')
    ba005gkey = models.ForeignKey('Ba005', on_delete=models.PROTECT, null=True, blank=True, db_column='ba005gkey')
    midsoleno = models.CharField(max_length=40, null=True, blank=True, db_column='midsoleno')

    class Meta:
        db_table = 'dp010'
        verbose_name = '楦頭基本資料'
        ordering = ['lastno']

    def __str__(self):
        return self.lastno


class Dp015(models.Model):
    """大底基本資料 dp015"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    bottomno = models.CharField(max_length=20, db_column='bottomno')
    bottomname = models.CharField(max_length=30, null=True, blank=True, db_column='bottomname')
    year = models.CharField(max_length=4, null=True, blank=True, db_column='year')
    molddate = models.DateTimeField(null=True, blank=True, db_column='molddate')
    ba010gkey = models.ForeignKey('Ba010', on_delete=models.PROTECT, null=True, blank=True, db_column='ba010gkey')
    photopath = models.CharField(max_length=400, null=True, blank=True, db_column='photopath')
    remark = models.TextField(null=True, blank=True, db_column='remark')
    ba055gkey = models.ForeignKey('Ba055', on_delete=models.PROTECT, null=True, blank=True, db_column='ba055gkey')
    adopted = models.CharField(max_length=1, default='N', db_column='adopted')
    ba005gkey = models.ForeignKey('Ba005', on_delete=models.PROTECT, null=True, blank=True, db_column='ba005gkey')

    class Meta:
        db_table = 'dp015'
        verbose_name = '大底基本資料'
        ordering = ['bottomno']

    def __str__(self):
        return self.bottomno


class Dp020(models.Model):
    """鞋跟基本資料 dp020"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    heelno = models.CharField(max_length=20, db_column='heelno')
    issuedate = models.DateTimeField(null=True, blank=True, db_column='issuedate')
    year = models.CharField(max_length=4, null=True, blank=True, db_column='year')
    ba055gkey = models.ForeignKey('Ba055', on_delete=models.PROTECT, null=True, blank=True, db_column='ba055gkey')
    heelheight = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True, db_column='heelheight')
    material = models.CharField(max_length=100, null=True, blank=True, db_column='material')
    description = models.CharField(max_length=250, null=True, blank=True, db_column='description')
    ba015gkey = models.ForeignKey('Ba015', on_delete=models.PROTECT, null=True, blank=True, db_column='ba015gkey')
    adopted = models.CharField(max_length=1, default='N', db_column='adopted')
    remark = models.TextField(null=True, blank=True, db_column='remark')
    photopath = models.CharField(max_length=400, null=True, blank=True, db_column='photopath')
    dp010gkey = models.ForeignKey('Dp010', on_delete=models.PROTECT, null=True, blank=True, db_column='dp010gkey')
    dp015gkey = models.ForeignKey('Dp015', on_delete=models.PROTECT, null=True, blank=True, db_column='dp015gkey')
    unit = models.CharField(max_length=10, null=True, blank=True, db_column='unit')

    class Meta:
        db_table = 'dp020'
        verbose_name = '鞋跟基本資料'
        ordering = ['heelno']

    def __str__(self):
        return self.heelno


class Dp016(models.Model):
    """大底配模明細 dp016"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    serialno = models.IntegerField(db_column='serialno')
    dp015gkey = models.ForeignKey(Dp015, on_delete=models.CASCADE, related_name='molds', db_column='dp015gkey')
    bmba015gkey = models.ForeignKey('Ba015', on_delete=models.PROTECT, null=True, blank=True, db_column='bmba015gkey', related_name='dp016_bottom_fty')
    mdba015gkey = models.ForeignKey('Ba015', on_delete=models.PROTECT, null=True, blank=True, db_column='mdba015gkey', related_name='dp016_mold_fty')
    apba015gkey = models.ForeignKey('Ba015', on_delete=models.PROTECT, null=True, blank=True, db_column='apba015gkey', related_name='dp016_prod_fty')
    asba015gkey = models.ForeignKey('Ba015', on_delete=models.PROTECT, null=True, blank=True, db_column='asba015gkey', related_name='dp016_assembly_fty')
    dp010gkey = models.ForeignKey('Dp010', on_delete=models.PROTECT, null=True, blank=True, db_column='dp010gkey')
    dp004gkey = models.ForeignKey('Dp004', on_delete=models.PROTECT, null=True, blank=True, db_column='dp004gkey')
    mr035gkey = models.CharField(max_length=20, null=True, blank=True, db_column='mr035gkey')
    material = models.CharField(max_length=100, null=True, blank=True, db_column='material')
    size = models.CharField(max_length=10, null=True, blank=True, db_column='size')
    sizerun = models.CharField(max_length=20, null=True, blank=True, db_column='sizerun')
    startsize = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True, db_column='startsize')
    fullhalf = models.CharField(max_length=1, null=True, blank=True, db_column='fullhalf')
    endsize = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True, db_column='endsize')
    maxsize = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True, db_column='maxsize')
    molddate = models.DateTimeField(null=True, blank=True, db_column='molddate')
    ba003gkey = models.CharField(max_length=20, null=True, blank=True, db_column='ba003gkey')
    firstpairs = models.IntegerField(null=True, blank=True, db_column='firstpairs')
    firstetd = models.DateTimeField(null=True, blank=True, db_column='firstetd')
    woodmolddue = models.DateTimeField(null=True, blank=True, db_column='woodmolddue')
    woodmoldreal = models.DateTimeField(null=True, blank=True, db_column='woodmoldreal')
    woodmoldok = models.CharField(max_length=20, null=True, blank=True, db_column='woodmoldok')
    testmolddue = models.DateTimeField(null=True, blank=True, db_column='testmolddue')
    testmoldreal = models.DateTimeField(null=True, blank=True, db_column='testmoldreal')
    testmoldok = models.CharField(max_length=20, null=True, blank=True, db_column='testmoldok')
    cfmphotodue = models.DateTimeField(null=True, blank=True, db_column='cfmphotodue')
    cfmphotoreal = models.DateTimeField(null=True, blank=True, db_column='cfmphotoreal')
    cfmphotook = models.CharField(max_length=20, null=True, blank=True, db_column='cfmphotook')
    bacsizedue = models.DateTimeField(null=True, blank=True, db_column='bacsizedue')
    bacsizereal = models.DateTimeField(null=True, blank=True, db_column='bacsizereal')
    bacsizeok = models.CharField(max_length=20, null=True, blank=True, db_column='bacsizeok')
    fitdue = models.DateTimeField(null=True, blank=True, db_column='fitdue')
    fitreal = models.DateTimeField(null=True, blank=True, db_column='fitreal')
    fitok = models.CharField(max_length=20, null=True, blank=True, db_column='fitok')
    ba060gkey = models.ForeignKey('Ba060', on_delete=models.PROTECT, null=True, blank=True, db_column='ba060gkey')
    moldcharge = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, db_column='moldcharge')
    moldpayer = models.CharField(max_length=20, null=True, blank=True, db_column='moldpayer')
    moldplace = models.CharField(max_length=30, null=True, blank=True, db_column='moldplace')
    payment = models.CharField(max_length=100, null=True, blank=True, db_column='payment')
    price = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True, db_column='price')
    price1 = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True, db_column='price1')
    price2 = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True, db_column='price2')
    price3 = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True, db_column='price3')

    class Meta:
        db_table = 'dp016'
        ordering = ['serialno']


class Dp017(models.Model):
    """大底攤提費用 dp017"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    dp015gkey = models.ForeignKey(Dp015, on_delete=models.CASCADE, db_column='dp015gkey')
    dp016gkey = models.ForeignKey(Dp016, on_delete=models.CASCADE, related_name='costs', db_column='dp016gkey')
    serialno = models.IntegerField(db_column='serialno')
    moldtype = models.CharField(max_length=1, null=True, blank=True, db_column='moldtype')
    dp004gkey = models.ForeignKey('Dp004', on_delete=models.PROTECT, null=True, blank=True, db_column='dp004gkey')
    usedate = models.DateTimeField(null=True, blank=True, db_column='usedate')
    appyear = models.IntegerField(null=True, blank=True, db_column='appyear')
    fcpairs = models.IntegerField(null=True, blank=True, db_column='fcpairs')
    cost = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True, db_column='cost')
    amount = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True, db_column='amount')
    ba015gkey = models.ForeignKey('Ba015', on_delete=models.PROTECT, null=True, blank=True, db_column='ba015gkey', related_name='dp017_fty')
    ba060gkey = models.ForeignKey('Ba060', on_delete=models.PROTECT, null=True, blank=True, db_column='ba060gkey')
    exrate = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True, db_column='exrate')
    startsize = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True, db_column='startsize')
    fullhalf = models.CharField(max_length=1, null=True, blank=True, db_column='fullhalf')
    endsize = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True, db_column='endsize')
    maxsize = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True, db_column='maxsize')

    class Meta:
        db_table = 'dp017'
        ordering = ['serialno']


class Dp018(models.Model):
    """大底尺碼展開配量 dp018"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    dp015gkey = models.ForeignKey(Dp015, on_delete=models.CASCADE, db_column='dp015gkey')
    dp016gkey = models.ForeignKey(Dp016, on_delete=models.CASCADE, related_name='sizes', db_column='dp016gkey')
    dp017gkey = models.ForeignKey(Dp017, on_delete=models.CASCADE, null=True, blank=True, db_column='dp018_cost', related_name='sizes')
    serialno = models.IntegerField(db_column='serialno')
    size = models.CharField(max_length=10, db_column='size')
    cvalue = models.DecimalField(max_digits=10, decimal_places=2, default=0, db_column='cvalue')

    class Meta:
        db_table = 'dp018'
        ordering = ['serialno']


class Dp011(models.Model):
    """楦頭量法基本資料 dp011"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    serialno = models.IntegerField(db_column='serialno')
    dp010gkey = models.ForeignKey(Dp010, on_delete=models.CASCADE, related_name='measurements', db_column='dp010gkey')
    parts = models.CharField(max_length=100, db_column='parts')
    steps = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True, db_column='steps')
    unit = models.CharField(max_length=20, null=True, blank=True, db_column='unit')
    remark = models.CharField(max_length=50, null=True, blank=True, db_column='remark')
    chk = models.CharField(max_length=1, default='Y', db_column='chk')

    class Meta:
        db_table = 'dp011'
        ordering = ['serialno']


class Dp012(models.Model):
    """楦頭尺碼明細量值 dp012"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    serialno = models.IntegerField(db_column='serialno')
    dp010gkey = models.ForeignKey(Dp010, on_delete=models.CASCADE, db_column='dp010gkey')
    dp011gkey = models.ForeignKey(Dp011, on_delete=models.CASCADE, related_name='sizes', db_column='dp011gkey')
    size = models.CharField(max_length=10, db_column='size')
    cvalue = models.DecimalField(max_digits=10, decimal_places=4, default=0, db_column='cvalue')

    class Meta:
        db_table = 'dp012'
        ordering = ['serialno']


class Dp013(models.Model):
    """楦頭修改紀錄 dp013"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    dp010gkey = models.ForeignKey(Dp010, on_delete=models.CASCADE, related_name='histories', db_column='dp010gkey')
    modifydate = models.DateTimeField(db_column='modifydate', auto_now_add=True)
    description = models.TextField(db_column='Description', null=True, blank=True)

    class Meta:
        db_table = 'dp013'
        ordering = ['-modifydate']


class Dp014(models.Model):
    """楦頭庫存明細 dp014"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    dp010gkey = models.ForeignKey(Dp010, on_delete=models.CASCADE, related_name='stocks', db_column='dp010gkey')
    serialno = models.IntegerField(db_column='serialno')
    size = models.CharField(max_length=10, db_column='size')
    leftqty = models.DecimalField(max_digits=10, decimal_places=0, default=0, db_column='leftqty')
    rightqty = models.DecimalField(max_digits=10, decimal_places=0, default=0, db_column='rightqty')
    leftstockqty = models.DecimalField(max_digits=10, decimal_places=0, default=0, db_column='leftstockqty')
    rightstockqty = models.DecimalField(max_digits=10, decimal_places=0, default=0, db_column='rightstockqty')

    class Meta:
        db_table = 'dp014'
        ordering = ['serialno']


class Dp023(models.Model):
    """組別基本資料 dp023"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    serialno = models.IntegerField(db_column='serialno')
    groupname = models.CharField(max_length=50, db_column='groupname')
    dp010gkey = models.ForeignKey(Dp010, on_delete=models.PROTECT, null=True, blank=True, db_column='dp010gkey')
    dp015gkey = models.ForeignKey(Dp015, on_delete=models.PROTECT, null=True, blank=True, db_column='dp015gkey')
    dp020gkey = models.ForeignKey(Dp020, on_delete=models.PROTECT, null=True, blank=True, db_column='dp020gkey')

    class Meta:
        db_table = 'dp023'
        ordering = ['serialno']


class Dp025(models.Model):
    """型體基本資料主表 dp025"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    dp031gkey = models.CharField(max_length=20, null=True, blank=True, db_column='dp031gkey') # 樣品細項關聯鍵
    styleno = models.CharField(max_length=60, unique=True, db_column='styleno')
    stylename = models.CharField(max_length=50, null=True, blank=True, db_column='stylename')
    stock = models.CharField(max_length=60, null=True, blank=True, db_column='stock')
    colorname = models.CharField(max_length=100, null=True, blank=True, db_column='colorname')
    year = models.CharField(max_length=4, db_column='year')
    ba055gkey = models.ForeignKey('Ba055', on_delete=models.PROTECT, null=True, blank=True, db_column='ba055gkey') # 季節
    dp003gkey = models.ForeignKey('Dp003', on_delete=models.PROTECT, null=True, blank=True, db_column='dp003gkey') # 鞋種
    dp004gkey = models.ForeignKey('Dp004', on_delete=models.PROTECT, null=True, blank=True, db_column='dp004gkey') # 性別
    sizerun = models.CharField(max_length=30, null=True, blank=True, db_column='sizerun')
    dp010gkey = models.ForeignKey('Dp010', on_delete=models.PROTECT, null=True, blank=True, db_column='dp010gkey') # 楦頭
    dp015gkey = models.ForeignKey('Dp015', on_delete=models.PROTECT, null=True, blank=True, db_column='dp015gkey') # 大底
    dp020gkey = models.ForeignKey('Dp020', on_delete=models.PROTECT, null=True, blank=True, db_column='dp020gkey') # 鞋跟
    logo = models.CharField(max_length=30, null=True, blank=True, db_column='logo')
    adopted = models.CharField(max_length=1, default='N', db_column='adopted')
    oldstyle = models.CharField(max_length=50, null=True, blank=True, db_column='oldstyle')
    
    # 鞋材部位描述
    upper = models.CharField(max_length=800, null=True, blank=True, db_column='upper')
    lining = models.CharField(max_length=800, null=True, blank=True, db_column='lining')
    sock = models.CharField(max_length=800, null=True, blank=True, db_column='sock')
    bottom = models.CharField(max_length=800, null=True, blank=True, db_column='bottom')
    heel = models.CharField(max_length=800, null=True, blank=True, db_column='heel')
    tongue = models.CharField(max_length=800, null=True, blank=True, db_column='tongue')
    material = models.TextField(null=True, blank=True, db_column='material')
    
    firstshipdate = models.DateTimeField(null=True, blank=True, db_column='firstshipdate')
    firstpairs = models.DecimalField(max_digits=10, decimal_places=0, default=0, db_column='firstpairs')
    remark = models.TextField(null=True, blank=True, db_column='remark')
    modifydate = models.DateTimeField(null=True, blank=True, db_column='modifydate')
    
    # 項目跟蹤日曆 (Milestone Calendar)
    trandue = models.DateTimeField(null=True, blank=True, db_column='trandue')
    tranreal = models.DateTimeField(null=True, blank=True, db_column='tranreal')
    cutcfmdue = models.DateTimeField(null=True, blank=True, db_column='cutcfmdue')
    cutcfmreal = models.DateTimeField(null=True, blank=True, db_column='cutcfmreal')
    baccfmdue = models.DateTimeField(null=True, blank=True, db_column='baccfmdue')
    baccfmreal = models.DateTimeField(null=True, blank=True, db_column='baccfmreal')
    cfmdate = models.DateTimeField(null=True, blank=True, db_column='cfmdate')
    senddate = models.DateTimeField(null=True, blank=True, db_column='senddate')
    lmscfmdue = models.DateTimeField(null=True, blank=True, db_column='lmscfmdue')
    lmscfmreal = models.DateTimeField(null=True, blank=True, db_column='lmscfmreal')
    newknifedue = models.DateTimeField(null=True, blank=True, db_column='newknifedue')
    newknifereal = models.DateTimeField(null=True, blank=True, db_column='newknifereal')
    fitknifedue = models.DateTimeField(null=True, blank=True, db_column='fitknifedue')
    fitknifereal = models.DateTimeField(null=True, blank=True, db_column='fitknifereal')
    
    photopath = models.CharField(max_length=400, null=True, blank=True, db_column='photopath')
    dp023gkey = models.ForeignKey('Dp023', on_delete=models.PROTECT, null=True, blank=True, db_column='dp023gkey') # 組別
    confirms = models.CharField(max_length=1, default='N', db_column='confirms')
    issuedate = models.DateTimeField(null=True, blank=True, db_column='issuedate')
    es101gkey = models.ForeignKey('Es101', on_delete=models.PROTECT, null=True, blank=True, db_column='es101gkey') # Maker

    class Meta:
        db_table = 'dp025'


class Dp026(models.Model):
    """型體報價細項 dp026"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    dp025gkey = models.ForeignKey(Dp025, related_name='details_dp026', on_delete=models.CASCADE, db_column='dp025gkey')
    serialno = models.IntegerField(db_column='serialno')
    ba010gkey = models.ForeignKey('Ba010', on_delete=models.PROTECT, null=True, blank=True, db_column='ba010gkey') # 客戶
    ba015gkey = models.ForeignKey('Ba015', on_delete=models.PROTECT, null=True, blank=True, db_column='ba015gkey') # 工廠
    sizerun = models.CharField(max_length=30, null=True, blank=True, db_column='sizerun')
    ba060gkey = models.ForeignKey('Ba060', related_name='dp026_price_curr', on_delete=models.PROTECT, null=True, blank=True, db_column='ba060gkey') # 報價幣別
    price = models.DecimalField(max_digits=12, decimal_places=4, default=0, db_column='price')
    cba060gkey = models.ForeignKey('Ba060', related_name='dp026_cost_curr', on_delete=models.PROTECT, null=True, blank=True, db_column='cba060gkey') # 成本幣別
    cost = models.DecimalField(max_digits=12, decimal_places=4, default=0, db_column='cost')
    ba070gkey = models.ForeignKey('Ba070', on_delete=models.PROTECT, null=True, blank=True, db_column='ba070gkey') # 貿易條件
    remark = models.CharField(max_length=150, null=True, blank=True, db_column='remark')
    stock = models.CharField(max_length=60, null=True, blank=True, db_column='stock')
    quotedate = models.DateTimeField(null=True, blank=True, db_column='quotedate')
    term = models.CharField(max_length=100, null=True, blank=True, db_column='term') # Port

    class Meta:
        db_table = 'dp026'
        ordering = ['serialno']


class Dp027(models.Model):
    """型體技轉資料 dp027"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    dp025gkey = models.ForeignKey(Dp025, related_name='details_dp027', on_delete=models.CASCADE, db_column='dp025gkey')
    shipto = models.CharField(max_length=30, null=True, blank=True, db_column='shipto')
    cc = models.CharField(max_length=30, null=True, blank=True, db_column='cc')
    shipfrom = models.CharField(max_length=30, null=True, blank=True, db_column='shipfrom')
    tranfact = models.CharField(max_length=200, null=True, blank=True, db_column='tranfact')
    tranpattern = models.CharField(max_length=200, null=True, blank=True, db_column='tranpattern')
    trandev = models.CharField(max_length=200, null=True, blank=True, db_column='trandev')
    tranqc = models.CharField(max_length=200, null=True, blank=True, db_column='tranqc')
    tranmold = models.CharField(max_length=200, null=True, blank=True, db_column='tranmold')
    modifymemo = models.TextField(null=True, blank=True, db_column='modifymemo')
    factcomment = models.TextField(null=True, blank=True, db_column='factcomment')
    ba015gkey = models.ForeignKey('Ba015', on_delete=models.PROTECT, null=True, blank=True, db_column='ba015gkey') # FTY
    issuedate = models.DateTimeField(null=True, blank=True, db_column='issuedate')
    trandate = models.DateTimeField(null=True, blank=True, db_column='trandate')

    class Meta:
        db_table = 'dp027'


class Dp028(models.Model):
    """型體技術配件細項 dp028"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    dp025gkey = models.ForeignKey(Dp025, related_name='details_dp028', on_delete=models.CASCADE, db_column='dp025gkey')
    serialno = models.IntegerField(db_column='serialno')
    accessory = models.CharField(max_length=50, db_column='accessory')
    description = models.CharField(max_length=500, null=True, blank=True, db_column='description')
    remark = models.CharField(max_length=200, null=True, blank=True, db_column='remark')

    class Meta:
        db_table = 'dp028'
        ordering = ['serialno']


class Dp030(models.Model):
    """樣品單主檔 dp030"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    dp002gkey = models.ForeignKey('Dp002', on_delete=models.PROTECT, null=True, blank=True, db_column='dp002gkey') # SampleType
    sampleno = models.CharField(max_length=20, unique=True, db_column='sampleno') # 樣品單號
    year = models.CharField(max_length=4, null=True, blank=True, db_column='year')
    ba055gkey = models.ForeignKey('Ba055', on_delete=models.PROTECT, null=True, blank=True, db_column='ba055gkey') # Season
    issuedate = models.DateTimeField(null=True, blank=True, db_column='issuedate')
    ba010gkey = models.ForeignKey('Ba010', related_name='dp030_customer', on_delete=models.PROTECT, null=True, blank=True, db_column='ba010gkey') # Customer
    ba015gkey = models.ForeignKey('Ba015', on_delete=models.PROTECT, null=True, blank=True, db_column='ba015gkey') # FTY
    rqstby = models.CharField(max_length=50, null=True, blank=True, db_column='rqstby')
    agentgkey = models.ForeignKey('Ba010', related_name='dp030_agent', on_delete=models.PROTECT, null=True, blank=True, db_column='agentgkey')
    ba009gkey = models.ForeignKey('Ba009', on_delete=models.PROTECT, null=True, blank=True, db_column='ba009gkey') # Brand
    styleno = models.CharField(max_length=60, null=True, blank=True, db_column='styleno')
    stylename = models.CharField(max_length=60, null=True, blank=True, db_column='stylename')
    stock = models.CharField(max_length=60, null=True, blank=True, db_column='stock')
    dp003gkey = models.ForeignKey('Dp003', on_delete=models.PROTECT, null=True, blank=True, db_column='dp003gkey') # ShoeType
    dp004gkey = models.ForeignKey('Dp004', on_delete=models.PROTECT, null=True, blank=True, db_column='dp004gkey') # Gender
    size = models.CharField(max_length=20, null=True, blank=True, db_column='size')
    duedate = models.DateTimeField(null=True, blank=True, db_column='duedate')
    custdate = models.DateTimeField(null=True, blank=True, db_column='custdate')
    ba005gkey = models.ForeignKey('Ba005', on_delete=models.PROTECT, null=True, blank=True, db_column='ba005gkey') # BelongTo
    dp010gkey = models.ForeignKey('Dp010', on_delete=models.PROTECT, null=True, blank=True, db_column='dp010gkey') # Last
    dp015gkey = models.ForeignKey('Dp015', on_delete=models.PROTECT, null=True, blank=True, db_column='dp015gkey') # Outsole
    dp020gkey = models.ForeignKey('Dp020', on_delete=models.PROTECT, null=True, blank=True, db_column='dp020gkey') # Heel
    ba003gkey = models.ForeignKey('Ba003', on_delete=models.PROTECT, null=True, blank=True, db_column='ba003gkey') # Origin
    logo = models.CharField(max_length=50, null=True, blank=True, db_column='logo')
    dp008gkey = models.ForeignKey('Dp008', on_delete=models.PROTECT, null=True, blank=True, db_column='dp008gkey') # SockLabel
    construction = models.CharField(max_length=30, null=True, blank=True, db_column='construction')
    packing = models.CharField(max_length=20, null=True, blank=True, db_column='packing')
    status = models.CharField(max_length=1, default='1', db_column='status') # 1=進行中, 2=已寄出, 3=已完成, 0=取消
    revise = models.CharField(max_length=2, null=True, blank=True, db_column='revise')
    revisedate = models.DateTimeField(null=True, blank=True, db_column='revisedate')
    orderno = models.CharField(max_length=20, null=True, blank=True, db_column='orderno')
    charge = models.CharField(max_length=1, default='N', db_column='charge')
    designer = models.CharField(max_length=50, null=True, blank=True, db_column='designer')
    mes101gkey = models.ForeignKey('Es101', related_name='dp030_mes101', on_delete=models.PROTECT, null=True, blank=True, db_column='mes101gkey') # Manager
    aes101gkey = models.ForeignKey('Es101', related_name='dp030_aes101', on_delete=models.PROTECT, null=True, blank=True, db_column='aes101gkey')
    es101gkey = models.ForeignKey('Es101', related_name='dp030_es101', on_delete=models.PROTECT, null=True, blank=True, db_column='es101gkey') # Maker
    cost = models.CharField(max_length=1, default='N', db_column='cost')
    remark = models.TextField(null=True, blank=True, db_column='remark')
    dp023gkey = models.ForeignKey('Dp023', on_delete=models.PROTECT, null=True, blank=True, db_column='dp023gkey') # Group
    approve = models.CharField(max_length=1, default='N', db_column='approve')
    revisememo = models.TextField(null=True, blank=True, db_column='revisememo')
    remark1 = models.CharField(max_length=4000, null=True, blank=True, db_column='remark1')
    remark2 = models.CharField(max_length=4000, null=True, blank=True, db_column='remark2')
    remark3 = models.CharField(max_length=4000, null=True, blank=True, db_column='remark3')
    remark4 = models.CharField(max_length=4000, null=True, blank=True, db_column='remark4')
    versions = models.CharField(max_length=4, null=True, blank=True, db_column='versions')
    aba060gkey = models.ForeignKey('Ba060', on_delete=models.PROTECT, null=True, blank=True, db_column='aba060gkey') # Currency
    amount = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True, db_column='amount')
    wagescost = models.DecimalField(max_digits=12, decimal_places=4, default=0, db_column='wagescost')
    managecost = models.DecimalField(max_digits=12, decimal_places=4, default=0, db_column='managecost')
    profit = models.DecimalField(max_digits=12, decimal_places=4, default=0, db_column='profit')

    # DP055 Cost Accounting fields (added by migration dp055_costing_fields)
    # NOTE: DP055 API field "ba060gkey" maps to legacy dp030.aba060gkey (already exists above).
    # Do NOT add dp030.ba060gkey here unless PB source/database later proves
    # it is an independent physical column separate from aba060gkey.
    costdate = models.DateField(null=True, blank=True, db_column='costdate')  # 核算日期
    lop = models.DecimalField(max_digits=12, decimal_places=4, default=0, db_column='lop')  # wagescost+managecost+profit
    totalfob = models.DecimalField(max_digits=10, decimal_places=4, default=0, db_column='totalfob')  # 總 FOB
    costremark = models.CharField(max_length=200, null=True, blank=True, db_column='costremark')  # 核算備註
    capprove = models.CharField(max_length=1, default='N', db_column='capprove')  # 成本審核狀態 Y/N

    class Meta:
        db_table = 'dp030'


class Dp031(models.Model):
    """樣品配色明細 dp031"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    dp030gkey = models.ForeignKey(Dp030, related_name='details_dp031', on_delete=models.CASCADE, db_column='dp030gkey')
    serialno = models.IntegerField(db_column='serialno')
    styleno = models.CharField(max_length=60, null=True, blank=True, db_column='styleno')
    colorcode = models.CharField(max_length=20, null=True, blank=True, db_column='colorcode')
    color = models.CharField(max_length=100, null=True, blank=True, db_column='color')
    ecolor = models.CharField(max_length=100, null=True, blank=True, db_column='ecolor')
    # Description summary fields synced via React or Trigger from Dp032 (PB wf_setvalue)
    upper = models.CharField(max_length=800, null=True, blank=True, db_column='upper')
    lining = models.CharField(max_length=800, null=True, blank=True, db_column='lining')
    sock = models.CharField(max_length=800, null=True, blank=True, db_column='sock')
    bottom = models.CharField(max_length=800, null=True, blank=True, db_column='bottom')
    heel = models.CharField(max_length=800, null=True, blank=True, db_column='heel')
    tongue = models.CharField(max_length=800, null=True, blank=True, db_column='tongue')
    ornament = models.CharField(max_length=800, null=True, blank=True, db_column='ornament')
    other = models.CharField(max_length=800, null=True, blank=True, db_column='other')
    totalpairs = models.DecimalField(max_digits=8, decimal_places=1, default=0, db_column='totalpairs')
    pono = models.CharField(max_length=20, null=True, blank=True, db_column='pono')
    pic = models.CharField(max_length=1, default='N', db_column='pic')
    photopath = models.CharField(max_length=400, null=True, blank=True, db_column='photopath')
    status = models.CharField(max_length=1, default='1', db_column='status')
    # NOTE (2026-06-01 schema verified): editdate, mdes101gkey, remark DO exist in PostgreSQL.
    # Previous comment was incorrect. These fields are now properly declared below.
    editdate = models.DateTimeField(null=True, blank=True, db_column='editdate')
    mdes101gkey = models.ForeignKey('Es101', on_delete=models.PROTECT, null=True, blank=True, db_column='mdes101gkey', related_name='dp031_modifier')
    remark = models.CharField(max_length=250, null=True, blank=True, db_column='remark')

    # DP055 Cost Accounting field (added by migration dp055_costing_fields)
    chk = models.CharField(max_length=1, default='N', db_column='chk')  # 配色是否打勾納入成本計算

    class Meta:
        db_table = 'dp031'
        ordering = ['serialno']


class Dp033(models.Model):
    """二階明細：樣品配色尺碼配比 dp033"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    dp031gkey = models.ForeignKey(Dp031, related_name='details_dp033', on_delete=models.CASCADE, db_column='dp031gkey')
    dp030gkey = models.ForeignKey(Dp030, on_delete=models.CASCADE, db_column='dp030gkey')
    serialno = models.IntegerField(db_column='serialno')
    size = models.CharField(max_length=10, db_column='size')
    custpairs = models.DecimalField(max_digits=8, decimal_places=1, default=0, db_column='custpairs')
    keeppairs = models.DecimalField(max_digits=8, decimal_places=1, default=0, db_column='keeppairs')
    sentpairs = models.DecimalField(max_digits=8, decimal_places=1, default=0, db_column='sentpairs')
    receive = models.DecimalField(max_digits=8, decimal_places=1, default=0, db_column='receive')
    finishpairs = models.DecimalField(max_digits=8, decimal_places=1, default=0, db_column='finishpairs')
    barcode = models.CharField(max_length=20, null=True, blank=True, db_column='barcode')
    sentduedate = models.DateTimeField(null=True, blank=True, db_column='sentduedate')
    approvedate = models.DateTimeField(null=True, blank=True, db_column='approvedate')
    shipmentdt = models.DateTimeField(null=True, blank=True, db_column='shipmentdt')
    scheduleremark = models.TextField(null=True, blank=True, db_column='scheduleremark')

    class Meta:
        db_table = 'dp033'
        ordering = ['serialno']


class Dp032(models.Model):
    """樣品部位材料明細 dp032"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    dp030gkey = models.ForeignKey(Dp030, related_name='details_dp032', on_delete=models.CASCADE, db_column='dp030gkey')
    serialno = models.IntegerField(db_column='serialno')
    parts = models.CharField(max_length=100, null=True, blank=True, db_column='parts')
    eparts = models.CharField(max_length=100, null=True, blank=True, db_column='eparts')
    # Color/Material Setup 1
    mr010gkey1 = models.CharField(max_length=20, null=True, blank=True, db_column='mr010gkey1')
    clrnm1 = models.CharField(max_length=100, null=True, blank=True, db_column='clrnm1')
    clrenm1 = models.CharField(max_length=100, null=True, blank=True, db_column='clrenm1')
    mr035gkey1 = models.CharField(max_length=20, null=True, blank=True, db_column='mr035gkey1')
    cmaterial1 = models.CharField(max_length=250, null=True, blank=True, db_column='cmaterial1')
    ematerial1 = models.CharField(max_length=250, null=True, blank=True, db_column='ematerial1')
    ba015gkey1 = models.CharField(max_length=20, null=True, blank=True, db_column='ba015gkey1')
    pantone1 = models.CharField(max_length=20, null=True, blank=True, db_column='pantone1')
    # Color/Material Setup 2
    mr010gkey2 = models.CharField(max_length=20, null=True, blank=True, db_column='mr010gkey2')
    clrnm2 = models.CharField(max_length=100, null=True, blank=True, db_column='clrnm2')
    clrenm2 = models.CharField(max_length=100, null=True, blank=True, db_column='clrenm2')
    mr035gkey2 = models.CharField(max_length=20, null=True, blank=True, db_column='mr035gkey2')
    cmaterial2 = models.CharField(max_length=250, null=True, blank=True, db_column='cmaterial2')
    ematerial2 = models.CharField(max_length=250, null=True, blank=True, db_column='ematerial2')
    ba015gkey2 = models.CharField(max_length=20, null=True, blank=True, db_column='ba015gkey2')
    pantone2 = models.CharField(max_length=20, null=True, blank=True, db_column='pantone2')
    # Color/Material Setup 3
    mr010gkey3 = models.CharField(max_length=20, null=True, blank=True, db_column='mr010gkey3')
    clrnm3 = models.CharField(max_length=100, null=True, blank=True, db_column='clrnm3')
    clrenm3 = models.CharField(max_length=100, null=True, blank=True, db_column='clrenm3')
    mr035gkey3 = models.CharField(max_length=20, null=True, blank=True, db_column='mr035gkey3')
    cmaterial3 = models.CharField(max_length=250, null=True, blank=True, db_column='cmaterial3')
    ematerial3 = models.CharField(max_length=250, null=True, blank=True, db_column='ematerial3')
    ba015gkey3 = models.CharField(max_length=20, null=True, blank=True, db_column='ba015gkey3')
    pantone3 = models.CharField(max_length=20, null=True, blank=True, db_column='pantone3')
    # Color/Material Setup 4
    mr010gkey4 = models.CharField(max_length=20, null=True, blank=True, db_column='mr010gkey4')
    clrnm4 = models.CharField(max_length=100, null=True, blank=True, db_column='clrnm4')
    clrenm4 = models.CharField(max_length=100, null=True, blank=True, db_column='clrenm4')
    mr035gkey4 = models.CharField(max_length=20, null=True, blank=True, db_column='mr035gkey4')
    cmaterial4 = models.CharField(max_length=250, null=True, blank=True, db_column='cmaterial4')
    ematerial4 = models.CharField(max_length=250, null=True, blank=True, db_column='ematerial4')
    ba015gkey4 = models.CharField(max_length=20, null=True, blank=True, db_column='ba015gkey4')
    pantone4 = models.CharField(max_length=20, null=True, blank=True, db_column='pantone4')

    makedescription = models.CharField(max_length=100, null=True, blank=True, db_column='makedescription')
    unit = models.CharField(max_length=20, null=True, blank=True, db_column='unit')
    qprp = models.DecimalField(max_digits=10, decimal_places=5, default=0, db_column='qprp')
    dp005gkey = models.ForeignKey('Dp005', on_delete=models.PROTECT, null=True, blank=True, db_column='dp005gkey') # PartGroup
    costing = models.CharField(max_length=1, default='0', db_column='costing')
    loss = models.DecimalField(max_digits=6, decimal_places=3, default=0, db_column='loss')
    
    cost1 = models.DecimalField(max_digits=12, decimal_places=4, default=0, db_column='cost1')
    loss1 = models.DecimalField(max_digits=8, decimal_places=3, default=0, db_column='loss1')
    grossyield1 = models.DecimalField(max_digits=12, decimal_places=4, default=0, db_column='grossyield1')
    
    cost2 = models.DecimalField(max_digits=12, decimal_places=4, default=0, db_column='cost2')
    loss2 = models.DecimalField(max_digits=8, decimal_places=3, default=0, db_column='loss2')
    grossyield2 = models.DecimalField(max_digits=12, decimal_places=4, default=0, db_column='grossyield2')
    
    cost3 = models.DecimalField(max_digits=12, decimal_places=4, default=0, db_column='cost3')
    loss3 = models.DecimalField(max_digits=8, decimal_places=3, default=0, db_column='loss3')
    grossyield3 = models.DecimalField(max_digits=12, decimal_places=4, default=0, db_column='grossyield3')
    
    cost4 = models.DecimalField(max_digits=12, decimal_places=4, default=0, db_column='cost4')
    loss4 = models.DecimalField(max_digits=8, decimal_places=3, default=0, db_column='loss4')
    grossyield4 = models.DecimalField(max_digits=12, decimal_places=4, default=0, db_column='grossyield4')

    # DP055 Cost Accounting fields (added by migration dp055_costing_fields)
    # yield = 淨用量, totalcost = 雙成本, nutax = 未稅成本, exrate = 匯率, uom = 單位
    # Fields cost1~4 / loss1~4 / grossyield1~4 already exist above.
    yield1 = models.DecimalField(max_digits=12, decimal_places=4, default=0, db_column='yield1')
    totalcost1 = models.DecimalField(max_digits=12, decimal_places=4, default=0, db_column='totalcost1')
    nutax1 = models.DecimalField(max_digits=12, decimal_places=4, default=0, db_column='nutax1')
    exrate1 = models.DecimalField(max_digits=10, decimal_places=4, default=1, db_column='exrate1')
    uom1 = models.CharField(max_length=20, null=True, blank=True, db_column='uom1')

    yield2 = models.DecimalField(max_digits=12, decimal_places=4, default=0, db_column='yield2')
    totalcost2 = models.DecimalField(max_digits=12, decimal_places=4, default=0, db_column='totalcost2')
    nutax2 = models.DecimalField(max_digits=12, decimal_places=4, default=0, db_column='nutax2')
    exrate2 = models.DecimalField(max_digits=10, decimal_places=4, default=1, db_column='exrate2')
    uom2 = models.CharField(max_length=20, null=True, blank=True, db_column='uom2')

    yield3 = models.DecimalField(max_digits=12, decimal_places=4, default=0, db_column='yield3')
    totalcost3 = models.DecimalField(max_digits=12, decimal_places=4, default=0, db_column='totalcost3')
    nutax3 = models.DecimalField(max_digits=12, decimal_places=4, default=0, db_column='nutax3')
    exrate3 = models.DecimalField(max_digits=10, decimal_places=4, default=1, db_column='exrate3')
    uom3 = models.CharField(max_length=20, null=True, blank=True, db_column='uom3')

    yield4 = models.DecimalField(max_digits=12, decimal_places=4, default=0, db_column='yield4')
    totalcost4 = models.DecimalField(max_digits=12, decimal_places=4, default=0, db_column='totalcost4')
    nutax4 = models.DecimalField(max_digits=12, decimal_places=4, default=0, db_column='nutax4')
    exrate4 = models.DecimalField(max_digits=10, decimal_places=4, default=1, db_column='exrate4')
    uom4 = models.CharField(max_length=20, null=True, blank=True, db_column='uom4')

    class Meta:
        db_table = 'dp032'
        ordering = ['serialno']


class Dp034(models.Model):
    """樣品單商標加工 dp034"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    dp030gkey = models.ForeignKey(Dp030, related_name='details_dp034', on_delete=models.CASCADE, db_column='dp030gkey')
    serialno = models.IntegerField(db_column='serialno')
    logo = models.CharField(max_length=200, null=True, blank=True, db_column='logo')
    logosketch = models.CharField(max_length=100, null=True, blank=True, db_column='logosketch')

    class Meta:
        db_table = 'dp034'
        ordering = ['serialno']


class Dp035(models.Model):
    """樣品單大底修改履歷 dp035"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    dp030gkey = models.ForeignKey(Dp030, related_name='details_dp035', on_delete=models.CASCADE, db_column='dp030gkey')
    serialno = models.IntegerField(db_column='serialno')
    bottom = models.CharField(max_length=200, null=True, blank=True, db_column='bottom')
    bottomsketch = models.CharField(max_length=100, null=True, blank=True, db_column='bottomsketch')

    class Meta:
        db_table = 'dp035'
        ordering = ['serialno']


class Dp104(models.Model):
    """樣品單進度項目追蹤 dp104"""
    gkey = models.CharField(primary_key=True, max_length=40, default=generate_pb_gkey, db_column='gkey')
    dp030gkey = models.ForeignKey(Dp030, related_name='details_dp104', on_delete=models.CASCADE, db_column='dp030gkey')
    serialno = models.IntegerField(db_column='serialno')
    itemno = models.CharField(max_length=20, null=True, blank=True, db_column='itemno')
    itemname = models.CharField(max_length=20, null=True, blank=True, db_column='itemname')
    dp102gkey = models.CharField(max_length=40, null=True, blank=True, db_column='dp102gkey')
    status = models.CharField(max_length=2, default='A', db_column='status') # Y/N/A
    remark = models.CharField(max_length=400, null=True, blank=True, db_column='remark')
    es101gkey = models.ForeignKey('Es101', on_delete=models.PROTECT, null=True, blank=True, db_column='es101gkey')

    class Meta:
        db_table = 'dp104'
        ordering = ['serialno', 'itemno']


class Dp040(models.Model):
    """樣品出貨單主檔 dp040"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    invoiceno = models.CharField(max_length=20, db_column='invoiceno')
    sentdate = models.DateTimeField(null=True, blank=True, db_column='sentdate')
    year = models.CharField(max_length=4, null=True, blank=True, db_column='year')
    ba055gkey = models.ForeignKey('Ba055', on_delete=models.PROTECT, null=True, blank=True, db_column='dp040_ba055gkey')
    ba010gkey = models.ForeignKey('Ba010', on_delete=models.PROTECT, null=True, blank=True, db_column='ba010gkey')
    address = models.CharField(max_length=250, null=True, blank=True, db_column='address')
    tel = models.CharField(max_length=40, null=True, blank=True, db_column='tel')
    fax = models.CharField(max_length=40, null=True, blank=True, db_column='fax')
    attention = models.CharField(max_length=300, null=True, blank=True, db_column='attention')
    shipto = models.CharField(max_length=50, null=True, blank=True, db_column='shipto')
    shipfrom = models.CharField(max_length=50, null=True, blank=True, db_column='shipfrom')
    ba005gkey = models.ForeignKey('Ba005', on_delete=models.PROTECT, null=True, blank=True, db_column='ba005gkey')
    awbno = models.CharField(max_length=50, null=True, blank=True, db_column='awbno')
    es101gkey = models.ForeignKey('Es101', related_name='dp040_maker', on_delete=models.PROTECT, null=True, blank=True, db_column='es101gkey')
    remark = models.TextField(null=True, blank=True, db_column='remark')
    amount = models.DecimalField(max_digits=18, decimal_places=4, default=0, db_column='amount')
    engcustname = models.CharField(max_length=60, null=True, blank=True, db_column='engcustname')
    modifydate = models.DateTimeField(auto_now=True, null=True, db_column='modifydate')
    courier = models.CharField(max_length=20, null=True, blank=True, db_column='courier')
    accountno = models.CharField(max_length=20, null=True, blank=True, db_column='accountno')
    carton = models.IntegerField(default=0, db_column='carton')
    ba060gkey = models.ForeignKey('Ba060', on_delete=models.PROTECT, null=True, blank=True, db_column='dp040_ba060gkey')
    ba075gkey = models.ForeignKey('Ba075', on_delete=models.PROTECT, null=True, blank=True, db_column='dp040_ba075gkey')
    revise = models.CharField(max_length=2, null=True, blank=True, db_column='revise')
    revisedate = models.DateTimeField(null=True, blank=True, db_column='revisedate')
    invoiceof = models.CharField(max_length=150, null=True, blank=True, db_column='invoiceof')
    regards = models.CharField(max_length=250, null=True, blank=True, db_column='regards')
    aes101gkey = models.ForeignKey('Es101', related_name='dp040_approver', on_delete=models.PROTECT, null=True, blank=True, db_column='dp040_aes101gkey')
    approve = models.CharField(max_length=1, default='N', db_column='approve')
    saytotal = models.CharField(max_length=100, null=True, blank=True, db_column='saytotal')
    printsigner = models.CharField(max_length=1, default='N', db_column='printsigner')
    ses101gkey = models.ForeignKey('Es101', related_name='dp040_signer', on_delete=models.PROTECT, null=True, blank=True, db_column='dp040_ses101gkey')
    freight = models.CharField(max_length=120, null=True, blank=True, db_column='freight')
    freightcost = models.DecimalField(max_digits=18, decimal_places=4, default=0, db_column='freightcost')
    banking = models.TextField(null=True, blank=True, db_column='banking')

    class Meta:
        db_table = 'dp040'
        ordering = ['-sentdate', 'invoiceno']


class Dp041(models.Model):
    """樣品出貨明細 dp041"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    dp040gkey = models.ForeignKey(Dp040, related_name='details_dp041', on_delete=models.CASCADE, db_column='dp040gkey')
    dp033gkey = models.ForeignKey('Dp033', related_name='shipments', on_delete=models.PROTECT, null=True, blank=True, db_column='dp041_dp033gkey')
    dp002gkey = models.ForeignKey('Dp002', on_delete=models.PROTECT, null=True, blank=True, db_column='dp041_dp002gkey')
    styleno = models.CharField(max_length=60, null=True, blank=True, db_column='styleno')
    stylename = models.CharField(max_length=60, null=True, blank=True, db_column='stylename')
    stock = models.CharField(max_length=60, null=True, blank=True, db_column='stock')
    color = models.CharField(max_length=150, null=True, blank=True, db_column='color')
    description = models.CharField(max_length=250, null=True, blank=True, db_column='description')
    material = models.CharField(max_length=800, null=True, blank=True, db_column='material')
    size = models.CharField(max_length=10, null=True, blank=True, db_column='size')
    sentpairs = models.DecimalField(max_digits=18, decimal_places=2, default=0, db_column='sentpairs')
    unit = models.CharField(max_length=10, default='PRS', db_column='unit')
    price = models.DecimalField(max_digits=18, decimal_places=4, default=0, db_column='price')
    amount = models.DecimalField(max_digits=18, decimal_places=4, default=0, db_column='amount')
    charge = models.CharField(max_length=10, default='2', db_column='charge') # 1/2/3
    consignee = models.CharField(max_length=30, null=True, blank=True, db_column='consignee')
    photopath = models.CharField(max_length=400, null=True, blank=True, db_column='photopath')
    remark = models.CharField(max_length=250, null=True, blank=True, db_column='remark')
    dprefno = models.CharField(max_length=60, null=True, blank=True, db_column='dprefno')
    devorderno = models.CharField(max_length=60, null=True, blank=True, db_column='devorderno')
    serialno = models.IntegerField(db_column='serialno')

    class Meta:
        db_table = 'dp041'
        ordering = ['serialno']


class Dp042(models.Model):
    """樣品出貨毛重與淨重規格 dp042"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    dp040gkey = models.ForeignKey(Dp040, related_name='details_dp042', on_delete=models.CASCADE, db_column='dp040gkey')
    carton = models.CharField(max_length=20, db_column='carton')
    grossweight = models.DecimalField(max_digits=12, decimal_places=4, default=0, db_column='grossweight')
    netweight = models.DecimalField(max_digits=12, decimal_places=4, default=0, db_column='netweight')
    unit = models.CharField(max_length=10, null=True, blank=True, db_column='unit')

    class Meta:
        db_table = 'dp042'
        ordering = ['carton']


class Dp043(models.Model):
    """樣品出貨裝箱細表 dp043"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    dp040gkey = models.ForeignKey(Dp040, related_name='details_dp043', on_delete=models.CASCADE, db_column='dp040gkey')
    dp042gkey = models.ForeignKey(Dp042, on_delete=models.SET_NULL, null=True, blank=True, db_column='dp042gkey')
    dp041gkey = models.ForeignKey(Dp041, on_delete=models.SET_NULL, null=True, blank=True, db_column='dp041gkey')
    styleno = models.CharField(max_length=60, null=True, blank=True, db_column='styleno')
    description = models.CharField(max_length=250, null=True, blank=True, db_column='description')
    material = models.CharField(max_length=800, null=True, blank=True, db_column='material')
    size = models.CharField(max_length=10, null=True, blank=True, db_column='size')
    qty = models.DecimalField(max_digits=12, decimal_places=2, default=0, db_column='qty')
    unit = models.CharField(max_length=10, default='PRS', db_column='unit')
    price = models.DecimalField(max_digits=18, decimal_places=4, default=0, db_column='price')
    amount = models.DecimalField(max_digits=18, decimal_places=4, default=0, db_column='amount')
    consignee = models.CharField(max_length=30, null=True, blank=True, db_column='consignee')
    remark = models.CharField(max_length=250, null=True, blank=True, db_column='remark')
    ctnsize = models.CharField(max_length=50, null=True, blank=True, db_column='ctnsize')

    class Meta:
        db_table = 'dp043'
        ordering = ['styleno', 'size']


class Dp080(models.Model):
    """樣品試版評語與確認主檔 dp080"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    dp030gkey = models.ForeignKey(Dp030, on_delete=models.CASCADE, null=True, blank=True, db_column='dp030gkey')
    styleno = models.CharField(max_length=60, null=True, blank=True, db_column='styleno')
    pono = models.CharField(max_length=20, null=True, blank=True, db_column='pono')
    sampleno = models.CharField(max_length=20, null=True, blank=True, db_column='sampleno')
    serialno = models.IntegerField(default=1, db_column='serialno')
    opiniontype = models.CharField(max_length=1, default='F', db_column='opiniontype') # F=Fitting, C=CFM
    issuedate = models.DateTimeField(null=True, blank=True, db_column='issuedate')
    ba010gkey = models.ForeignKey('Ba010', on_delete=models.PROTECT, null=True, blank=True, db_column='ba010gkey')
    ba015gkey = models.ForeignKey('Ba015', on_delete=models.PROTECT, null=True, blank=True, db_column='ba015gkey')
    dp010gkey = models.ForeignKey('Dp010', on_delete=models.PROTECT, null=True, blank=True, db_column='dp010gkey')
    dp015gkey = models.ForeignKey('Dp015', on_delete=models.PROTECT, null=True, blank=True, db_column='dp015gkey')
    dp020gkey = models.ForeignKey('Dp020', on_delete=models.PROTECT, null=True, blank=True, db_column='dp020gkey')
    othercomment = models.CharField(max_length=250, null=True, blank=True, db_column='othercomment')
    remark = models.TextField(null=True, blank=True, db_column='remark')
    conclusion = models.TextField(null=True, blank=True, db_column='conclusion')
    photopath = models.CharField(max_length=200, null=True, blank=True, db_column='photopath')

    class Meta:
        db_table = 'dp080'
        ordering = ['styleno', 'serialno']


class Dp081(models.Model):
    """樣品評語意見改良細表 dp081"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    dp080gkey = models.ForeignKey(Dp080, related_name='opinions', on_delete=models.CASCADE, db_column='dp080gkey')
    partsno = models.IntegerField(default=1, db_column='partsno')
    parts = models.CharField(max_length=100, null=True, blank=True, db_column='parts')
    partscomment = models.TextField(null=True, blank=True, db_column='partscomment')
    partscheck = models.CharField(max_length=10, null=True, blank=True, db_column='partscheck') # OK, NG, Modify

    class Meta:
        db_table = 'dp081'
        ordering = ['partsno']


class Dp082(models.Model):
    """樣品評語物理量測數據細表 dp082"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    dp080gkey = models.ForeignKey(Dp080, related_name='measurements', on_delete=models.CASCADE, db_column='dp080gkey')
    serialno = models.IntegerField(default=1, db_column='serialno')
    size = models.CharField(max_length=10, null=True, blank=True, db_column='size')
    std_val = models.DecimalField(max_digits=8, decimal_places=2, default=0, db_column='std_val')
    act_val = models.DecimalField(max_digits=8, decimal_places=2, default=0, db_column='act_val')
    diff_val = models.DecimalField(max_digits=8, decimal_places=2, default=0, db_column='diff_val')
    measurement_type = models.CharField(max_length=50, null=True, blank=True, db_column='measurement_type')

    class Meta:
        db_table = 'dp082'
        ordering = ['serialno']


class Dp100(models.Model):
    """開發費用轉嫁單主檔 dp100"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    refno = models.CharField(max_length=20, db_column='refno', unique=True)
    issuedate = models.DateTimeField(null=True, blank=True, db_column='issuedate')
    year = models.CharField(max_length=4, null=True, blank=True, db_column='year')
    
    # Relational targets
    ba015gkey = models.ForeignKey('Ba015', on_delete=models.PROTECT, null=True, blank=True, db_column='ba015gkey') # Charging factory
    ba010gkey = models.ForeignKey('Ba010', on_delete=models.PROTECT, null=True, blank=True, db_column='ba010gkey') # Customer
    dp023gkey = models.ForeignKey('Dp023', on_delete=models.PROTECT, null=True, blank=True, db_column='dp023gkey') # Group
    dp010gkey = models.ForeignKey('Dp010', on_delete=models.PROTECT, null=True, blank=True, db_column='dp010gkey') # Last
    dp015gkey = models.ForeignKey('Dp015', on_delete=models.PROTECT, null=True, blank=True, db_column='dp015gkey') # Bottom
    dp020gkey = models.ForeignKey('Dp020', on_delete=models.PROTECT, null=True, blank=True, db_column='dp020gkey') # Heel
    dp030gkey = models.ForeignKey('Dp030', on_delete=models.PROTECT, null=True, blank=True, db_column='dp030gkey') # Target Sample BOM
    
    amount = models.DecimalField(max_digits=18, decimal_places=4, default=0, db_column='amount')
    ba060gkey = models.ForeignKey('Ba060', on_delete=models.PROTECT, null=True, blank=True, db_column='ba060gkey') # Currency
    remark = models.TextField(null=True, blank=True, db_column='remark')
    styleno = models.CharField(max_length=60, null=True, blank=True, db_column='styleno')
    
    approve = models.CharField(max_length=1, default='N', db_column='approve')
    aes101gkey = models.ForeignKey('Es101', on_delete=models.PROTECT, null=True, blank=True, db_column='aes101gkey')

    class Meta:
        db_table = 'dp100'
        ordering = ['refno']


class Dp101(models.Model):
    """開發費用轉嫁部位明細 dp101"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    dp100gkey = models.ForeignKey(Dp100, related_name='details', on_delete=models.CASCADE, db_column='dp100gkey')
    partname = models.CharField(max_length=100, null=True, blank=True, db_column='partname')
    qty = models.DecimalField(max_digits=12, decimal_places=2, default=0, db_column='qty')
    ba060gkey = models.ForeignKey('Ba060', on_delete=models.PROTECT, null=True, blank=True, db_column='ba060gkey')
    price = models.DecimalField(max_digits=18, decimal_places=4, default=0, db_column='price')
    amount = models.DecimalField(max_digits=18, decimal_places=4, default=0, db_column='amount')
    remark = models.CharField(max_length=200, null=True, blank=True, db_column='remark')

    class Meta:
        db_table = 'dp101'
        ordering = ['gkey']


class Phrase(models.Model):
    """資材片語字庫檔 phrase"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    serialno = models.DecimalField(max_digits=10, decimal_places=0, db_column='serialno')
    es101gkey = models.CharField(max_length=20, db_column='es101gkey', blank=True, null=True)
    description = models.TextField(db_column='description')
    f2type = models.CharField(max_length=5, default='MR', db_column='f2type')

    class Meta:
        managed = False
        db_table = 'phrase'
        ordering = ['serialno']


class Mr002(models.Model):
    """顏色大類設定 mr002"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    serialno = models.DecimalField(max_digits=10, decimal_places=0, db_column='serialno')
    kind = models.CharField(max_length=1, db_column='kind')
    code = models.CharField(max_length=8, db_column='code')
    cname = models.CharField(max_length=20, db_column='cname')

    class Meta:
        managed = False
        db_table = 'mr002'
        ordering = ['kind', 'code']


class Mr020(models.Model):
    """材料厚度設定 mr020"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    serialno = models.DecimalField(max_digits=10, decimal_places=0, db_column='serialno')
    depthno = models.CharField(max_length=20, db_column='depthno')
    depth = models.CharField(max_length=30, db_column='depth')
    unit = models.CharField(max_length=15, db_column='unit')

    class Meta:
        managed = False
        db_table = 'mr020'
        ordering = ['depthno']


class Mr025(models.Model):
    """材料幅度設定 mr025"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    serialno = models.DecimalField(max_digits=10, decimal_places=0, db_column='serialno')
    breadthno = models.CharField(max_length=20, db_column='breadthno')
    breadth = models.CharField(max_length=30, db_column='breadth')
    unit = models.CharField(max_length=15, db_column='unit')

    class Meta:
        managed = False
        db_table = 'mr025'
        ordering = ['breadthno']


class Mr031(models.Model):
    """加工方式設定 mr031"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    serialno = models.DecimalField(max_digits=10, decimal_places=0, db_column='serialno')
    makeno = models.CharField(max_length=20, db_column='makeno')
    makedescription = models.CharField(max_length=200, db_column='makedescription')

    class Meta:
        managed = False
        db_table = 'mr031'
        ordering = ['makeno']


class Mr015(models.Model):
    """材料大類設定 mr015"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    serialno = models.DecimalField(max_digits=10, decimal_places=0, db_column='serialno')
    matno = models.CharField(max_length=20, db_column='matno')
    cname = models.CharField(max_length=60, null=True, blank=True, db_column='cname')
    ename = models.CharField(max_length=60, null=True, blank=True, db_column='ename')

    class Meta:
        managed = True   # We created this table ourselves
        db_table = 'mr015'
        ordering = ['matno']


class Mr016(models.Model):
    """材料小類設定 mr016"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    serialno = models.DecimalField(max_digits=10, decimal_places=0, db_column='serialno')
    mr015gkey = models.ForeignKey(Mr015, on_delete=models.CASCADE, related_name='details_mr016', db_column='mr015gkey')
    smatno = models.CharField(max_length=20, db_column='smatno')
    cname = models.CharField(max_length=60, null=True, blank=True, db_column='cname')
    ename = models.CharField(max_length=60, null=True, blank=True, db_column='ename')

    class Meta:
        managed = True   # We created this table ourselves
        db_table = 'mr016'
        ordering = ['smatno']


class Mr030(models.Model):
    """材料紋路設定 mr030"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    serialno = models.DecimalField(max_digits=10, decimal_places=0, db_column='serialno')
    veinno = models.CharField(max_length=20, db_column='veinno')
    cname = models.CharField(max_length=60, null=True, blank=True, db_column='cname')
    ename = models.CharField(max_length=60, null=True, blank=True, db_column='ename')
    veinphoto = models.CharField(max_length=400, null=True, blank=True, db_column='veinphoto')

    class Meta:
        managed = True   # We created this table ourselves
        db_table = 'mr030'
        ordering = ['veinno']


class SysMenu(models.Model):
    prg_code = models.CharField(primary_key=True, max_length=20, db_column='prg_code')
    obj_name = models.CharField(max_length=40, db_column='obj_name', blank=True, null=True)
    prg_name = models.CharField(max_length=40, db_column='prg_name', blank=True, null=True)
    parent_code = models.CharField(max_length=10, db_column='parent_code', blank=True, null=True)
    fram_class = models.CharField(max_length=1, db_column='fram_class', blank=True, null=True)
    prg_serialno = models.DecimalField(max_digits=10, decimal_places=2, db_column='prg_serialno', blank=True, null=True)
    sysflag = models.CharField(max_length=1, db_column='sysflag', blank=True, null=True)
    chinesebigname = models.CharField(max_length=40, db_column='chinesebigname', blank=True, null=True)
    chinesesimpname = models.CharField(max_length=40, db_column='chinesesimpname', blank=True, null=True)
    englishname = models.CharField(max_length=100, db_column='englishname', blank=True, null=True)
    vietnamname = models.CharField(max_length=40, db_column='vietnamname', blank=True, null=True)
    initflag = models.CharField(max_length=1, db_column='initflag', blank=True, null=True)
    startqty = models.CharField(max_length=4, db_column='startqty', blank=True, null=True)
    endqty = models.CharField(max_length=4, db_column='endqty', blank=True, null=True)
    yearly = models.CharField(max_length=4, db_column='yearly', blank=True, null=True)
    season = models.CharField(max_length=20, db_column='season', blank=True, null=True)
    pictype = models.CharField(max_length=1, db_column='pictype', blank=True, null=True)
    makerdf = models.CharField(max_length=1, db_column='makerdf', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'sys_menu'


class SysPopedom(models.Model):
    obj_name = models.CharField(primary_key=True, max_length=40, db_column='obj_name')
    accounts_id = models.CharField(max_length=50, db_column='accounts_id')
    prg_popedom = models.CharField(max_length=20, db_column='prg_popedom')
    flag = models.CharField(max_length=10, db_column='flag')
    hisystem = models.CharField(max_length=10, db_column='hisystem')

    class Meta:
        managed = False
        db_table = 'sys_popedom'
        unique_together = (('accounts_id', 'obj_name', 'flag', 'hisystem'),)


class SysPopedomDesc(models.Model):
    popedom_id = models.CharField(primary_key=True, max_length=30, db_column='popedom_id')
    hisystem = models.CharField(max_length=10, db_column='hisystem')
    obj_name = models.CharField(max_length=40, db_column='obj_name')
    popedom_desc = models.CharField(max_length=20, db_column='popedom_desc')
    popedom_index = models.IntegerField(db_column='popedom_index')

    class Meta:
        managed = False
        db_table = 'sys_popedom_desc'
        unique_together = (('hisystem', 'obj_name', 'popedom_id'),)


class SysMenuColumn(models.Model):
    """系統欄位翻譯表 sys_menu_column"""
    hisystem = models.CharField(max_length=10, db_column='hisystem')
    obj_name = models.CharField(max_length=40, db_column='obj_name')
    db_name = models.CharField(primary_key=True, max_length=50, db_column='db_name')
    display_name = models.CharField(max_length=40, db_column='display_name', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'sys_menu_column'
        unique_together = (('hisystem', 'obj_name', 'db_name'),)


class SysAccountsActive(models.Model):
    gkey = models.CharField(primary_key=True, max_length=20, db_column='gkey')
    hisystem = models.CharField(max_length=10, db_column='hisystem')
    accounts_id = models.CharField(max_length=50, db_column='accounts_id')
    logintime = models.DateTimeField(db_column='logintime')
    computername = models.CharField(max_length=50, db_column='computername')
    loginip = models.CharField(max_length=50, db_column='loginip')
    spid = models.IntegerField(db_column='spid')
    win_login = models.CharField(max_length=50, db_column='win_login')

    class Meta:
        managed = False
        db_table = 'sys_accounts_active'


class SysPopedomGroup(models.Model):
    hisystem = models.CharField(max_length=10, db_column='hisystem')
    group_code = models.CharField(primary_key=True, max_length=20, db_column='group_code')
    group_name = models.CharField(max_length=20, db_column='group_name')

    class Meta:
        managed = False
        db_table = 'sys_popedom_group'
        unique_together = (('hisystem', 'group_code'),)


class SysAccountsGroup(models.Model):
    hisystem = models.CharField(max_length=10, db_column='hisystem')
    accounts_id = models.CharField(max_length=50, db_column='accounts_id')
    group_code = models.CharField(primary_key=True, max_length=20, db_column='group_code')

    class Meta:
        managed = False
        db_table = 'sys_accounts_group'
        unique_together = (('hisystem', 'accounts_id', 'group_code'),)




import sys
TESTING = len(sys.argv) > 1 and sys.argv[1] == 'test'

class Mr035(models.Model):
    """料號主檔 mr035 (唯讀/非託管，用於防呆引用檢查)"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    mstkno = models.CharField(max_length=60, unique=True, db_column='mstkno')
    mname = models.CharField(max_length=100, null=True, blank=True, db_column='mname')
    mr015gkey = models.CharField(max_length=20, null=True, blank=True, db_column='mr015gkey')
    mr016gkey = models.CharField(max_length=20, null=True, blank=True, db_column='mr016gkey')
    mr030gkey = models.CharField(max_length=20, null=True, blank=True, db_column='mr030gkey')

    class Meta:
        managed = TESTING
        db_table = 'mr035'


# ============================================================================
# 💼 業務部門管理系統 (Sales Administration - SA) Models
# ============================================================================

# sa001 業務片語字庫 使用 ba001 表（以 f2type='SA' 區分）
# 此處不新增獨立 Model，直接在 ViewSet 層以 filter(f2type='SA') 實作。


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


class SysParameter(models.Model):
    """
    系統參數設定 sys_parameter
    """
    gkey = models.CharField(
        primary_key=True,
        max_length=20,
        default=generate_pb_gkey,
        db_column='gkey',
        help_text='唯一物理主鍵'
    )
    hisystem = models.CharField(
        max_length=10,
        default='00',
        db_column='hisystem',
        help_text='系統歸屬'
    )
    parameterid = models.CharField(
        max_length=30,
        db_column='parameterid',
        help_text='變數代號'
    )
    serialno = models.IntegerField(
        blank=True,
        null=True,
        db_column='serialno',
        help_text='排序序號'
    )
    parametervalue = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        db_column='parametervalue',
        help_text='參數值'
    )
    description = models.CharField(
        max_length=250,
        blank=True,
        null=True,
        db_column='description',
        help_text='說明敘述'
    )
    visitctrl = models.CharField(
        max_length=1,
        default='9',
        db_column='visitctrl',
        help_text='訪問限制等級'
    )
    specialctrl = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        db_column='specialctrl',
        help_text='特殊控制碼'
    )
    istype = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        db_column='istype',
        help_text='參數類別/模組屬性'
    )

    class Meta:
        managed = True
        db_table = 'sys_parameter'
        ordering = ['serialno', 'hisystem', 'parameterid']
        unique_together = (('hisystem', 'parameterid'),)
        verbose_name = '系統參數'

    def __str__(self):
        return f"[{self.hisystem} - {self.parameterid}] {self.parametervalue}"



