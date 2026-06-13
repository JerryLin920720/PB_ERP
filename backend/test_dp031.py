import os, django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()
from api.models import Dp031
print([f.name for f in Dp031._meta.fields])
