import os
import django
import sys

# Set up Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from api.models import Mr015, Mr016, Mr035
from api.serializers import Mr016Serializer
from api.views import Mr016ViewSet
from rest_framework.test import APIRequestFactory
from rest_framework import status

# Ensure we have some test data in DB
mr015_inst, _ = Mr015.objects.get_or_create(
    matno="M15_TEST",
    defaults={"cname": "測試大類", "serialno": 1}
)
print("Using Mr015 gkey:", mr015_inst.gkey)

factory = APIRequestFactory()

# Scenario A: Correct payload with smatno and mr015gkey
payload_ok = {
    "upsert": [
        {
            "gkey": "temp_12345",
            "smatno": "S16_OK",
            "cname": "測試小類OK",
            "ename": "TestDetailOK",
            "mr015gkey": mr015_inst.gkey
        }
    ],
    "delete": []
}

# Scenario B: Payload with empty smatno and empty mr015gkey (simulating a blank new row)
payload_blank = {
    "upsert": [
        {
            "gkey": "temp_123456",
            "smatno": "S16_OK2",
            "cname": "測試小類OK2",
            "ename": "TestDetailOK2",
            "mr015gkey": mr015_inst.gkey
        },
        {
            "gkey": "temp_blank",
            "smatno": "",
            "cname": "",
            "ename": "",
            "mr015gkey": ""
        }
    ],
    "delete": []
}

# Scenario C: Payload where mr015gkey is present but smatno is somehow empty
payload_no_smatno = {
    "upsert": [
        {
            "gkey": "temp_no_smat",
            "smatno": "",
            "cname": "cname",
            "ename": "ename",
            "mr015gkey": mr015_inst.gkey
        }
    ],
    "delete": []
}

view = Mr016ViewSet.as_view({'post': 'bulk_save'})

print("\n--- Testing Scenario A (OK Payload) ---")
request = factory.post('/api/mr016/bulk_save/', payload_ok, format='json')
# Force authentication if required, viewset uses HasProgramPermission which checks account permissions.
# Let's bypass permission check by mock user
from django.contrib.auth.models import User
admin_user, _ = User.objects.get_or_create(username='admin', is_superuser=True)
from rest_framework.test import force_authenticate
force_authenticate(request, user=admin_user)

response = view(request)
print("Response Status:", response.status_code)
print("Response Data:", response.data)

print("\n--- Testing Scenario B (OK + Blank New Row Payload) ---")
request = factory.post('/api/mr016/bulk_save/', payload_blank, format='json')
force_authenticate(request, user=admin_user)
response = view(request)
print("Response Status:", response.status_code)
print("Response Data:", response.data)

print("\n--- Testing Scenario C (Missing smatno Payload) ---")
request = factory.post('/api/mr016/bulk_save/', payload_no_smatno, format='json')
force_authenticate(request, user=admin_user)
response = view(request)
print("Response Status:", response.status_code)
print("Response Data:", response.data)

# Cleanup temp records
Mr016.objects.filter(smatno__in=["S16_OK", "S16_OK2"]).delete()
