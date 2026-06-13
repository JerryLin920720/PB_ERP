from django.db import models, transaction
from api.modules.common.models import generate_pb_gkey

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
        app_label = 'api'
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
        app_label = 'api'
        db_table = 'ba002'
        ordering = ['serialno']
        verbose_name = '國家基本資料'

    def __str__(self):
        return f"{self.ccountry} ({self.ecountry})"

class Ba045(models.Model):
    """部門設定檔 ba045"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    serialno = models.DecimalField(max_digits=10, decimal_places=0, db_column='serialno')
    department = models.CharField(max_length=50, unique=True, db_column='department')

    class Meta:
        app_label = 'api'
        db_table = 'ba045'
        ordering = ['serialno']
        verbose_name = '部門設定'

    def __str__(self):
        return self.department

class Ba003(models.Model):
    """
    產地基本資料檔 ba003
    """
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    serialno = models.DecimalField(max_digits=10, decimal_places=0, db_column='serialno')
    corigin = models.CharField(max_length=50, unique=True, db_column='corigin')
    eorigin = models.CharField(max_length=50, unique=True, db_column='eorigin')

    class Meta:
        app_label = 'api'
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
        app_label = 'api'
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
        app_label = 'api'
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
        app_label = 'api'
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
        app_label = 'api'
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
        app_label = 'api'
        db_table = 'ba040'
        ordering = ['bankno']
        verbose_name = '銀行基本資料'

    def __str__(self):
        return self.shortname






class Ba050(models.Model):
    """職務設定檔 ba050 (注意：原廠欄位拼寫為 jobpositon，少了一個 i)"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    serialno = models.DecimalField(max_digits=10, decimal_places=0, db_column='serialno')
    jobpositon = models.CharField(max_length=50, unique=True, db_column='jobpositon')

    class Meta:
        app_label = 'api'
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
        app_label = 'api'
        db_table = 'ba055'
        ordering = ['serialno']
        verbose_name = '季節設定'

    def __str__(self):
        return f"{self.groupcode} ({self.groupname or ''})"



class Ba065(models.Model):
    """交易港口基本檔 ba065"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    serialno = models.DecimalField(max_digits=10, decimal_places=0, db_column='serialno')
    term = models.CharField(max_length=50, unique=True, db_column='term')

    class Meta:
        app_label = 'api'
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
        app_label = 'api'
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
        app_label = 'api'
        db_table = 'ba075'
        ordering = ['serialno']
        verbose_name = '付款條件大類'

    def __str__(self):
        return self.paymenttype



class Ba080(models.Model):
    """配件設定檔 ba080 — 對應 w_ba080 (鞋材配件類型字典)"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    serialno = models.DecimalField(max_digits=10, decimal_places=0, db_column='serialno')
    accessory = models.CharField(max_length=50, unique=True, db_column='accessory')
    description = models.CharField(max_length=100, blank=True, null=True, db_column='description')

    class Meta:
        app_label = 'api'
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
        app_label = 'api'
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
        app_label = 'api'
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
        app_label = 'api'
        db_table = 'ba092'
        ordering = ['serialno']
        verbose_name = '單位設定'

    def __str__(self):
        return self.express



class Ba076(models.Model):
    """付款條件明細檔 ba076 (外鍵關聯 ba075)"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    ba075gkey = models.ForeignKey('Ba075', on_delete=models.CASCADE, db_column='ba075gkey', to_field='gkey')
    payment = models.CharField(max_length=100, unique=True, db_column='payment')
    days = models.DecimalField(max_digits=10, decimal_places=0, blank=True, null=True, db_column='days')

    class Meta:
        app_label = 'api'
        db_table = 'ba076'
        verbose_name = '付款條件明細'

    def __str__(self):
        return self.payment







class Ab230(models.Model):
    """財務交叉匯率主檔 ab230"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    serialno = models.DecimalField(max_digits=10, decimal_places=0, db_column='serialno')
    ba060gkey1 = models.ForeignKey('Ba060', related_name='base_pair', on_delete=models.CASCADE, db_column='ba060gkey1')
    ba060gkey2 = models.ForeignKey('Ba060', related_name='target_pair', on_delete=models.CASCADE, db_column='ba060gkey2')
    exrate = models.DecimalField(max_digits=16, decimal_places=8, blank=True, null=True, db_column='exrate')

    class Meta:
        app_label = 'api'
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
                current_max = Ab230.objects.aggregate(max('serialno'))['serialno__max'] or 0
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
    ab230gkey = models.ForeignKey('Ab230', on_delete=models.CASCADE, db_column='ab230gkey')
    serialno = models.DecimalField(max_digits=10, decimal_places=0, db_column='serialno')
    exrate = models.DecimalField(max_digits=16, decimal_places=8, db_column='exrate')
    effectivedate = models.DateTimeField(db_column='effectivedate')
    chk = models.CharField(max_length=1, default='N', db_column='chk')

    class Meta:
        app_label = 'api'
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
                    current_max = Ab231.objects.filter(ab230gkey=mirror_parent).aggregate(max('serialno'))['serialno__max'] or 0
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







class Ba011(models.Model):
    """客戶品牌關聯檔 ba011"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    ba010gkey = models.ForeignKey('Ba010', on_delete=models.CASCADE, related_name='brands', db_column='ba010gkey')
    ba009gkey = models.ForeignKey('Ba009', on_delete=models.CASCADE, db_column='ba009gkey')

    class Meta:
        app_label = 'api'
        db_table = 'ba011'
        verbose_name = '客戶經營品牌'



class Ba012(models.Model):
    """客戶 QC 驗貨官明細檔 ba012"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    ba010gkey = models.ForeignKey('Ba010', on_delete=models.CASCADE, related_name='qcs', db_column='ba010gkey')
    es101gkey = models.CharField(max_length=20, blank=True, null=True, db_column='es101gkey')
    qccontact = models.CharField(max_length=20, db_column='qccontact')
    tel = models.CharField(max_length=40, blank=True, null=True, db_column='tel')
    fax = models.CharField(max_length=40, blank=True, null=True, db_column='fax')
    mobilephone = models.CharField(max_length=40, blank=True, null=True, db_column='mobilephone')
    email = models.CharField(max_length=50, blank=True, null=True, db_column='email')

    class Meta:
        app_label = 'api'
        db_table = 'ba012'
        verbose_name = '客戶QC驗貨官'



class Ba013(models.Model):
    """客戶提供配件明細檔 ba013"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    ba010gkey = models.ForeignKey('Ba010', on_delete=models.CASCADE, related_name='accessories', db_column='ba010gkey')
    ba080gkey = models.ForeignKey('Ba080', on_delete=models.CASCADE, db_column='ba080gkey')
    serialno = models.DecimalField(max_digits=10, decimal_places=0, db_column='serialno')
    description = models.CharField(max_length=100, blank=True, null=True, db_column='description')
    unit = models.CharField(max_length=40, blank=True, null=True, db_column='unit')
    pairs = models.DecimalField(max_digits=10, decimal_places=0, blank=True, null=True, db_column='pairs')
    supplytype = models.CharField(max_length=30, blank=True, null=True, db_column='supplytype')

    class Meta:
        app_label = 'api'
        db_table = 'ba013'
        ordering = ['serialno']
        verbose_name = '客戶提供配件'



class Ba014(models.Model):
    """客戶業務聯絡人明細檔 ba014"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    ba010gkey = models.ForeignKey('Ba010', on_delete=models.CASCADE, related_name='contacts', db_column='ba010gkey')
    contact = models.CharField(max_length=30, db_column='contact')
    department = models.CharField(max_length=30, blank=True, null=True, db_column='department')
    jobposition = models.CharField(max_length=30, blank=True, null=True, db_column='jobposition')
    tel = models.CharField(max_length=40, blank=True, null=True, db_column='tel')
    fax = models.CharField(max_length=40, blank=True, null=True, db_column='fax')
    mobilephone = models.CharField(max_length=40, blank=True, null=True, db_column='mobilephone')
    email = models.CharField(max_length=50, blank=True, null=True, db_column='email')

    class Meta:
        app_label = 'api'
        db_table = 'ba014'
        verbose_name = '客戶聯絡窗口'



class Ba016(models.Model):
    """統一外部聯絡人明細子表 ba016"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    ba015gkey = models.ForeignKey('Ba015', on_delete=models.CASCADE, related_name='contacts', db_column='ba015gkey')
    contact = models.CharField(max_length=30, db_column='contact')
    department = models.CharField(max_length=30, blank=True, null=True, db_column='department')
    jobposition = models.CharField(max_length=30, blank=True, null=True, db_column='jobposition')
    tel = models.CharField(max_length=40, blank=True, null=True, db_column='tel')
    fax = models.CharField(max_length=40, blank=True, null=True, db_column='fax')
    mobilephone = models.CharField(max_length=40, blank=True, null=True, db_column='mobilephone')
    email = models.CharField(max_length=50, blank=True, null=True, db_column='email')
    parentgkey = models.ForeignKey('Ba015', blank=True, null=True, on_delete=models.SET_NULL, db_column='parentgkey', related_name='sub_contacts')

    class Meta:
        app_label = 'api'
        db_table = 'ba016'
        verbose_name = '外部聯絡人'



class Ba060(models.Model):
    """全域幣別主檔 ba060"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    serialno = models.DecimalField(max_digits=10, decimal_places=0, db_column='serialno')
    currencyno = models.CharField(max_length=10, unique=True, db_column='currencyno')
    currency = models.CharField(max_length=20, db_column='currency')
    exrate = models.DecimalField(max_digits=16, decimal_places=4, blank=True, null=True, db_column='exrate')

    class Meta:
        app_label = 'api'
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
        app_label = 'api'
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
        app_label = 'api'
        db_table = 'ba015'
        ordering = ['factno']
        verbose_name = '供應鏈實體'

    def __str__(self):
        return f"[{self.factno}] {self.shortname}"




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
        app_label = 'api'
        db_table = 'ba010'
        ordering = ['custno']
        verbose_name = '客戶主檔'

    def __str__(self):
        return f"[{self.custno}] {self.shortname}"






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
        app_label = 'api'
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


