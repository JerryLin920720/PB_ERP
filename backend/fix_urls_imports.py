import re

with open('api/urls.py', 'r', encoding='utf-8') as f:
    content = f.read()

auth_funcs = [
    'auth_login', 'auth_logout', 'auth_me', 'auth_users', 'auth_permissions', 
    'auth_menu', 'auth_user_detail', 'auth_user_disable', 'auth_user_enable', 
    'auth_groups', 'auth_group_detail', 'auth_user_groups'
]

# Find the sys import block
# from api.modules.sys.views import ( ... )
sys_match = re.search(r'from api\.modules\.sys\.views import \((.*?)\)', content, re.DOTALL)
sys_imports = [i.strip() for i in sys_match.group(1).split(',') if i.strip()]

# Find the dp import block
dp_match = re.search(r'from api\.modules\.dp\.views import \((.*?)\)', content, re.DOTALL)
dp_imports = [i.strip() for i in dp_match.group(1).split(',') if i.strip()]

# Remove auth from dp and add to sys
new_dp_imports = [i for i in dp_imports if i not in auth_funcs]
new_sys_imports = list(set(sys_imports + auth_funcs))

# Format them nicely
new_dp_str = ",\n    ".join(sorted(new_dp_imports))
new_sys_str = ",\n    ".join(sorted(new_sys_imports))

new_dp_block = f"from api.modules.dp.views import (\n    {new_dp_str}\n)"
new_sys_block = f"from api.modules.sys.views import (\n    {new_sys_str}\n)"

content = content[:dp_match.start()] + new_dp_block + content[dp_match.end():]
# Need to find sys_match again because indexes changed
sys_match2 = re.search(r'from api\.modules\.sys\.views import \((.*?)\)', content, re.DOTALL)
content = content[:sys_match2.start()] + new_sys_block + content[sys_match2.end():]

with open('api/urls.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("urls.py updated correctly!")
