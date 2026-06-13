import re

with open('api/modules/dp/serializers.py', 'r', encoding='utf-8') as f:
    content = f.read()

# We need to extract the appended serializers and put them back in the correct order.
models = ['Dp033', 'Dp031', 'Dp032', 'Dp034', 'Dp035', 'Dp030', 'Dp040', 'Dp041', 'Dp042', 'Dp043']
serializers = [m + 'Serializer' for m in models]

# Find the end of Dp028Serializer.
dp028_pattern = re.compile(r'^class Dp028Serializer.*?^(?=class |\Z)', re.MULTILINE | re.DOTALL)
match = dp028_pattern.search(content)
dp028_end = match.end()

base_content = content[:dp028_end]
rest_content = content[dp028_end:]

classes = {}
for s in serializers:
    pattern = re.compile(r'^class ' + s + r'\b.*?^(?=class |\Z)', re.MULTILINE | re.DOTALL)
    match = pattern.search(rest_content)
    if match:
        classes[s] = match.group(0)

# Build new content
new_content = base_content + '\n'
for s in serializers:
    if s in classes:
        new_content += classes[s] + '\n'

with open('api/modules/dp/serializers.py', 'w', encoding='utf-8') as f:
    f.write(new_content)

