import os, django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from api.modules.dp.serializers import Dp030Serializer
print(list(Dp030Serializer().fields.keys()))
