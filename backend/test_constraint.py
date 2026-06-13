import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from django.test.client import Client
from rest_framework.test import APIClient
from api.models import SysAccount, Dp030, Ba010
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
import json

client = APIClient()
account = SysAccount.objects.filter(peopdom_class='5').first()

if account:
    django_user, _ = User.objects.get_or_create(
        username=account.accounts_id,
        defaults={'first_name': account.accounts, 'is_active': True}
    )
    token, _ = Token.objects.get_or_create(user=django_user)
    client.credentials(HTTP_AUTHORIZATION="Token " + token.key)
    print(f"Testing with account: {account.accounts_id}")
else:
    print("No SysAccount found.")
    exit(1)

print("--- API Validation Tests ---")
# 1. Invalid obj_name
res = client.post('/api/sys-constraint/batch_save/', data={
    "accounts_id": account.accounts_id,
    "obj_name": "w_invalid",
    "keycol": "es101gkey",
    "constraint_type": "in_list",
    "values": [{"cgkey": "2605280501299585219A", "cname": "業務員001"}]
}, format='json')
assert res.status_code == 400, "Should reject invalid obj_name"
print("Invalid obj_name rejected correctly.")

# 2. Invalid keycol
res = client.post('/api/sys-constraint/batch_save/', data={
    "accounts_id": account.accounts_id,
    "obj_name": "w_dp030",
    "keycol": "invalid_key",
    "constraint_type": "in_list",
    "values": [{"cgkey": "2605280501299585219A", "cname": "業務員001"}]
}, format='json')
assert res.status_code == 400, "Should reject invalid keycol"
print("Invalid keycol rejected correctly.")

print("--- End to End Constraint Tests ---")
# Set real constraint
valid_gkey = '2605280501299585219A'

res = client.post('/api/sys-constraint/batch_save/', data={
    "accounts_id": account.accounts_id,
    "obj_name": "w_dp030",
    "keycol": "es101gkey",
    "constraint_type": "in_list",
    "values": [{"cgkey": valid_gkey, "cname": "業務員001"}]
}, format='json')
assert res.status_code == 200, f"Valid save failed: {res.content}"
print("Successfully saved constraint.")

# Read constraint back
res = client.get(f'/api/sys-constraint/?accounts_id={account.accounts_id}&obj_name=w_dp030')
assert res.status_code == 200
data = res.json()
assert len(data) == 1
assert data[0]['keycol'] == 'es101gkey'
assert data[0]['values'][0]['cgkey'] == valid_gkey
print("GET returned correct constraint.")

# Try to list DP030
res = client.get('/api/dp030/')
assert res.status_code == 200
res_json = res.json()
if isinstance(res_json, dict):
    dp030_list = res_json.get('results', [])
else:
    dp030_list = res_json
print(f"Listed {len(dp030_list)} DP030 records.")
for item in dp030_list:
    if item.get('es101gkey') != valid_gkey and item.get('es101gkey'):
        print(f"WARNING: Listed record {item.get('gkey')} has es101gkey {item.get('es101gkey')}")

# Clear constraint
res = client.post('/api/sys-constraint/batch_save/', data={
    "accounts_id": account.accounts_id,
    "obj_name": "w_dp030",
    "keycol": "es101gkey",
    "constraint_type": "in_list",
    "values": []
}, format='json')
assert res.status_code == 200
print("Cleared constraint successfully.")

res = client.get(f'/api/sys-constraint/?accounts_id={account.accounts_id}&obj_name=w_dp030')
data = res.json()
assert len(data) == 0, "Constraint should be empty"
print("Constraint correctly cleared.")

print("All tests passed.")
