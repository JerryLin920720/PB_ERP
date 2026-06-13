import os
import re

BASE_DIR = '/Users/linjerry/Documents/youngnet/YNE-WEB-ERP/shoe-trading-v1/pb_erp_system/backend/api'

def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

serializers_path = os.path.join(BASE_DIR, 'serializers.py')
content = read_file(serializers_path)

def extract_class(name, text):
    # Regex to find class definition and all its content until the next class or end of file
    # This is a basic heuristic. A better way is using a simple line-by-line parser.
    lines = text.split('\n')
    extracted = []
    in_class = False
    indent = ""
    for line in lines:
        if line.startswith(f"class {name}(") or line.startswith(f"class {name}:"):
            in_class = True
            extracted.append(line)
            continue
        if in_class:
            if line.strip() == "" or line.startswith(" ") or line.startswith("\t"):
                extracted.append(line)
            elif not line.startswith(" ") and not line.startswith("\t") and not line.startswith("#"):
                # End of class
                break
    
    # Also extract any preceding decorators or specific imports if any
    # Here, for serializers, we just grab the class.
    return "\n".join(extracted)

# Let's do a better parser
def extract_blocks(names, text):
    lines = text.split('\n')
    blocks = {}
    current_block = None
    
    for i, line in enumerate(lines):
        match = re.match(r'^class\s+([A-Za-z0-9_]+)', line)
        if match:
            name = match.group(1)
            if name in names:
                current_block = name
                blocks[current_block] = [line]
                continue
            else:
                current_block = None
                
        if current_block:
            if line.strip() == "" or line.startswith(" ") or line.startswith("\t") or line.startswith("#"):
                blocks[current_block].append(line)
            elif line.startswith("import ") or line.startswith("from "):
                blocks[current_block].append(line) # sometimes imports are inside, but what if before?
            else:
                current_block = None
                
    # Also grab preceding imports like "import uuid" before SysAccountCreateSerializer
    # Manual patching
    for name in blocks:
        blocks[name] = "\n".join(blocks[name]).rstrip() + "\n"
    
    return blocks

es_names = ['Es101Serializer', 'Es102Serializer', 'Es103Serializer', 'Es104Serializer']
sys_names = ['SysAccountSerializer', 'SysAccountCreateSerializer', 'SysAccountUpdateSerializer', 
             'SysMenuSerializer', 'SysPopedomDescSerializer', 'SysMenuColumnSerializer', 
             'SysPopedomGroupSerializer', 'SysPopedomGroupCRUDSerializer', 'SysAccountsGroupSerializer', 
             'ActionPermissionItemSerializer', 'SavePermissionsSerializer', 'CopyPermissionsSerializer', 
             'ApplyGroupPermissionsSerializer', 'SysParameterSerializer']
ba_names = ['Ba085Serializer']
common_names = ['PhraseSerializer']
sa_names = ['Sa005Serializer']

all_names = es_names + sys_names + ba_names + common_names + sa_names

blocks = extract_blocks(all_names, content)

# Write to modules
def append_to_module(mod_dir, mod_file, file_content):
    os.makedirs(mod_dir, exist_ok=True)
    path = os.path.join(mod_dir, mod_file)
    if os.path.exists(path):
        existing = read_file(path)
        write_file(path, existing + "\n\n" + file_content)
    else:
        write_file(path, file_content)

# ES
es_content = "from rest_framework import serializers\nfrom api.modules.es.models import *\n\n"
for name in es_names:
    es_content += blocks.get(name, "") + "\n"
append_to_module(os.path.join(BASE_DIR, 'modules/es'), 'serializers.py', es_content)

# SYS
sys_content = "import uuid\nfrom django.contrib.auth.hashers import make_password\nfrom rest_framework import serializers\nfrom api.modules.sys.models import *\nfrom api.modules.es.models import Es101\n\n"
for name in sys_names:
    sys_content += blocks.get(name, "") + "\n"
append_to_module(os.path.join(BASE_DIR, 'modules/sys'), 'serializers.py', sys_content)

# BA
ba_content = "from rest_framework import serializers\nfrom api.modules.ba.models import *\n\n"
for name in ba_names:
    ba_content += blocks.get(name, "") + "\n"
append_to_module(os.path.join(BASE_DIR, 'modules/ba'), 'serializers.py', ba_content)

# COMMON
common_content = "from rest_framework import serializers\nfrom api.modules.common.models import *\n\n"
for name in common_names:
    common_content += blocks.get(name, "") + "\n"
append_to_module(os.path.join(BASE_DIR, 'modules/common'), 'serializers.py', common_content)

# SA
sa_content = "from rest_framework import serializers\nfrom api.modules.sa.models import *\n\n"
for name in sa_names:
    sa_content += blocks.get(name, "") + "\n"
append_to_module(os.path.join(BASE_DIR, 'modules/sa'), 'serializers.py', sa_content)

# Update root serializers.py
new_root = '''\"\"\"
Deprecated compatibility layer.

New code must import serializers from:
api.modules.<module>.serializers

Do not define new serializers here.
\"\"\"

from .modules.ba.serializers import *
from .modules.dp.serializers import *
from .modules.mr.serializers import *
from .modules.sa.serializers import *
from .modules.es.serializers import *
from .modules.sys.serializers import *
from .modules.common.serializers import *
'''
write_file(serializers_path, new_root)
print("Done serializers.")
