with open('api/test_authz_permissions.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Restore the original core.authz.services import
content = content.replace("from api.modules.sys.views import (", "from core.authz.services import (")

# Remove build_permission_map and build_menu_tree from the core.authz.services import block
content = content.replace("    build_permission_map,\n", "")
content = content.replace("    build_menu_tree,\n", "")

# Add the import from sys.views
new_import = "from api.modules.sys.views import build_permission_map, build_menu_tree\n"
content = content.replace("class AuthzPermissionsTests(APITestCase):", new_import + "\nclass AuthzPermissionsTests(APITestCase):")

with open('api/test_authz_permissions.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed test imports!")
