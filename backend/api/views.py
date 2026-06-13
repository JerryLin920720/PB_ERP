"""
Deprecated compatibility layer.

New code must import views from:
api.modules.<module>.views

Do not define new ViewSets or API functions here.
"""

from .modules.ba.views import *
from .modules.dp.views import *
from .modules.mr.views import *
from .modules.sa.views import *
from .modules.es.views import *
from .modules.sys.views import *
from .modules.common.views import *
