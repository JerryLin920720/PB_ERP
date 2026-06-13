import os
import re

TARGETS = [
    'Ba001', 'Ba015',
    'Dp010', 'Dp020', 'Dp025', 'Dp030', 'Dp032', 'Dp035', 'Dp040', 
    'Dp050', 'Dp055', 'Dp060', 'Dp065', 'Dp070', 'Dp075', 'Dp095',
    'Mr001', 'Mr002', 'Mr015', 'Mr020', 'Mr025', 'Mr030', 'Mr031'
]

results = {}

for target in TARGETS:
    results[target] = {
        'frontend': 'Not Found',
        'backend': 'Not Found',
        'pattern': 'Unknown',
        'frontend_features': [],
        'backend_features': [],
        'legacy_risks': []
    }

# Scan frontend
for root, _, files in os.walk('frontend/src/views'):
    for f in files:
        if f.endswith('Sheet.jsx'):
            mod = f.replace('Sheet.jsx', '')
            if mod in TARGETS:
                with open(os.path.join(root, f), 'r') as file:
                    content = file.read()
                    results[mod]['frontend'] = 'Found'
                    
                    if 'createRecordWorkbenchSheet' in content:
                        results[mod]['pattern'] = 'Pattern B (Factory)'
                    elif 'createDataWindowSheet' in content:
                        results[mod]['pattern'] = 'Pattern A (Factory)'
                    elif 'createDictSheet' in content:
                        results[mod]['pattern'] = 'Pattern A (Dict)'
                    elif 'Win32DataWindow' in content:
                        results[mod]['pattern'] = 'Pattern A'
                    elif 'RecordWorkbench' in content or 'useRecordWorkbenchCrud' in content:
                        results[mod]['pattern'] = 'Pattern B'
                    elif 'BaseSheet' in content or 'Custom' in content:
                        results[mod]['pattern'] = 'Custom/Legacy'
                    else:
                        results[mod]['pattern'] = 'Manual/Legacy'

                    features = []
                    if 'validationConfig' in content or 'ValidationConfig' in content: features.append('Validation')
                    if 'itemChangedRules' in content or 'ItemChanged' in content: features.append('ItemChanged')
                    if 'reportConfig' in content or 'ReportModal' in content: features.append('Report')
                    if 'toolbarConfig' in content: features.append('ToolbarConfig')
                    
                    if ('save(' in content or 'handleSave' in content) and 'Factory' not in results[mod]['pattern']:
                        results[mod]['legacy_risks'].append('Hand-written Save')
                            
                    results[mod]['frontend_features'] = features

# Scan backend
backend_dir = 'backend/api/modules'
for root, _, files in os.walk(backend_dir):
    for f in files:
        if f == 'views.py':
            with open(os.path.join(root, f), 'r') as file:
                content = file.read()
                
                classes = re.split(r'^class ', content, flags=re.MULTILINE)
                for cls_block in classes:
                    if not cls_block.strip(): continue
                    cls_name_match = re.match(r'(\w+ViewSet)\((.*?)\):', cls_block)
                    if cls_name_match:
                        cls_name = cls_name_match.group(1)
                        bases = cls_name_match.group(2)
                        
                        target = cls_name.replace('ViewSet', '')
                        if target in TARGETS:
                            results[target]['backend'] = 'Found'
                            b_features = []
                            if 'ApprovalMixin' in bases: b_features.append('Approval')
                            if 'BillNoMixin' in bases: b_features.append('BillNo')
                            if 'ValidationMixin' in bases: b_features.append('Validation')
                            if 'DeepSaveMixinV2' in bases: b_features.append('DeepSaveV2')
                            if 'DataConstraint' in bases or 'DataConstraint' in cls_block:
                                b_features.append('DataConstraint')
                            
                            results[target]['backend_features'] = b_features
                            
                            if 'def deep_save' in cls_block and 'DeepSaveMixinV2' not in bases:
                                results[target]['legacy_risks'].append('Hand-written deep_save')
                            if 'legacy_deep_save' in cls_block:
                                results[target]['legacy_risks'].append('Has legacy_deep_save')
                            if 'def bulk_save' in cls_block:
                                results[target]['legacy_risks'].append('Hand-written bulk_save')

import json
print(json.dumps(results, indent=2))

