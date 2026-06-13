import os
import re

BASE_DIR = '/Users/linjerry/Documents/youngnet/YNE-WEB-ERP/shoe-trading-v1/pb_erp_system/backend/api'
urls_path = os.path.join(BASE_DIR, 'urls.py')

with open(urls_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find all views.Something
used_views = set(re.findall(r'views\.([A-Za-z0-9_]+)', content))

# Now scan api/modules/ to find which module defines each
module_map = {} # { view_name: 'api.modules.xx.views' }
modules_dir = os.path.join(BASE_DIR, 'modules')

for root, dirs, files in os.walk(modules_dir):
    if 'views.py' in files:
        filepath = os.path.join(root, 'views.py')
        rel_path = os.path.relpath(root, BASE_DIR) # e.g. modules/dp
        import_path = 'api.' + rel_path.replace(os.sep, '.') + '.views'
        
        with open(filepath, 'r', encoding='utf-8') as f:
            view_content = f.read()
            
        for view_name in used_views:
            # check if defined as class view_name or def view_name
            if re.search(r'^class\s+' + view_name + r'\b', view_content, re.M) or \
               re.search(r'^def\s+' + view_name + r'\b', view_content, re.M):
                module_map[view_name] = import_path

# Replace in content
new_content = content.replace('from . import views\n', '')
for view_name in used_views:
    new_content = new_content.replace(f'views.{view_name}', view_name)

# Generate imports
imports_by_module = {}
for view_name, mod in module_map.items():
    imports_by_module.setdefault(mod, []).append(view_name)

import_lines = []
for mod, views in sorted(imports_by_module.items()):
    views_str = ",\n    ".join(sorted(views))
    import_lines.append(f"from {mod} import (\n    {views_str}\n)")

# Insert imports after DefaultRouter
import_block = "\n".join(import_lines) + "\n\n"
new_content = new_content.replace('from rest_framework.routers import DefaultRouter\n', 'from rest_framework.routers import DefaultRouter\n' + import_block)

with open(urls_path, 'w', encoding='utf-8') as f:
    f.write(new_content)
    
print("Updated URLs!")
for v in used_views:
    if v not in module_map:
        print(f"Warning: {v} not found in modules!")
