import os, django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from api.models import Dp030, Dp031, SysPopedom, SysConstraint, Es101, SysAccount
print("DP030 Master Count:", Dp030.objects.count())
print("DP031 Detail Count:", Dp031.objects.count())
print("SysPopedom w_dp030:", SysPopedom.objects.filter(obj_name='w_dp030').count())
print("SysConstraint w_dp030:", SysConstraint.objects.filter(obj_name='w_dp030').count())
