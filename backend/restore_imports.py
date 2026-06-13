with open('api/views.py', 'r') as f:
    lines = f.readlines()

imports = """from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.exceptions import ValidationError
from rest_framework.decorators import parser_classes
import os
import uuid
from django.db import DatabaseError
"""

# Find the first line after standard imports to inject these
for i, line in enumerate(lines):
    if line.startswith('class '):
        insert_idx = i
        break

lines.insert(insert_idx, imports)

with open('api/views.py', 'w') as f:
    f.writelines(lines)
