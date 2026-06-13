import os
import re

BASE_DIR = '/Users/linjerry/Documents/youngnet/YNE-WEB-ERP/shoe-trading-v1/pb_erp_system/backend/api'

def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

views_path = os.path.join(BASE_DIR, 'views.py')
content = read_file(views_path)

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

def extract_classes(names, text):
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
            if line.strip() == "" or line.startswith(" ") or line.startswith("\t") or line.startswith("#") or line.startswith("@"):
                blocks[current_block].append(line)
            else:
                current_block = None
                
    for name in blocks:
        blocks[name] = "\n".join(blocks[name]).rstrip() + "\n"
    
    return blocks

# Common Views
common_func_names = ['system_health', 'dashboard_stats', 'upload_image']
common_class_names = ['BaseDictionaryViewSet']

# Sys Views
sys_func_names = ['auth_permission_matrix', 'auth_save_permissions', 'auth_copy_permissions', 'auth_apply_group_permissions']
sys_class_names = ['SysAccountViewSet', 'SysParameterViewSet', 'SysMenuViewSet', 'SysPopedomDescViewSet', 'SysMenuColumnViewSet']

# ES Views
es_class_names = ['Es101ViewSet', 'Es102ViewSet', 'Es103ViewSet', 'Es104ViewSet']

# BA Views
ba_class_names = ['Ba085ViewSet']

# SA Views
sa_class_names = ['Sa005ViewSet']

# DP055 Helpers
dp_func_names = ['_dp055_to_decimal', 'get_cost_parameter', 'get_nutax_parameter', '_recalculate_dp032_row', '_recalculate_total_fob', '_build_workbench_response']

extracted_funcs = extract_functions(common_func_names + sys_func_names + dp_func_names, content)
extracted_classes = extract_classes(common_class_names + sys_class_names + es_class_names + ba_class_names + sa_class_names, content)

def append_to_module(mod_dir, mod_file, file_content):
    os.makedirs(mod_dir, exist_ok=True)
    path = os.path.join(mod_dir, mod_file)
    if os.path.exists(path):
        existing = read_file(path)
        write_file(path, existing + "\n\n" + file_content)
    else:
        write_file(path, file_content)

# DP055 Costing Service
dp_service_content = """from decimal import Decimal, InvalidOperation
from django.utils import timezone as tz_utils

"""
for name in dp_func_names:
    dp_service_content += extracted_funcs.get(name, "") + "\n"
append_to_module(os.path.join(BASE_DIR, 'modules/dp/services'), 'dp055_costing_service.py', dp_service_content)
# Also create __init__.py
open(os.path.join(BASE_DIR, 'modules/dp/services/__init__.py'), 'a').close()

# COMMON views
common_content = """from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.response import Response
from rest_framework import status, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
import os
import uuid
from api.common.mixins.audit import AuditFieldsMixin
from api.common.mixins.bulk_save import BulkSaveMixin
from api.common.mixins.validation import ValidationMixin

"""
for name in common_class_names:
    common_content += extracted_classes.get(name, "") + "\n"
for name in common_func_names:
    common_content += extracted_funcs.get(name, "") + "\n"
append_to_module(os.path.join(BASE_DIR, 'modules/common'), 'views.py', common_content)

# SYS views
sys_content = """from rest_framework import viewsets, mixins, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from api.common.permissions.program_permission import HasProgramPermission, HasSy005Permission
from django.shortcuts import get_object_or_404
from django.db import transaction
from api.modules.sys.models import *
from api.modules.sys.serializers import *
from api.modules.common.views import BaseDictionaryViewSet
from api.services.permission_matrix_service import PermissionMatrixService

"""
for name in sys_class_names:
    sys_content += extracted_classes.get(name, "") + "\n"
for name in sys_func_names:
    sys_content += extracted_funcs.get(name, "") + "\n"
append_to_module(os.path.join(BASE_DIR, 'modules/sys'), 'views.py', sys_content)

# ES views
es_content = """from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from api.modules.es.models import *
from api.modules.es.serializers import *

"""
for name in es_class_names:
    es_content += extracted_classes.get(name, "") + "\n"
append_to_module(os.path.join(BASE_DIR, 'modules/es'), 'views.py', es_content)

# BA views
ba_content = """from rest_framework import viewsets
from django.db.models import Max
from api.modules.ba.models import *
from api.modules.ba.serializers import *

"""
for name in ba_class_names:
    ba_content += extracted_classes.get(name, "") + "\n"
append_to_module(os.path.join(BASE_DIR, 'modules/ba'), 'views.py', ba_content)

# SA views
sa_content = """from rest_framework import viewsets
from api.modules.sa.models import *
from api.modules.sa.serializers import *
from api.modules.common.views import BaseDictionaryViewSet

"""
for name in sa_class_names:
    sa_content += extracted_classes.get(name, "") + "\n"
append_to_module(os.path.join(BASE_DIR, 'modules/sa'), 'views.py', sa_content)

# Rewrite root views.py
new_root_views = '''\"\"\"
Deprecated compatibility layer.

New code must import views from:
api.modules.<module>.views

Do not define new ViewSets or API functions here.
\"\"\"

from .modules.ba.views import *
from .modules.dp.views import *
from .modules.mr.views import *
from .modules.sa.views import *
from .modules.es.views import *
from .modules.sys.views import *
from .modules.common.views import *
'''
write_file(views_path, new_root_views)
print("Done views.")
