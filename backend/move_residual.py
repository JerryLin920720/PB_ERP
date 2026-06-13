import os

BASE_DIR = '/Users/linjerry/Documents/youngnet/YNE-WEB-ERP/shoe-trading-v1/pb_erp_system/backend/api'

def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

# 1. Update common/models.py
common_models_path = os.path.join(BASE_DIR, 'modules/common/models.py')
common_models = read_file(common_models_path)
common_models = common_models.replace('from api.models import generate_pb_gkey\n', '')

gkey_func = """
from django.utils import timezone
import random

def generate_pb_gkey():
    \"\"\"
    Python 模擬 PowerBuilder 原生 f_gkey()：
    格式: yymmddhhmmss + 3碼隨機/進程ID + 4碼遞增ID + 'A' = 20碼
    \"\"\"
    now = timezone.localtime(timezone.now())
    # yymmddhhmmss (12 chars)
    time_str = now.strftime("%y%m%d%H%M%S")
    # 隨機 3碼
    spid_str = f"{random.randint(0, 999):03d}"
    # 隨機 4碼
    seq_str = f"{random.randint(1, 9999):04d}"
    
    gkey = f"{time_str}{spid_str}{seq_str}A"
    return gkey
"""

if 'def generate_pb_gkey():' not in common_models:
    common_models = common_models.replace('from django.db import models\n', 'from django.db import models\n' + gkey_func)
write_file(common_models_path, common_models)
print("Updated common/models.py")

# 2. Rewrite root models.py
models_path = os.path.join(BASE_DIR, 'models.py')
new_models = '''\"\"\"
Deprecated compatibility layer.

New code must import models from:
api.modules.<module>.models

Do not define new models here.
\"\"\"

from .modules.ba.models import *
from .modules.dp.models import *
from .modules.mr.models import *
from .modules.sa.models import *
from .modules.es.models import *
from .modules.sys.models import *
from .modules.common.models import *
'''
write_file(models_path, new_models)
print("Updated models.py")
