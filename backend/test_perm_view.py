import os, django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()
from api.models import SysAccount, SysPopedom
from core.authz.services import get_permission_index
acc = SysAccount.objects.get(accounts_id='user_new')
print("accounts_id:", acc.accounts_id)
popedom_index = get_permission_index('w_dp030', 'new')
print("popedom_index:", popedom_index)
popedom = SysPopedom.objects.filter(
    accounts_id=acc.accounts_id,
    obj_name='w_dp030',
    flag='10'
).first()
print("popedom:", popedom.prg_popedom if popedom else None)
if popedom and popedom.prg_popedom:
    idx = popedom_index - 1
    print("idx:", idx)
    print("char:", popedom.prg_popedom[idx])
    print("returns:", popedom.prg_popedom[idx] == 'Y')
