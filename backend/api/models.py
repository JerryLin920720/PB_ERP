"""
Deprecated compatibility layer.

New code must import models from:
api.modules.<module>.models

Do not define new models here.
"""

from .modules.ba.models import *
from .modules.dp.models import *
from .modules.mr.models import *
from .modules.sa.models import *
from .modules.es.models import *
from .modules.sys.models import *
from .modules.common.models import *
