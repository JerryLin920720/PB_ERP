"""
Phase 9A-2B 試點種子資料建立腳本

執行方式：
    cd backend
    ./venv/bin/python seed_phase9a2b_dp030_pilot.py

此腳本建立 DP030 試點所需的測試資料：
1. 測試用 SysPopedom（w_dp030 查詢權限）
2. sys_accounts_column（欄位級別權限）
3. sys_constraint 四表（資料範圍限制）
"""
import os
import sys
import django

os.chdir(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.modules.sys.models import (
    SysAccountsColumn, SysConstraint,
    SysConstraintProgram, SysConstraintLeaguer, SysConstraintDetail,
    SysPopedom, SysPopedomDesc, SysAccount
)
from api.modules.common.models import generate_pb_gkey

print("=== Phase 9A-2B DP030 Pilot Seed Data ===\n")

# ============================================================
# 確認測試帳號是否存在
# ============================================================
print("[1] 確認現有帳號...")
accounts = list(SysAccount.objects.values_list('accounts_id', 'peopdom_class')[:5])
print(f"    目前帳號清單（前5筆）：{accounts}")

if not accounts:
    print("    ⚠ 無帳號資料，請先確認 sys_accounts 是否有資料。")
    sys.exit(1)

# 取第一個非管理員帳號作為測試帳號（優先找 peopdom_class <= 4 的）
test_account = None
for acc_id, pclass in accounts:
    try:
        if int(pclass or '1') <= 4:
            test_account = acc_id
            break
    except (ValueError, TypeError):
        test_account = acc_id
        break

if not test_account:
    test_account = accounts[0][0]

print(f"    使用測試帳號：'{test_account}'")

# ============================================================
# 清除既有試點測試資料（避免重複執行問題）
# ============================================================
print("\n[2] 清除既有試點資料...")
deleted_sacol, _ = SysAccountsColumn.objects.filter(
    obj_name='w_dp030',
    accounts_id=test_account
).delete()
print(f"    已清除 sys_accounts_column: {deleted_sacol} 筆")

# 清除試點 sys_constraint（以固定 gkey 識別）
PILOT_CONSTRAINT_GKEY = 'PILOT9A2BDP030__A'
for m in [SysConstraint.objects.filter(gkey=PILOT_CONSTRAINT_GKEY)]:
    cnt, _ = m.delete()
    print(f"    已清除 sys_constraint 試點資料: {cnt} 筆")

# ============================================================
# 建立 sys_accounts_column 測試資料
# ============================================================
print("\n[3] 建立 sys_accounts_column 試點資料...")

# Case 1: styleno 欄位設為 hide（模擬隱藏敏感欄位）
# 注意：實際生產中，此處應設定成本/金額欄位，如 cost / price
# 此處使用 styleno 作為示範（不影響業務運作）
col1, created = SysAccountsColumn.objects.update_or_create(
    hisystem='01',
    accounts_id=test_account,
    obj_name='w_dp030',
    db_name='styleno',
    defaults={'kind': 'hide'}
)
print(f"    {'建立' if created else '更新'} hide 欄位規則：{test_account} / w_dp030 / styleno / hide")

# Case 2: logo 欄位設為 readonly
col2, created = SysAccountsColumn.objects.update_or_create(
    hisystem='01',
    accounts_id=test_account,
    obj_name='w_dp030',
    db_name='logo',
    defaults={'kind': 'readonly'}
)
print(f"    {'建立' if created else '更新'} readonly 欄位規則：{test_account} / w_dp030 / logo / readonly")

# ============================================================
# 建立 sys_constraint 四表試點資料
# ============================================================
print("\n[4] 建立 sys_constraint 試點資料...")

# 找一筆實際的 dp030 資料，取其 es101gkey 作為 DataConstraint 允許值
from api.modules.dp.models import Dp030
sample_dp030 = Dp030.objects.filter(es101gkey__isnull=False).first()
if sample_dp030 and sample_dp030.es101gkey_id:
    allowed_es101_gkey = sample_dp030.es101gkey_id
    allowed_es101_name = getattr(sample_dp030.es101gkey, 'englishname', '') if hasattr(sample_dp030, 'es101gkey') else ''
    print(f"    找到示範 dp030 資料，es101gkey = {allowed_es101_gkey} ({allowed_es101_name})")
else:
    print("    ⚠ 未找到含 es101gkey 的 dp030 資料，使用假值 'TEST_ES101_GKEY'")
    allowed_es101_gkey = 'TEST_ES101_GKEY'
    allowed_es101_name = '測試業務員'

# 建立 sys_constraint 主表
sc, sc_created = SysConstraint.objects.update_or_create(
    gkey=PILOT_CONSTRAINT_GKEY,
    defaults={
        'hisystem': '01',
        'cname': 'Phase9A2B試點：DP030業務員資料範圍',
        'keycol': 'es101gkey',
        'constraint_type': 'equal'
    }
)
print(f"    {'建立' if sc_created else '更新'} sys_constraint: {PILOT_CONSTRAINT_GKEY}")

# 建立 sys_constraint_program（綁定 w_dp030）
scp, _ = SysConstraintProgram.objects.update_or_create(
    pgkey=sc,
    obj_name='w_dp030',
)
print(f"    建立 sys_constraint_program: {PILOT_CONSTRAINT_GKEY} → w_dp030")

# 建立 sys_constraint_leaguer（綁定測試帳號）
scl, _ = SysConstraintLeaguer.objects.update_or_create(
    pgkey=sc,
    accounts_id=test_account,
)
print(f"    建立 sys_constraint_leaguer: {PILOT_CONSTRAINT_GKEY} → {test_account}")

# 建立 sys_constraint_detail（允許值：第一筆 dp030 的 es101gkey）
SysConstraintDetail.objects.filter(pgkey=sc).delete()
scd = SysConstraintDetail.objects.create(
    pgkey=sc,
    cgkey=allowed_es101_gkey,
    cname=allowed_es101_name
)
print(f"    建立 sys_constraint_detail: 允許值 = {allowed_es101_gkey} ({allowed_es101_name})")

# ============================================================
# 摘要
# ============================================================
print("\n=== 試點資料建立完成 ===")
print(f"\n測試帳號：'{test_account}'")
print(f"\nsys_accounts_column 規則：")
print(f"  - w_dp030.styleno → hide（response 不回傳，request 不接受）")
print(f"  - w_dp030.logo    → readonly（response 正常，request 不接受修改）")
print(f"\nsys_constraint 規則：")
print(f"  - {test_account} 在 w_dp030 下，es101gkey 只能等於 '{allowed_es101_gkey}'")
print(f"\n期望 API 行為：")
print(f"  - GET /api/dp030/    → response 中 styleno 欄位消失，logo 正常顯示")
print(f"  - GET /api/dp030/    → 只顯示 es101gkey='{allowed_es101_gkey}' 的樣品單")
print(f"  - POST deep_save 含 styleno 欄位 → 400 ValidationError")
print(f"  - POST deep_save 含 logo 欄位（修改值）→ 400 ValidationError")
print(f"  - GET /api/dp030/{{other_es101_gkey_record}}/ → 403 PermissionDenied")
