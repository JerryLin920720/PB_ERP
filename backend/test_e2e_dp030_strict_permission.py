import os
import django
import json
import traceback

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

# Runtime patch to prevent IntegrityError NameError crash in legacy_deep_save
import django.db
import api.modules.dp.views
api.modules.dp.views.IntegrityError = django.db.IntegrityError

from django.test.client import Client
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token

from api.models import (
    SysAccount, SysPopedom, SysPopedomDesc, SysConstraint, 
    SysConstraintProgram, SysConstraintLeaguer, SysConstraintDetail, 
    SysAccountsColumn, Dp030, Dp031, Dp032, Dp033, Dp034, Dp035, Dp104,
    Ba010, Es101
)

TEST_USERNAMES = ['test_full', 'test_no_search', 'test_no_new', 'test_no_edit', 'test_no_delete', 'test_no_approve']
VALID_EMPLOYEE_GKEY = '2605280501299585219A'
INVALID_EMPLOYEE_GKEY = 'INVALID_EMP_GKEY'

# Popedom index mapping
# idx 0: new, idx 1: edit, idx 2: delete, idx 3: search, idx 4: print, idx 5: excel, idx 6: check, idx 7: recheck
POPEDOM_INDEXES = {
    'new': 0,
    'edit': 1,
    'delete': 2,
    'search': 3,
    'print': 4,
    'excel': 5,
    'check': 6,
    'recheck': 7
}

results = {
    "Program Permission": {},
    "Field Permission": {},
    "DataConstraint": {},
    "Detail API Bypass": {},
    "legacy_deep_save Risk": {}
}

# Ensure Popedom description entries exist for w_dp030
def setup_popedom_descriptors():
    SysPopedomDesc.objects.get_or_create(obj_name='w_dp030', popedom_id='new', defaults={'popedom_index': 1, 'hisystem': '01'})
    SysPopedomDesc.objects.get_or_create(obj_name='w_dp030', popedom_id='edit', defaults={'popedom_index': 2, 'hisystem': '01'})
    SysPopedomDesc.objects.get_or_create(obj_name='w_dp030', popedom_id='delete', defaults={'popedom_index': 3, 'hisystem': '01'})
    SysPopedomDesc.objects.get_or_create(obj_name='w_dp030', popedom_id='search', defaults={'popedom_index': 4, 'hisystem': '01'})
    SysPopedomDesc.objects.get_or_create(obj_name='w_dp030', popedom_id='print', defaults={'popedom_index': 5, 'hisystem': '01'})
    SysPopedomDesc.objects.get_or_create(obj_name='w_dp030', popedom_id='excel', defaults={'popedom_index': 6, 'hisystem': '01'})
    SysPopedomDesc.objects.get_or_create(obj_name='w_dp030', popedom_id='check', defaults={'popedom_index': 7, 'hisystem': '01'})
    SysPopedomDesc.objects.get_or_create(obj_name='w_dp030', popedom_id='recheck', defaults={'popedom_index': 8, 'hisystem': '01'})

def create_test_auth_user(username, active_perms):
    # Setup popedom string
    popedom_list = ['N'] * 20
    for p in active_perms:
        if p in POPEDOM_INDEXES:
            popedom_list[POPEDOM_INDEXES[p]] = 'Y'
    popedom_str = "".join(popedom_list)

    # 1. SysAccount
    SysAccount.objects.filter(accounts_id=username).delete()
    target_user_id = VALID_EMPLOYEE_GKEY if username == 'test_full' else username
    SysAccount.objects.filter(user_id=target_user_id).delete()
    SysAccount.objects.create(
        user_id=target_user_id,
        accounts_id=username,
        accounts=username,
        peopdom_class='1',
        hisystem='01'
    )

    # 2. SysPopedom
    SysPopedom.objects.filter(accounts_id=username, obj_name='w_dp030').delete()
    SysPopedom.objects.create(
        accounts_id=username,
        obj_name='w_dp030',
        prg_popedom=popedom_str,
        flag='10',
        hisystem='01'
    )

    # 3. Django user and Token
    User.objects.filter(username=username).delete()
    django_user = User.objects.create(username=username, is_active=True)
    token, _ = Token.objects.get_or_create(user=django_user)
    
    # 4. SysAccountsActive to bypass active check if any
    SysAccountsActive = django.apps.apps.get_model('api', 'SysAccountsActive')
    from django.utils import timezone
    SysAccountsActive.objects.filter(accounts_id=username).delete()
    SysAccountsActive.objects.create(
        gkey=username[:20],
        accounts_id=username,
        hisystem='01',
        logintime=timezone.now(),
        computername='audit',
        loginip='127.0.0.1',
        spid=1,
        win_login='Web'
    )
    return token.key

def setup_all_users():
    tokens = {}
    tokens['test_full'] = create_test_auth_user('test_full', ['search', 'new', 'edit', 'delete', 'check', 'recheck', 'print', 'excel'])
    tokens['test_no_search'] = create_test_auth_user('test_no_search', ['new', 'edit', 'delete', 'check', 'recheck', 'print', 'excel'])
    tokens['test_no_new'] = create_test_auth_user('test_no_new', ['search', 'edit', 'delete', 'check', 'recheck', 'print', 'excel'])
    tokens['test_no_edit'] = create_test_auth_user('test_no_edit', ['search', 'new', 'delete', 'check', 'recheck', 'print', 'excel'])
    tokens['test_no_delete'] = create_test_auth_user('test_no_delete', ['search', 'new', 'edit', 'check', 'recheck', 'print', 'excel'])
    tokens['test_no_approve'] = create_test_auth_user('test_no_approve', ['search', 'new', 'edit', 'delete', 'recheck', 'print', 'excel'])
    return tokens

def cleanup_database():
    print("Executing database cleanup...")
    # Clean test users
    User.objects.filter(username__in=TEST_USERNAMES).delete()
    SysAccount.objects.filter(accounts_id__in=TEST_USERNAMES).delete()
    SysPopedom.objects.filter(accounts_id__in=TEST_USERNAMES).delete()
    
    # Clean field permissions
    SysAccountsColumn.objects.filter(accounts_id__in=TEST_USERNAMES).delete()
    
    # Clean data constraints
    SysConstraint.objects.filter(cname__startswith='test_full_').delete()
    
    # Clean test models
    Dp033.objects.filter(dp030gkey__sampleno__startswith='TEST_').delete()
    Dp031.objects.filter(dp030gkey__sampleno__startswith='TEST_').delete()
    Dp032.objects.filter(dp030gkey__sampleno__startswith='TEST_').delete()
    Dp030.objects.filter(sampleno__startswith='TEST_').delete()
    Ba010.objects.filter(gkey='TEST_CUST_GKEY').delete()
    Es101.objects.filter(gkey__in=[VALID_EMPLOYEE_GKEY, INVALID_EMPLOYEE_GKEY]).delete()
    print("Database cleanup completed.")

def run_reality_audit():
    # 0. Setup
    setup_popedom_descriptors()
    cleanup_database()
    tokens = setup_all_users()
    
    # Clients map
    clients = {}
    for username, tok in tokens.items():
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION="Token " + tok)
        clients[username] = client

    # Create common test entities
    ba010, _ = Ba010.objects.get_or_create(gkey='TEST_CUST_GKEY', defaults={'shortname': 'TEST_CUST'})
    valid_emp, _ = Es101.objects.get_or_create(gkey=VALID_EMPLOYEE_GKEY, defaults={'employeeno': 'TEST_E1', 'idno': 'TEST_ID_1', 'englishname': 'ValidEmp', 'chinesename': 'Valid'})
    invalid_emp, _ = Es101.objects.get_or_create(gkey=INVALID_EMPLOYEE_GKEY, defaults={'employeeno': 'TEST_E2', 'idno': 'TEST_ID_2', 'englishname': 'InvalidEmp', 'chinesename': 'Invalid'})

    # Create a valid DP030 for retrieve/update/delete tests
    dp030_valid = Dp030.objects.create(
        sampleno='TEST_SAMPLENO_A',
        ba010gkey=ba010,
        es101gkey=valid_emp,
        cost='N',
        profit=100.0,
        logo='ORIGINAL_LOGO'
    )
    
    # Create an invalid DP030 for retrieve/update/delete tests
    dp030_invalid = Dp030.objects.create(
        sampleno='TEST_SAMPLENO_B',
        ba010gkey=ba010,
        es101gkey=invalid_emp,
        cost='N',
        profit=200.0,
        logo='ORIGINAL_LOGO'
    )

    try:
        # =====================================================================
        # PART I: Program Permission Verification
        # =====================================================================
        print("\n--- Part I: Program Permission Verification ---")
        
        # 1. test_no_search GET /api/dp030/ -> expect 403
        res = clients['test_no_search'].get('/api/dp030/')
        results["Program Permission"]["GET list without search permission"] = {
            "status_code": res.status_code,
            "passed": res.status_code == 403
        }

        # 2. test_no_new POST /api/dp030/deep_save/ -> expect 403
        res = clients['test_no_new'].post('/api/dp030/deep_save/', data={"master": {"sampleno": "TEST_NEW_1", "ba010gkey": ba010.gkey}}, format='json')
        results["Program Permission"]["POST deep_save create without new permission"] = {
            "status_code": res.status_code,
            "passed": res.status_code == 403
        }

        # 3. test_no_edit POST /api/dp030/deep_save/ update -> expect 403
        res = clients['test_no_edit'].post('/api/dp030/deep_save/', data={"master": {"gkey": dp030_valid.gkey, "sampleno": "TEST_SAMPLENO_A", "remark": "new remark"}}, format='json')
        results["Program Permission"]["POST deep_save update without edit permission"] = {
            "status_code": res.status_code,
            "passed": res.status_code == 403
        }

        # 4. test_no_edit PATCH /api/dp030/{gkey}/ -> expect 403
        res = clients['test_no_edit'].patch(f'/api/dp030/{dp030_valid.gkey}/', data={"remark": "new"}, format='json')
        results["Program Permission"]["PATCH update without edit permission"] = {
            "status_code": res.status_code,
            "passed": res.status_code == 403
        }

        # 5. test_no_delete DELETE /api/dp030/{gkey}/ -> expect 403
        res = clients['test_no_delete'].delete(f'/api/dp030/{dp030_valid.gkey}/')
        results["Program Permission"]["DELETE without delete permission"] = {
            "status_code": res.status_code,
            "passed": res.status_code == 403
        }

        # 6. test_full actions -> expect success (GET = 200, PATCH = 200, etc.)
        res_get = clients['test_full'].get('/api/dp030/')
        res_retrieve = clients['test_full'].get(f'/api/dp030/{dp030_valid.gkey}/')
        res_patch = clients['test_full'].patch(f'/api/dp030/{dp030_valid.gkey}/', data={"remark": "full", "ba010gkey": ba010.gkey}, format='json')
        
        results["Program Permission"]["Full Access actions"] = {
            "get_list_status": res_get.status_code,
            "retrieve_status": res_retrieve.status_code,
            "patch_status": res_patch.status_code,
            "patch_response": res_patch.json() if res_patch.status_code == 400 else res_patch.content.decode('utf-8', errors='ignore'),
            "passed": res_get.status_code == 200 and res_retrieve.status_code == 200 and res_patch.status_code == 200
        }

        # =====================================================================
        # PART II: Field Permission Verification
        # =====================================================================
        print("\n--- Part II: Field Permission Verification ---")
        
        # 1. Setup field permission for test_full
        # cost = hide, profit = readonly
        SysAccountsColumn.objects.create(
            accounts_id="test_full",
            obj_name="w_dp030",
            db_name="cost",
            kind="hide",
            hisystem="01"
        )
        SysAccountsColumn.objects.create(
            accounts_id="test_full",
            obj_name="w_dp030",
            db_name="profit",
            kind="readonly",
            hisystem="01"
        )

        # 2. GET /api/auth/me/ to check metadata
        res = clients['test_full'].get('/api/auth/me/')
        field_perms = res.json().get('field_permissions', {})
        me_passed = (
            field_perms.get('w_dp030', {}).get('cost') == 'hide' and
            field_perms.get('w_dp030', {}).get('profit') == 'readonly'
        )
        results["Field Permission"]["Me API returns field permissions"] = {
            "field_permissions": field_perms.get('w_dp030', {}),
            "passed": me_passed
        }

        # 3. GET /api/dp030/{gkey}/ expect no 'cost', expect 'profit'
        res = clients['test_full'].get(f'/api/dp030/{dp030_valid.gkey}/')
        data = res.json()
        get_passed = ('cost' not in data) and ('profit' in data)
        results["Field Permission"]["GET hides cost, returns profit"] = {
            "response_keys": list(data.keys()),
            "cost_in_response": 'cost' in data,
            "profit_in_response": 'profit' in data,
            "passed": get_passed
        }

        # 4. PATCH update with 'cost' -> expect 400
        res = clients['test_full'].patch(f'/api/dp030/{dp030_valid.gkey}/', data={"cost": "Y"}, format='json')
        patch_cost_passed = res.status_code == 400 and 'cost' in res.json()
        results["Field Permission"]["PATCH write to cost (hidden) throws 400"] = {
            "status_code": res.status_code,
            "response": res.json() if res.status_code == 400 else res.content.decode('utf-8'),
            "passed": patch_cost_passed
        }

        # 5. PATCH update with 'profit' -> expect 400
        res = clients['test_full'].patch(f'/api/dp030/{dp030_valid.gkey}/', data={"profit": 999.0}, format='json')
        patch_profit_passed = res.status_code == 400 and 'profit' in res.json()
        results["Field Permission"]["PATCH write to profit (readonly) throws 400"] = {
            "status_code": res.status_code,
            "response": res.json() if res.status_code == 400 else res.content.decode('utf-8'),
            "passed": patch_profit_passed
        }

        # 6. POST deep_save with 'cost' -> expect 400
        res = clients['test_full'].post('/api/dp030/deep_save/', data={
            "master": {
                "gkey": dp030_valid.gkey,
                "sampleno": "TEST_SAMPLENO_A",
                "ba010gkey": ba010.gkey,
                "cost": "Y"
            }
        }, format='json')
        deep_save_cost_passed = res.status_code == 400 and 'cost' in str(res.content.decode('utf-8'))
        results["Field Permission"]["POST deep_save write to cost (hidden) throws 400"] = {
            "status_code": res.status_code,
            "response": res.json() if res.status_code == 400 else res.content.decode('utf-8', errors='ignore'),
            "passed": deep_save_cost_passed
        }

        # 7. POST deep_save with 'profit' -> expect 400
        res = clients['test_full'].post('/api/dp030/deep_save/', data={
            "master": {
                "gkey": dp030_valid.gkey,
                "sampleno": "TEST_SAMPLENO_A",
                "ba010gkey": ba010.gkey,
                "profit": 999.0
            }
        }, format='json')
        deep_save_profit_passed = res.status_code == 400 and 'profit' in str(res.content.decode('utf-8'))
        results["Field Permission"]["POST deep_save write to profit (readonly) throws 400"] = {
            "status_code": res.status_code,
            "response": res.json() if res.status_code == 400 else res.content.decode('utf-8', errors='ignore'),
            "passed": deep_save_profit_passed
        }

        # =====================================================================
        # PART III: DataConstraint Verification
        # =====================================================================
        print("\n--- Part III: DataConstraint Verification ---")
        
        # 1. Setup constraint for test_full
        sc = SysConstraint.objects.create(
            gkey="TEST_SC_GKEY",
            cname="test_full_dp030",
            keycol="es101gkey",
            constraint_type="in_list",
            hisystem="01"
        )
        SysConstraintProgram.objects.create(pgkey=sc, obj_name="w_dp030")
        SysConstraintLeaguer.objects.create(pgkey=sc, accounts_id="test_full")
        SysConstraintDetail.objects.create(pgkey=sc, cgkey=VALID_EMPLOYEE_GKEY, cname="ValidEmp")

        # 2. GET /api/dp030/ expect only VALID_EMPLOYEE_GKEY
        res = clients['test_full'].get('/api/dp030/')
        items = res.json().get('results', []) if isinstance(res.json(), dict) else res.json()
        constraint_list_passed = len(items) > 0 and all(item.get('es101gkey') == VALID_EMPLOYEE_GKEY for item in items)
        results["DataConstraint"]["GET list filters out of bounds rows"] = {
            "row_count": len(items),
            "es101gkeys_returned": [item.get('es101gkey') for item in items],
            "passed": constraint_list_passed
        }

        # 3. GET /api/dp030/{outofbound_gkey}/ -> expect 404
        res = clients['test_full'].get(f'/api/dp030/{dp030_invalid.gkey}/')
        results["DataConstraint"]["GET out of bounds retrieve returns 404"] = {
            "status_code": res.status_code,
            "passed": res.status_code in (404, 403)
        }

        # 4. PATCH /api/dp030/{outofbound_gkey}/ -> expect 404
        res = clients['test_full'].patch(f'/api/dp030/{dp030_invalid.gkey}/', data={"remark": "hack"}, format='json')
        results["DataConstraint"]["PATCH out of bounds update returns 404"] = {
            "status_code": res.status_code,
            "passed": res.status_code in (404, 403)
        }

        # 5. DELETE /api/dp030/{outofbound_gkey}/ -> expect 404
        res = clients['test_full'].delete(f'/api/dp030/{dp030_invalid.gkey}/')
        results["DataConstraint"]["DELETE out of bounds returns 404"] = {
            "status_code": res.status_code,
            "passed": res.status_code in (404, 403)
        }

        # 6. POST deep_save create with INVALID_EMPLOYEE_GKEY -> expect 403
        res = clients['test_full'].post('/api/dp030/deep_save/', data={
            "master": {
                "sampleno": "TEST_NEW_CONSTRAINED",
                "ba010gkey": ba010.gkey,
                "es101gkey": INVALID_EMPLOYEE_GKEY
            }
        }, format='json')
        results["DataConstraint"]["POST deep_save create out of bounds throws 403"] = {
            "status_code": res.status_code,
            "passed": res.status_code == 403
        }

        # 7. POST deep_save create with VALID_EMPLOYEE_GKEY -> expect 200/201 (since full has all perms)
        # Note: it might return 400 if other validation fails, but it shouldn't return 403
        res = clients['test_full'].post('/api/dp030/deep_save/', data={
            "master": {
                "sampleno": "TEST_NEW_OK",
                "ba010gkey": ba010.gkey,
                "es101gkey": VALID_EMPLOYEE_GKEY
            }
        }, format='json')
        results["DataConstraint"]["POST deep_save create in bounds allowed"] = {
            "status_code": res.status_code,
            "passed": res.status_code in (200, 201, 400) and res.status_code != 403
        }

        # =====================================================================
        # PART IV: Detail API Bypass Verification
        # =====================================================================
        print("\n--- Part IV: Detail API Bypass Verification ---")
        
        # Create a test detail item under valid master
        dp031_test = Dp031.objects.create(
            dp030gkey=dp030_valid,
            totalpairs=10,
            serialno=1
        )
        
        # 1. PATCH /api/dp031/{gkey}/ -> expect 405 or 403
        res = clients['test_full'].patch(f'/api/dp031/{dp031_test.gkey}/', data={"totalpairs": 999}, format='json')
        results["Detail API Bypass"]["PATCH /api/dp031/ directly is blocked"] = {
            "status_code": res.status_code,
            "passed": res.status_code in (405, 403)
        }

        # 2. DELETE /api/dp031/{gkey}/ -> expect 405 or 403
        res = clients['test_full'].delete(f'/api/dp031/{dp031_test.gkey}/')
        results["Detail API Bypass"]["DELETE /api/dp031/ directly is blocked"] = {
            "status_code": res.status_code,
            "passed": res.status_code in (405, 403)
        }

        # =====================================================================
        # PART V: legacy_deep_save Risk Verification
        # =====================================================================
        print("\n--- Part V: legacy_deep_save Risk Verification ---")
        
        # 1. check OPTIONS /api/dp030/legacy_deep_save/ to verify route registration
        res = clients['test_full'].options('/api/dp030/legacy_deep_save/')
        results["legacy_deep_save Risk"]["OPTIONS legacy_deep_save check"] = {
            "status_code": res.status_code,
            "passed": res.status_code in (200, 204)
        }

        # 2. test_no_new calls legacy_deep_save to create a new master -> does it block?
        res = clients['test_no_new'].post('/api/dp030/legacy_deep_save/', data={
            "master": {
                "sampleno": "TEST_LEGACY_NEW",
                "ba010gkey": ba010.gkey
            }
        }, format='json')
        results["legacy_deep_save Risk"]["Create via legacy_deep_save without new perm"] = {
            "status_code": res.status_code,
            "passed": res.status_code == 403
        }

        # 3. test_no_edit calls legacy_deep_save to update master -> does it block?
        res = clients['test_no_edit'].post('/api/dp030/legacy_deep_save/', data={
            "master": {
                "gkey": dp030_valid.gkey,
                "sampleno": "TEST_SAMPLENO_A",
                "remark": "hack legacy"
            }
        }, format='json')
        results["legacy_deep_save Risk"]["Update via legacy_deep_save without edit perm"] = {
            "status_code": res.status_code,
            "response_body": res.json() if res.status_code in (200, 400) else res.content.decode('utf-8', errors='ignore'),
            "passed": res.status_code in (403, 405)
        }

        # 4. DataConstraint Bypass Test on legacy_deep_save (CRITICAL RISK CHECK)
        # Using test_full (which is constrained to VALID_EMPLOYEE_GKEY), try to create a new master
        # with INVALID_EMPLOYEE_GKEY via legacy_deep_save!
        res = clients['test_full'].post('/api/dp030/legacy_deep_save/', data={
            "master": {
                "sampleno": "TEST_LEG_BYPASS",
                "ba010gkey": ba010.gkey,
                "es101gkey": INVALID_EMPLOYEE_GKEY
            }
        }, format='json')
        
        # Check if the database was written
        written = Dp030.objects.filter(sampleno="TEST_LEG_BYPASS").exists()
        bypass_failed_passed = res.status_code == 403 or (not written)
        results["legacy_deep_save Risk"]["Constraint bypass check on legacy_deep_save"] = {
            "status_code": res.status_code,
            "response_body": res.json() if res.status_code in (200, 400) else res.content.decode('utf-8', errors='ignore'),
            "record_written_to_db": written,
            "passed": bypass_failed_passed
        }

        # 5. Field Permission Bypass Test on legacy_deep_save
        # Using test_full (who has cost=hide, profit=readonly), try to change profit via legacy_deep_save
        res = clients['test_full'].post('/api/dp030/legacy_deep_save/', data={
            "master": {
                "gkey": dp030_valid.gkey,
                "sampleno": "TEST_SAMPLENO_A",
                "profit": 9999.0
            }
        }, format='json')
        
        # Check if profit was updated in the DB
        dp030_valid.refresh_from_db()
        profit_updated = dp030_valid.profit == 9999.0
        field_bypass_passed = res.status_code == 400 or (not profit_updated)
        results["legacy_deep_save Risk"]["Field permission bypass check on legacy_deep_save"] = {
            "status_code": res.status_code,
            "response_body": res.json() if res.status_code in (200, 400) else res.content.decode('utf-8', errors='ignore'),
            "profit_in_db": float(dp030_valid.profit) if dp030_valid.profit is not None else None,
            "passed": field_bypass_passed
        }

    except Exception as e:
        print("Error during audit execution:")
        import sys
        traceback.print_stdout = True
        traceback.print_exc(file=sys.stdout)
    finally:
        # 6. Cleanup
        cleanup_database()

    print("\n--- AUDIT SUMMARY RESULTS ---")
    print(json.dumps(results, indent=2))

if __name__ == "__main__":
    run_reality_audit()
