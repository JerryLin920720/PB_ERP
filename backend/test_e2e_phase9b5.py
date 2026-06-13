import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from django.test.client import Client
from rest_framework.test import APIClient
from api.models import SysAccount, SysPopedom, SysPopedomDesc, SysConstraint, SysConstraintProgram, SysConstraintLeaguer, SysConstraintDetail, SysAccountsColumn, Dp030, Dp031, Ba010
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token

# Ensure DP030 actions exist in SysPopedomDesc
SysPopedomDesc.objects.get_or_create(obj_name='w_dp030', popedom_id='check', defaults={'popedom_index': 1, 'hisystem': '01'})
SysPopedomDesc.objects.get_or_create(obj_name='w_dp030', popedom_id='new', defaults={'popedom_index': 2, 'hisystem': '01'})
SysPopedomDesc.objects.get_or_create(obj_name='w_dp030', popedom_id='edit', defaults={'popedom_index': 3, 'hisystem': '01'})
SysPopedomDesc.objects.get_or_create(obj_name='w_dp030', popedom_id='delete', defaults={'popedom_index': 4, 'hisystem': '01'})

# Helper to create test user with correct PB indexes
def create_test_user(accounts_id, peopdom_class='1', perms=None):
    if perms is None:
        perms = []
    
    # known indices for w_dp030:
    # 0: new, 1: edit, 2: delete, 3: search, 4: print, 5: excel, 6: check, 7: recheck
    idx_map = {'new': 0, 'edit': 1, 'delete': 2, 'search': 3, 'check': 6}
    popedom_list = ['N'] * 20
    for p in perms:
        if p in idx_map:
            popedom_list[idx_map[p]] = 'Y'
    popedom_str = "".join(popedom_list)

    User.objects.filter(username=accounts_id).delete()
    acc, _ = SysAccount.objects.update_or_create(
        user_id=accounts_id,
        defaults={
            'accounts_id': accounts_id,
            'accounts': accounts_id,
            'peopdom_class': peopdom_class,
            'hisystem': '01'
        }
    )
    SysPopedom.objects.filter(accounts_id=accounts_id, obj_name='w_dp030').delete()
    SysPopedom.objects.create(
        accounts_id=accounts_id,
        obj_name='w_dp030',
        prg_popedom=popedom_str,
        flag='10',
        hisystem='01'
    )
    django_user = User.objects.create(username=accounts_id, is_active=True)
    token, _ = Token.objects.get_or_create(user=django_user)
    SysAccountsActive = django.apps.apps.get_model('api', 'SysAccountsActive')
    from django.utils import timezone
    SysAccountsActive.objects.filter(accounts_id=accounts_id).delete()
    SysAccountsActive.objects.create(
        gkey=accounts_id[:20],
        accounts_id=accounts_id,
        hisystem='01',
        logintime=timezone.now(),
        computername='test',
        loginip='127.0.0.1',
        spid=1,
        win_login='Web'
    )
    return token.key

# Create clients
client_admin = APIClient()
token_admin = create_test_user('admin_user', '5', ['search', 'new', 'edit', 'delete', 'check'])
client_admin.credentials(HTTP_AUTHORIZATION="Token " + token_admin)

client_none = APIClient()
token_none = create_test_user('user_none', '1', [])
client_none.credentials(HTTP_AUTHORIZATION="Token " + token_none)

client_read = APIClient()
token_read = create_test_user('user_read', '1', ['search', 'check'])
client_read.credentials(HTTP_AUTHORIZATION="Token " + token_read)

client_new = APIClient()
token_new = create_test_user('user_new', '1', ['search', 'check', 'new'])
client_new.credentials(HTTP_AUTHORIZATION="Token " + token_new)

client_edit = APIClient()
token_edit = create_test_user('user_edit', '1', ['search', 'check', 'edit'])
client_edit.credentials(HTTP_AUTHORIZATION="Token " + token_edit)

client_del = APIClient()
token_del = create_test_user('user_del', '1', ['search', 'check', 'delete'])
client_del.credentials(HTTP_AUTHORIZATION="Token " + token_del)

# Cleanup
Dp031.objects.filter(dp030gkey__sampleno__startswith='TEST_').delete()
Dp030.objects.filter(sampleno__startswith='TEST_').delete()
Ba010.objects.filter(gkey='TEST_CUST_GKEY').delete()
SysConstraint.objects.filter(leaguers__accounts_id__in=['user_read', 'user_edit', 'user_new', 'user_del']).delete()

print("A. Program Permission Tests")
# 1. No check -> 403
res = client_none.get('/api/dp030/')
assert res.status_code == 403, f"Expected 403 for user_none on GET, got {res.status_code}"

# 2. No new -> create deep_save 403
res = client_read.post('/api/dp030/deep_save/', data={'deep_save': True, 'sampleno': 'T1'}, format='json')
assert res.status_code == 403, f"Expected 403 for user_read on create, got {res.status_code}"

res = client_new.post('/api/dp030/deep_save/', data={'deep_save': True, 'sampleno': 'T1'}, format='json')
assert res.status_code in [400, 200], f"Expected 400 (validation) or 200 for user_new, got {res.status_code}, data: {res.json()}"

valid_gkey = '2605280501299585219A'

# Mock a DP030 for update/delete tests
ba010, _ = Ba010.objects.get_or_create(gkey='TEST_CUST_GKEY')
dp030 = Dp030.objects.create(sampleno='TEST_SAMPLENO_A', ba010gkey=ba010, es101gkey_id=valid_gkey)

client_admin.post('/api/sys-constraint/batch_save/', data={
    "accounts_id": "user_read",
    "obj_name": "w_dp030",
    "hisystem": "01",
    "keycol": "es101gkey",
    "constraint_type": "in_list",
    "values": [{"cgkey": valid_gkey}]
}, format='json')

client_admin.post('/api/sys-constraint/batch_save/', data={
    "accounts_id": "user_del",
    "obj_name": "w_dp030",
    "hisystem": "01",
    "keycol": "es101gkey",
    "constraint_type": "in_list",
    "values": [{"cgkey": valid_gkey}]
}, format='json')

# 3. No edit -> update deep_save / PATCH 403
res = client_read.patch(f'/api/dp030/{dp030.gkey}/', data={'sampleno': 'T2'}, format='json')
assert res.status_code == 403, f"Expected 403 for user_read on patch, got {res.status_code}"

# 4. No delete -> delete 403
res = client_read.delete(f'/api/dp030/{dp030.gkey}/')
assert res.status_code == 403, f"Expected 403 for user_read on delete, got {res.status_code}"

res = client_del.delete(f'/api/dp030/{dp030.gkey}/')
assert res.status_code == 204, f"Expected 204 for user_del on delete, got {res.status_code}, data: {res.content}"

print("-> Program Permission Tests Passed")

print("B. Field Permission Tests")
client_admin.post('/api/sys-accounts-column/batch_save/', data={
    "accounts_id": "user_read",
    "obj_name": "w_dp030",
    "hisystem": "01",
    "columns": [{"db_name": "styleno", "kind": "hide"}, {"db_name": "logo", "kind": "readonly"}]
}, format='json')

# /auth/me/ check
res = client_read.get('/api/auth/me/')
field_perms = res.json().get('field_permissions', {})
assert field_perms.get('w_dp030', {}).get('styleno') == 'hide'
assert field_perms.get('w_dp030', {}).get('logo') == 'readonly'

client_admin.post('/api/sys-constraint/batch_save/', data={
    "accounts_id": "user_edit",
    "obj_name": "w_dp030",
    "hisystem": "01",
    "keycol": "es101gkey",
    "constraint_type": "in_list",
    "values": [{"cgkey": valid_gkey}]
}, format='json')

# API response should hide styleno
dp030_b = Dp030.objects.create(sampleno='TEST_B', styleno='HIDE_ME', logo='READ_ME', ba010gkey=ba010, es101gkey_id=valid_gkey)
res = client_read.get(f'/api/dp030/{dp030_b.gkey}/')
data = res.json()
assert 'styleno' not in data, "styleno should be hidden"
assert data.get('logo') == 'READ_ME', f"logo should be returned (readonly), got: {data}"

# Modify logo -> 400
res = client_edit.patch(f'/api/dp030/{dp030_b.gkey}/', data={'logo': 'NEW_LOGO'}, format='json')
client_admin.post('/api/sys-accounts-column/batch_save/', data={
    "accounts_id": "user_edit",
    "obj_name": "w_dp030",
    "hisystem": "01",
    "columns": [{"db_name": "logo", "kind": "readonly"}]
}, format='json')
res = client_edit.patch(f'/api/dp030/{dp030_b.gkey}/', data={'logo': 'NEW_LOGO'}, format='json')
assert res.status_code == 400, f"readonly field update should return 400, got {res.status_code}, data: {res.content}"
assert 'logo' in res.json(), "error should mention logo"

print("-> Field Permission Tests Passed")

print("C. DataConstraint Tests")
valid_gkey = '2605280501299585219A'
invalid_gkey = 'INVALID_GKEY'

from api.models import Es101
Es101.objects.get_or_create(gkey=valid_gkey, defaults={'employeeno': 'E1'})
Es101.objects.get_or_create(gkey=invalid_gkey, defaults={'employeeno': 'E2'})

client_admin.post('/api/sys-constraint/batch_save/', data={
    "accounts_id": "user_read",
    "obj_name": "w_dp030",
    "hisystem": "01",
    "keycol": "es101gkey",
    "constraint_type": "in_list",
    "values": [{"cgkey": valid_gkey, "cname": "ValidEmp"}]
}, format='json')

dp030_c_valid = Dp030.objects.create(sampleno='TEST_C_VALID', es101gkey_id=valid_gkey, ba010gkey=ba010)
dp030_c_invalid = Dp030.objects.create(sampleno='TEST_C_INVALID', es101gkey_id=invalid_gkey, ba010gkey=ba010)

# GET
res = client_read.get('/api/dp030/')
res_json = res.json()
results = res_json.get('results', []) if isinstance(res_json, dict) else res_json
assert all(r.get('es101gkey') == valid_gkey for r in results), "Should only return constrained rows"

# retrieve out of bounds
res = client_read.get(f'/api/dp030/{dp030_c_invalid.gkey}/')
assert res.status_code == 404, "Out of bounds should be 404 (QuerySet filtered)"

# Update out of bounds
client_admin.post('/api/sys-constraint/batch_save/', data={
    "accounts_id": "user_edit",
    "obj_name": "w_dp030",
    "hisystem": "01",
    "keycol": "es101gkey",
    "constraint_type": "in_list",
    "values": [{"cgkey": valid_gkey}]
}, format='json')
res = client_edit.patch(f'/api/dp030/{dp030_c_invalid.gkey}/', data={'sampleno': 'NEW'}, format='json')
assert res.status_code == 404, "Update out of bounds should be 404"

# Delete out of bounds
client_admin.post('/api/sys-constraint/batch_save/', data={
    "accounts_id": "user_del",
    "obj_name": "w_dp030",
    "hisystem": "01",
    "keycol": "es101gkey",
    "constraint_type": "in_list",
    "values": [{"cgkey": valid_gkey}]
}, format='json')
res = client_del.delete(f'/api/dp030/{dp030_c_invalid.gkey}/')
assert res.status_code == 404, "Delete out of bounds should be 404"

# Deep save create with invalid gkey
client_admin.post('/api/sys-constraint/batch_save/', data={
    "accounts_id": "user_new",
    "obj_name": "w_dp030",
    "hisystem": "01",
    "keycol": "es101gkey",
    "constraint_type": "in_list",
    "values": [{"cgkey": valid_gkey}]
}, format='json')
res = client_new.post('/api/dp030/deep_save/', data={
    'master': {
        'sampleno': 'T3', 'es101gkey': invalid_gkey, 'ba010gkey': ba010.gkey
    }
}, format='json')
assert res.status_code == 403, "DeepSave create out of bounds should be 403"

print("-> DataConstraint Tests Passed")

print("D. Detail API Tests")
dp031 = Dp031.objects.create(dp030gkey=dp030_c_valid, totalpairs=10, serialno='1')
res = client_edit.patch(f'/api/dp031/{dp031.gkey}/', data={'qty': 20}, format='json')
assert res.status_code in [405, 403], "Detail API PATCH should be blocked"
res = client_del.delete(f'/api/dp031/{dp031.gkey}/')
assert res.status_code in [405, 403], "Detail API DELETE should be blocked"

print("-> Detail API Tests Passed")
print("All E2E checks passed!")
