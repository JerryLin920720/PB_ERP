"""
Deprecated compatibility layer.

New code must import serializers from:
api.modules.<module>.serializers

Do not define new serializers here.
"""

from .modules.ba.serializers import *
from .modules.dp.serializers import *
from .modules.mr.serializers import *
from .modules.sa.serializers import *
from .modules.es.serializers import *
from .modules.sys.serializers import *
from .modules.common.serializers import *
