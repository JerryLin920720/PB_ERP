import os, django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()
from api.models import Es101
print([f.name for f in Es101._meta.fields])
