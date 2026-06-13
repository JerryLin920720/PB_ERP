import re

dp_path = 'api/modules/dp/views.py'
sys_path = 'api/modules/sys/views.py'

with open(dp_path, 'r', encoding='utf-8') as f:
    dp_content = f.read()

funcs = ['_get_sys_account', '_get_user_info_response']
extracted = []

for func in funcs:
    # simple extraction, assuming they are just defs not classes
    match = re.search(r'^def ' + func + r'\(.*?\):.*?(?=(^def |^class |\Z))', dp_content, re.MULTILINE | re.DOTALL)
    if match:
        extracted.append(match.group(0))
        dp_content = dp_content.replace(match.group(0), '')

with open(dp_path, 'w', encoding='utf-8') as f:
    f.write(dp_content)

sys_imports = """
from django.utils import timezone
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from django.db.models import Q
from api.modules.common.models import generate_pb_gkey
"""

with open(sys_path, 'a', encoding='utf-8') as f:
    f.write("\n" + "\n".join(extracted))

with open(sys_path, 'r', encoding='utf-8') as f:
    sys_content = f.read()

sys_content = sys_imports + "\n" + sys_content

with open(sys_path, 'w', encoding='utf-8') as f:
    f.write(sys_content)

print("Moved helpers and added imports!")
