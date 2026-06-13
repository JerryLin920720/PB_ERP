import os, django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()
from api.models import SysPopedom, SysAccount, SysPopedomDesc
from core.authz.services import has_program_permission
acc = SysAccount.objects.get(accounts_id='user_new')
print("SysPopedom:", SysPopedom.objects.filter(accounts_id='user_new', obj_name='w_dp030', flag='10').values())
print("SysPopedomDesc:", list(SysPopedomDesc.objects.filter(obj_name='w_dp030').values('popedom_id', 'popedom_index')))
print("has check:", has_program_permission(acc, 'w_dp030', 'check', strict_backend=True))
print("has new:", has_program_permission(acc, 'w_dp030', 'new', strict_backend=True))
print("has edit:", has_program_permission(acc, 'w_dp030', 'edit', strict_backend=True))
