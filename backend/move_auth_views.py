import os
import re

BASE_DIR = '/Users/linjerry/Documents/youngnet/YNE-WEB-ERP/shoe-trading-v1/pb_erp_system/backend/api/modules'
dp_views_path = os.path.join(BASE_DIR, 'dp/views.py')
sys_views_path = os.path.join(BASE_DIR, 'sys/views.py')
urls_path = os.path.join(BASE_DIR, '../urls.py')

with open(dp_views_path, 'r', encoding='utf-8') as f:
    dp_content = f.read()
    
with open(sys_views_path, 'r', encoding='utf-8') as f:
    sys_content = f.read()

# Target functions to move
auth_funcs = [
    'auth_login',
    'auth_logout',
    'auth_me',
    'auth_users',
    'auth_permissions',
    'auth_menu',
    'auth_user_detail',
    'auth_user_disable',
    'auth_user_enable',
    'auth_groups',
    'auth_group_detail',
    'auth_user_groups'
]

def extract_functions(names, text):
    lines = text.split('\n')
    blocks = {}
    current_block = None
    
    for i, line in enumerate(lines):
        match = re.match(r'^def\s+([A-Za-z0-9_]+)', line)
        if match:
            name = match.group(1)
            if name in names:
                current_block = name
                blocks[current_block] = []
                # Include preceding decorators
                j = i - 1
                while j >= 0 and lines[j].startswith('@'):
                    blocks[current_block].insert(0, lines[j])
                    j -= 1
                blocks[current_block].append(line)
                continue
            else:
                current_block = None
                
        if current_block:
            if line.strip() == "" or line.startswith(" ") or line.startswith("\t") or line.startswith("#"):
                blocks[current_block].append(line)
            else:
                current_block = None
                
    for name in blocks:
        blocks[name] = "\n".join(blocks[name]).rstrip() + "\n"
    
    return blocks

extracted_funcs = extract_functions(auth_funcs, dp_content)

# Remove these functions from dp_content
for name, block in extracted_funcs.items():
    dp_content = dp_content.replace(block, '')

# Now append to sys_views
sys_append = "\n\n" + "\n\n".join(extracted_funcs.values()) + "\n"
sys_content += sys_append

# Import adjustments in sys_views
sys_imports = """
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from core.authz.services import AuthService, PermissionMatrixService
from api.modules.sys.serializers import *
from django.contrib.auth import logout
"""
if "AuthService" not in sys_content:
    sys_content = sys_imports + sys_content

with open(dp_views_path, 'w', encoding='utf-8') as f:
    f.write(dp_content)

with open(sys_views_path, 'w', encoding='utf-8') as f:
    f.write(sys_content)

# Now update urls.py
with open(urls_path, 'r', encoding='utf-8') as f:
    urls_content = f.read()

# The import block in urls.py currently says:
# from api.modules.dp.views import ( ... auth_login, auth_logout ... )
# We need to move them to sys.views import block

for func in auth_funcs:
    # Remove from dp.views import
    urls_content = re.sub(r'\b' + func + r'\b,?\s*', '', urls_content)

# They might leave trailing commas or empty lines, we will fix the block manually if needed.
# Let's rebuild the imports properly.
# Actually, the user script `update_urls.py` can be re-run! Let's just do that instead of manually fixing urls_content here.

print("Moved functions from dp to sys!")
