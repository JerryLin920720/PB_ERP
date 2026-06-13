from api.modules.common.models import generate_pb_gkey
from api.modules.common.models import generate_pb_gkey
from django.db import models

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
        app_label = 'api'
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
        app_label = 'api'
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
        app_label = 'api'
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
        app_label = 'api'
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
        app_label = 'api'
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
        app_label = 'api'
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
        app_label = 'api'
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
        app_label = 'api'
        db_table = 'dp012'
        ordering = ['serialno']



class Dp013(models.Model):
    """楦頭修改紀錄 dp013"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    dp010gkey = models.ForeignKey(Dp010, on_delete=models.CASCADE, related_name='histories', db_column='dp010gkey')
    modifydate = models.DateTimeField(db_column='modifydate', auto_now_add=True)
    description = models.TextField(db_column='Description', null=True, blank=True)

    class Meta:
        app_label = 'api'
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
        app_label = 'api'
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
        app_label = 'api'
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
        app_label = 'api'
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
        app_label = 'api'
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
        app_label = 'api'
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
        app_label = 'api'
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
        app_label = 'api'
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
        app_label = 'api'
        db_table = 'dp031'
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
        app_label = 'api'
        db_table = 'dp032'
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
        app_label = 'api'
        db_table = 'dp033'
        ordering = ['serialno']



class Dp034(models.Model):
    """樣品單商標加工 dp034"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    dp030gkey = models.ForeignKey(Dp030, related_name='details_dp034', on_delete=models.CASCADE, db_column='dp030gkey')
    serialno = models.IntegerField(db_column='serialno')
    logo = models.CharField(max_length=200, null=True, blank=True, db_column='logo')
    logosketch = models.CharField(max_length=100, null=True, blank=True, db_column='logosketch')

    class Meta:
        app_label = 'api'
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
        app_label = 'api'
        db_table = 'dp035'
        ordering = ['serialno']



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
        app_label = 'api'
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
        app_label = 'api'
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
        app_label = 'api'
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
        app_label = 'api'
        db_table = 'dp043'
        ordering = ['styleno', 'size']



class Dp001(models.Model):
    """開發片語字庫 dp001"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    serialno = models.DecimalField(max_digits=10, decimal_places=0, db_column='serialno')
    es101gkey = models.CharField(max_length=20, db_column='es101gkey')
    description = models.TextField(db_column='description')
    f2type = models.CharField(max_length=5, default='DP', db_column='f2type')

    class Meta:
        app_label = 'api'
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
        app_label = 'api'
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
        app_label = 'api'
        db_table = 'dp003'
        ordering = ['shoetype']
        verbose_name = '鞋種類別設定'

    def __str__(self):
        return self.shoetype


class Dp005(models.Model):
    """部位類別設定 dp005"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    serialno = models.DecimalField(max_digits=10, decimal_places=0, db_column='serialno')
    partgroup = models.CharField(max_length=50, db_column='partgroup')
    epartgroup = models.CharField(max_length=50, db_column='epartgroup')
    parttype = models.CharField(max_length=10, blank=True, null=True, db_column='parttype')

    class Meta:
        app_label = 'api'
        db_table = 'dp005'
        ordering = ['serialno']
        verbose_name = '部位類別設定'

    def __str__(self):
        return f"{self.partgroup} ({self.epartgroup})"


class Dp008(models.Model):
    """Sock Label 設定 dp008"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    serialno = models.DecimalField(max_digits=10, decimal_places=0, db_column='serialno')
    socklabel = models.CharField(max_length=100, db_column='socklabel')

    class Meta:
        app_label = 'api'
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
        app_label = 'api'
        db_table = 'dp009'
        ordering = ['serialno']
        verbose_name = '部件加工方式設定'

    def __str__(self):
        return self.cmakedescription


class Dp006(models.Model):
    """部位基本資料 dp006 (指向 dp005)"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    serialno = models.DecimalField(max_digits=10, decimal_places=0, db_column='serialno')
    parts = models.CharField(max_length=50, db_column='parts')
    eparts = models.CharField(max_length=50, db_column='eparts')
    dp005gkey = models.ForeignKey('Dp005', on_delete=models.PROTECT, related_name='parts', db_column='dp005gkey')

    class Meta:
        app_label = 'api'
        db_table = 'dp006'
        ordering = ['serialno']
        verbose_name = '部位基本資料'

    def __str__(self):
        return f"{self.parts} ({self.eparts})"


class Dp007(models.Model):
    """鞋種部位設定 (多對多關聯中間表) dp007"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    dp003gkey = models.ForeignKey('Dp003', on_delete=models.CASCADE, related_name='assigned_parts', db_column='dp003gkey')
    dp006gkey = models.ForeignKey('Dp006', on_delete=models.CASCADE, related_name='assigned_shoe_kinds', db_column='dp006gkey')

    class Meta:
        app_label = 'api'
        db_table = 'dp007'
        unique_together = ('dp003gkey', 'dp006gkey')
        verbose_name = '鞋種部位設定'

    def __str__(self):
        return f"鞋種:{self.dp003gkey.shoetype} -> 部位:{self.dp006gkey.parts}"


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
        app_label = 'api'
        db_table = 'dp004'
        ordering = ['serialno']
        verbose_name = '鞋種性別設定'

    def __str__(self):
        return self.gender


class Dp004A(models.Model):
    """鞋種性別尺碼對照表明細 (Detail) dp004a"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    dp004gkey = models.ForeignKey('Dp004', related_name='sizes', on_delete=models.CASCADE, db_column='dp004gkey')
    serialno = models.DecimalField(max_digits=10, decimal_places=0, db_column='serialno')
    tszus = models.CharField(max_length=10, blank=True, null=True, db_column='tszus')
    tszeu = models.CharField(max_length=10, blank=True, null=True, db_column='tszeu')
    tszuk = models.CharField(max_length=20, blank=True, null=True, db_column='tszuk')
    tszjp = models.CharField(max_length=10, blank=True, null=True, db_column='tszjp')
    tszot = models.CharField(max_length=10, blank=True, null=True, db_column='tszot')

    class Meta:
        app_label = 'api'
        db_table = 'dp004a'
        ordering = ['serialno']


class Dp080(models.Model):
    """樣品試版評語與確認主檔 dp080"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    dp030gkey = models.ForeignKey('Dp030', on_delete=models.CASCADE, null=True, blank=True, db_column='dp030gkey')
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
        app_label = 'api'
        db_table = 'dp080'
        ordering = ['styleno', 'serialno']


class Dp081(models.Model):
    """樣品評語意見改良細表 dp081"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    dp080gkey = models.ForeignKey('Dp080', related_name='opinions', on_delete=models.CASCADE, db_column='dp080gkey')
    partsno = models.IntegerField(default=1, db_column='partsno')
    parts = models.CharField(max_length=100, null=True, blank=True, db_column='parts')
    partscomment = models.TextField(null=True, blank=True, db_column='partscomment')
    partscheck = models.CharField(max_length=10, null=True, blank=True, db_column='partscheck') # OK, NG, Modify

    class Meta:
        app_label = 'api'
        db_table = 'dp081'
        ordering = ['partsno']


class Dp082(models.Model):
    """樣品評語物理量測數據細表 dp082"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    dp080gkey = models.ForeignKey('Dp080', related_name='measurements', on_delete=models.CASCADE, db_column='dp080gkey')
    serialno = models.IntegerField(default=1, db_column='serialno')
    size = models.CharField(max_length=10, null=True, blank=True, db_column='size')
    std_val = models.DecimalField(max_digits=8, decimal_places=2, default=0, db_column='std_val')
    act_val = models.DecimalField(max_digits=8, decimal_places=2, default=0, db_column='act_val')
    diff_val = models.DecimalField(max_digits=8, decimal_places=2, default=0, db_column='diff_val')
    measurement_type = models.CharField(max_length=50, null=True, blank=True, db_column='measurement_type')

    class Meta:
        app_label = 'api'
        db_table = 'dp082'
        ordering = ['serialno']


class Dp104(models.Model):
    """樣品單進度項目追蹤 dp104"""
    gkey = models.CharField(primary_key=True, max_length=40, default=generate_pb_gkey, db_column='gkey')
    dp030gkey = models.ForeignKey('Dp030', related_name='details_dp104', on_delete=models.CASCADE, db_column='dp030gkey')
    serialno = models.IntegerField(db_column='serialno')
    itemno = models.CharField(max_length=20, null=True, blank=True, db_column='itemno')
    itemname = models.CharField(max_length=20, null=True, blank=True, db_column='itemname')
    dp102gkey = models.CharField(max_length=40, null=True, blank=True, db_column='dp102gkey')
    status = models.CharField(max_length=2, default='A', db_column='status') # Y/N/A
    remark = models.CharField(max_length=400, null=True, blank=True, db_column='remark')
    es101gkey = models.ForeignKey('Es101', on_delete=models.PROTECT, null=True, blank=True, db_column='es101gkey')

    class Meta:
        app_label = 'api'
        db_table = 'dp104'
        ordering = ['serialno', 'itemno']


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
        app_label = 'api'
        db_table = 'dp100'
        ordering = ['refno']


class Dp101(models.Model):
    """開發費用轉嫁部位明細 dp101"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    dp100gkey = models.ForeignKey('Dp100', related_name='details', on_delete=models.CASCADE, db_column='dp100gkey')
    partname = models.CharField(max_length=100, null=True, blank=True, db_column='partname')
    qty = models.DecimalField(max_digits=12, decimal_places=2, default=0, db_column='qty')
    ba060gkey = models.ForeignKey('Ba060', on_delete=models.PROTECT, null=True, blank=True, db_column='ba060gkey')
    price = models.DecimalField(max_digits=18, decimal_places=4, default=0, db_column='price')
    amount = models.DecimalField(max_digits=18, decimal_places=4, default=0, db_column='amount')
    remark = models.CharField(max_length=200, null=True, blank=True, db_column='remark')

    class Meta:
        app_label = 'api'
        db_table = 'dp101'
        ordering = ['gkey']


