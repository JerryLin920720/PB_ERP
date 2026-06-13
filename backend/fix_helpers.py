import re

core_path = 'core/authz/services.py'
sys_path = 'api/modules/sys/views.py'
dp_path = 'api/modules/dp/views.py'

# 1. Read core/authz/services.py
with open(core_path, 'r', encoding='utf-8') as f:
    core_content = f.read()

# Extract build_permission_map
m_perm = re.search(r'^def build_permission_map\(account\) -> dict:.*?(?=^def |\Z)', core_content, re.MULTILINE | re.DOTALL)
build_perm_code = m_perm.group(0)
core_content = core_content.replace(build_perm_code, '')

# Extract build_menu_tree
m_menu = re.search(r'^def build_menu_tree\(account\) -> list:.*?(?=^def |\Z)', core_content, re.MULTILINE | re.DOTALL)
build_menu_code = m_menu.group(0)
core_content = core_content.replace(build_menu_code, '')

# Write back core
with open(core_path, 'w', encoding='utf-8') as f:
    f.write(core_content)

# 2. Append to sys/views.py
with open(sys_path, 'r', encoding='utf-8') as f:
    sys_content = f.read()

helpers = f"\n\n{build_perm_code}\n{build_menu_code}\n"
sys_content += helpers

# Add required imports to top of sys/views.py
sys_imports = "from collections import defaultdict\nfrom core.authz.services import is_admin\n"
sys_content = sys_imports + sys_content

with open(sys_path, 'w', encoding='utf-8') as f:
    f.write(sys_content)

# 3. Clean up dp/views.py
with open(dp_path, 'r', encoding='utf-8') as f:
    dp_content = f.read()

dp_content = re.sub(r'from core\.authz\.services import build_permission_map, build_menu_tree\n?', '', dp_content)

with open(dp_path, 'w', encoding='utf-8') as f:
    f.write(dp_content)

print("Helpers moved!")
