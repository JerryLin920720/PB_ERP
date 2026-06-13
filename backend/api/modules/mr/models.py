from django.conf import settings
TESTING = getattr(settings, 'TESTING', False)
from django.db import models
from api.modules.common.models import generate_pb_gkey

class Mr002(models.Model):
    """顏色大類設定 mr002"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    serialno = models.DecimalField(max_digits=10, decimal_places=0, db_column='serialno')
    kind = models.CharField(max_length=1, db_column='kind')
    code = models.CharField(max_length=8, db_column='code')
    cname = models.CharField(max_length=20, db_column='cname')

    class Meta:
        app_label = 'api'
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
        app_label = 'api'
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
        app_label = 'api'
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
        app_label = 'api'
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
        app_label = 'api'
        managed = True   # We created this table ourselves
        db_table = 'mr015'
        ordering = ['matno']


class Mr016(models.Model):
    """材料小類設定 mr016"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    serialno = models.DecimalField(max_digits=10, decimal_places=0, db_column='serialno')
    mr015gkey = models.ForeignKey('Mr015', on_delete=models.CASCADE, related_name='details_mr016', db_column='mr015gkey')
    smatno = models.CharField(max_length=20, db_column='smatno')
    cname = models.CharField(max_length=60, null=True, blank=True, db_column='cname')
    ename = models.CharField(max_length=60, null=True, blank=True, db_column='ename')

    class Meta:
        app_label = 'api'
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
        app_label = 'api'
        managed = True   # We created this table ourselves
        db_table = 'mr030'
        ordering = ['veinno']


class Mr035(models.Model):
    """料號主檔 mr035 (唯讀/非託管，用於防呆引用檢查)"""
    gkey = models.CharField(primary_key=True, max_length=20, default=generate_pb_gkey, db_column='gkey')
    mstkno = models.CharField(max_length=60, unique=True, db_column='mstkno')
    mname = models.CharField(max_length=100, null=True, blank=True, db_column='mname')
    mr015gkey = models.CharField(max_length=20, null=True, blank=True, db_column='mr015gkey')
    mr016gkey = models.CharField(max_length=20, null=True, blank=True, db_column='mr016gkey')
    mr030gkey = models.CharField(max_length=20, null=True, blank=True, db_column='mr030gkey')

    class Meta:
        app_label = 'api'
        managed = TESTING
        db_table = 'mr035'


