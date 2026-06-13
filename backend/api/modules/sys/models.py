from django.db import models
from api.modules.common.models import generate_pb_gkey
from django.conf import settings
TESTING = getattr(settings, 'TESTING', False)

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
        app_label = 'api'
        managed = False
        db_table = 'sys_accounts'


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
        app_label = 'api'
        managed = False
        db_table = 'sys_menu'


class SysPopedom(models.Model):
    obj_name = models.CharField(primary_key=True, max_length=40, db_column='obj_name')
    accounts_id = models.CharField(max_length=50, db_column='accounts_id')
    prg_popedom = models.CharField(max_length=20, db_column='prg_popedom')
    flag = models.CharField(max_length=10, db_column='flag')
    hisystem = models.CharField(max_length=10, db_column='hisystem')

    class Meta:
        app_label = 'api'
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
        app_label = 'api'
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
        app_label = 'api'
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
        app_label = 'api'
        managed = False
        db_table = 'sys_accounts_active'


class SysPopedomGroup(models.Model):
    hisystem = models.CharField(max_length=10, db_column='hisystem')
    group_code = models.CharField(primary_key=True, max_length=20, db_column='group_code')
    group_name = models.CharField(max_length=20, db_column='group_name')

    class Meta:
        app_label = 'api'
        managed = False
        db_table = 'sys_popedom_group'
        unique_together = (('hisystem', 'group_code'),)


class SysAccountsGroup(models.Model):
    hisystem = models.CharField(max_length=10, db_column='hisystem')
    accounts_id = models.CharField(max_length=50, db_column='accounts_id')
    group_code = models.CharField(primary_key=True, max_length=20, db_column='group_code')

    class Meta:
        app_label = 'api'
        managed = False
        db_table = 'sys_accounts_group'
        unique_together = (('hisystem', 'accounts_id', 'group_code'),)


import sys
TESTING = len(sys.argv) > 1 and sys.argv[1] == 'test'


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
        app_label = 'api'
        managed = True
        db_table = 'sys_parameter'
        ordering = ['serialno', 'hisystem', 'parameterid']
        unique_together = (('hisystem', 'parameterid'),)
        verbose_name = '系統參數'

    def __str__(self):
        return f"[{self.hisystem} - {self.parameterid}] {self.parametervalue}"


# ============================================================================
# Phase 9A-2B: ERP 權限防護核心資料表
# ============================================================================

class SysAccountsColumn(models.Model):
    """欄位級別權限表 sys_accounts_column

    對應 PB DataWindow: d_accounts_column_young.srd
    PB 欄位控制類型：
      - hide:     後端 response 不回傳該欄位，request 若送出則 400 ValidationError
      - readonly: 後端 response 可回傳，request 若企圖修改則 400 ValidationError

    本階段只支援 user-level 欄位權限 (accounts_id)。
    group_code 欄位為 Phase 9B 群組擴充預留，本階段不實作群組邏輯。
    """
    hisystem = models.CharField(
        max_length=10, default='01', db_column='hisystem',
        help_text='系統歸屬代號，對齊 PB hisystem'
    )
    accounts_id = models.CharField(
        max_length=50, db_column='accounts_id',
        help_text='帳號 ID，對應 sys_accounts.accounts_id'
    )
    obj_name = models.CharField(
        max_length=50, db_column='obj_name',
        help_text='作業視窗名稱，如 w_dp030'
    )
    db_name = models.CharField(
        max_length=50, db_column='db_name',
        help_text='受限制的資料庫欄位名稱，如 cost'
    )
    kind = models.CharField(
        max_length=10, default='readonly', db_column='kind',
        help_text="欄位控制類型：'hide' 或 'readonly'（對齊 PB kind 欄位值域）"
    )
    group_code = models.CharField(
        max_length=20, null=True, blank=True, db_column='group_code',
        help_text='Phase 9B 群組擴充預留欄位，本階段不使用'
    )
    created_at = models.DateTimeField(auto_now_add=True, db_column='created_at')
    modified_at = models.DateTimeField(auto_now=True, db_column='modified_at')

    class Meta:
        app_label = 'api'
        managed = True  # 由 Django migration 建表
        db_table = 'sys_accounts_column'
        verbose_name = '欄位級別權限'
        verbose_name_plural = '欄位級別權限'
        unique_together = (('hisystem', 'accounts_id', 'obj_name', 'db_name'),)
        indexes = [
            models.Index(fields=['accounts_id', 'obj_name'], name='idx_sacol_acct_obj'),
        ]

    def __str__(self):
        return f"[{self.accounts_id}] {self.obj_name}.{self.db_name} = {self.kind}"


class SysConstraint(models.Model):
    """資料範圍約束主表 sys_constraint

    對應 PB sys_constraint Master 表。
    本表為約束群組的定義，keycol 為受限制的 Django QuerySet filter 欄位名。
    constraint_type 只允許 'equal' 或 'in_list'，禁止 raw_sql / between / prefix。

    使用方式（對齊 PB 查詢邏輯）：
      1. 以 ViewSet.program_id 查 sys_constraint_program.obj_name → 取得 pgkey
      2. 以登入帳號查 sys_constraint_leaguer.accounts_id → 取得 pgkey
      3. 取兩者交集的 sys_constraint，讀取 keycol
      4. 以 sys_constraint_detail.cgkey 為允許值清單
      5. 套用 queryset.filter(**{keycol: value}) 或 filter(**{keycol+'__in': values})
    """
    gkey = models.CharField(
        primary_key=True, max_length=20,
        default=generate_pb_gkey, db_column='gkey',
        help_text='PB 風格 20 碼主鍵'
    )
    hisystem = models.CharField(
        max_length=10, default='01', db_column='hisystem'
    )
    cname = models.CharField(
        max_length=40, db_column='cname',
        help_text='約束群組名稱，人類可讀'
    )
    keycol = models.CharField(
        max_length=50, db_column='keycol',
        help_text="對應 Django QuerySet filter 的欄位名，如 'es101gkey' 或 'es101gkey_id'"
    )
    constraint_type = models.CharField(
        max_length=10, default='equal', db_column='constraint_type',
        help_text="限制類型：'equal'（單值）或 'in_list'（多值清單）。禁止 raw_sql"
    )
    created_at = models.DateTimeField(auto_now_add=True, db_column='created_at')

    class Meta:
        app_label = 'api'
        managed = True
        db_table = 'sys_constraint'
        verbose_name = '資料範圍約束群組'
        verbose_name_plural = '資料範圍約束群組'

    def __str__(self):
        return f"[{self.gkey}] {self.cname} ({self.keycol})"


class SysConstraintProgram(models.Model):
    """約束對應的作業表 sys_constraint_program

    記錄哪些作業（obj_name，如 w_dp030）受到該 constraint 控制。
    對應 PB sys_constraint_program 表。
    """
    pgkey = models.ForeignKey(
        SysConstraint, on_delete=models.CASCADE,
        db_column='pgkey', to_field='gkey',
        related_name='programs'
    )
    obj_name = models.CharField(
        max_length=50, db_column='obj_name',
        help_text='受約束的作業名稱，如 w_dp030'
    )

    class Meta:
        app_label = 'api'
        managed = True
        db_table = 'sys_constraint_program'
        verbose_name = '約束對應作業'
        unique_together = (('pgkey', 'obj_name'),)
        indexes = [
            models.Index(fields=['obj_name'], name='idx_scp_obj_name'),
        ]

    def __str__(self):
        return f"{self.pgkey_id} → {self.obj_name}"


class SysConstraintLeaguer(models.Model):
    """約束對應的帳號表 sys_constraint_leaguer

    記錄哪些帳號（accounts_id）受到該 constraint 控制。
    對應 PB sys_constraint_leaguer 表。
    group_code 為 Phase 9B 群組擴充預留欄位。
    """
    pgkey = models.ForeignKey(
        SysConstraint, on_delete=models.CASCADE,
        db_column='pgkey', to_field='gkey',
        related_name='leaguers'
    )
    accounts_id = models.CharField(
        max_length=50, db_column='accounts_id',
        help_text='受約束的帳號 ID'
    )
    group_code = models.CharField(
        max_length=20, null=True, blank=True, db_column='group_code',
        help_text='Phase 9B 群組擴充預留'
    )

    class Meta:
        app_label = 'api'
        managed = True
        db_table = 'sys_constraint_leaguer'
        verbose_name = '約束對應帳號'
        unique_together = (('pgkey', 'accounts_id'),)
        indexes = [
            models.Index(fields=['accounts_id'], name='idx_scl_accounts_id'),
        ]

    def __str__(self):
        return f"{self.pgkey_id} → {self.accounts_id}"


class SysConstraintDetail(models.Model):
    """約束允許值清單 sys_constraint_detail

    記錄該 constraint 允許的具體值（cgkey）。
    對應 PB sys_constraint_detail 表。
    cgkey 通常為某 Entity 的 gkey，如員工 gkey / 廠別 gkey 等。
    """
    pgkey = models.ForeignKey(
        SysConstraint, on_delete=models.CASCADE,
        db_column='pgkey', to_field='gkey',
        related_name='details'
    )
    cgkey = models.CharField(
        max_length=20, db_column='cgkey',
        help_text='允許的值（通常為某 Entity 的 gkey）'
    )
    cname = models.CharField(
        max_length=40, null=True, blank=True, db_column='cname',
        help_text='可讀名稱（非正規化快取，方便後台查看）'
    )

    class Meta:
        app_label = 'api'
        managed = True
        db_table = 'sys_constraint_detail'
        verbose_name = '約束允許值清單'
        indexes = [
            models.Index(fields=['pgkey', 'cgkey'], name='idx_scd_pgkey_cgkey'),
        ]

    def __str__(self):
        return f"{self.pgkey_id} → {self.cgkey} ({self.cname})"

