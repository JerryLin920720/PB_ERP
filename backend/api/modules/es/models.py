from django.db import models
from api.modules.common.models import generate_pb_gkey
from django.conf import settings
TESTING = getattr(settings, 'TESTING', False)

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
        app_label = 'api'
        db_table = 'es101'
        ordering = ['employeeno']
        verbose_name = '員工帳號基本資料'

    def save(self, *args, **kwargs):
        self.employeeno = self.employeeno.upper()
        super().save(*args, **kwargs)
        
        from api.modules.sys.models import SysAccount
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
        from api.modules.sys.models import SysAccount
        # De-provision before hard delete to ensure security
        SysAccount.objects.filter(user_id=self.gkey).update(status_sign='1')
        super().delete(*args, **kwargs)


class Es102(models.Model):
    """員工學歷 es102"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    es101gkey = models.ForeignKey('Es101', on_delete=models.CASCADE, related_name='educations', db_column='es101gkey')
    schoolname = models.CharField(max_length=50, db_column='schoolname')
    daterange = models.CharField(max_length=30, blank=True, null=True, db_column='daterange')
    yearterm = models.DecimalField(max_digits=5, decimal_places=0, blank=True, null=True, db_column='yearterm')
    daynight = models.CharField(max_length=1, blank=True, null=True, db_column='daynight') 
    graduate = models.CharField(max_length=1, blank=True, null=True, db_column='graduate') 

    class Meta:
        app_label = 'api'
        db_table = 'es102'


class Es103(models.Model):
    """員工經歷 es103"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    es101gkey = models.ForeignKey('Es101', on_delete=models.CASCADE, related_name='experiences', db_column='es101gkey')
    companyname = models.CharField(max_length=50, db_column='companyname')
    jobposition = models.CharField(max_length=50, blank=True, null=True, db_column='jobposition')
    daterange = models.CharField(max_length=30, blank=True, null=True, db_column='daterange')
    salary = models.DecimalField(max_digits=12, decimal_places=4, blank=True, null=True, db_column='salary')

    class Meta:
        app_label = 'api'
        db_table = 'es103'


class Es104(models.Model):
    """員工眷屬 es104"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    es101gkey = models.ForeignKey('Es101', on_delete=models.CASCADE, related_name='families', db_column='es101gkey')
    relationship = models.CharField(max_length=50, db_column='relationship')
    familyname = models.CharField(max_length=50, db_column='familyname')
    birthday = models.DateTimeField(blank=True, null=True, db_column='birthday')
    companyname = models.CharField(max_length=30, blank=True, null=True, db_column='companyname')

    class Meta:
        app_label = 'api'
        db_table = 'es104'


