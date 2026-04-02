#!/usr/bin/env python3
"""
Batch script to fix all datetime.utcnow() and datetime.now() usage in Flask routes.
This performs intelligent replacements while maintaining code structure.
"""

import os
import re
from pathlib import Path

# Define the fixes needed
FIXES = [
    {
        'pattern': r'from datetime import datetime',
        'replacement': 'from datetime import datetime, timezone',
        'description': 'Add timezone import'
    },
    {
        'pattern': r'datetime\.utcnow\(\)',
        'replacement': 'utc_now()',
        'description': 'Replace datetime.utcnow() with utc_now()'
    },
    {
        'pattern': r'datetime\.now\(\)',
        'replacement': 'utc_now()',
        'description': 'Replace datetime.now() with utc_now() (treats as UTC)'
    }
]

def add_tzutils_import(content):
    """Add tzutils import if not already present"""
    if 'from utils.tzutils import' in content:
        return content

    # Find the last import line
    lines = content.split('\n')
    last_import_idx = 0
    for i, line in enumerate(lines):
        if line.startswith('import ') or line.startswith('from '):
            last_import_idx = i

    # Add new import after last import
    insert_line = last_import_idx + 1
    lines.insert(insert_line, 'from utils.tzutils import utc_now, to_iso_string')

    return '\n'.join(lines)

def fix_file(filepath):
    """Fix timezone issues in a single file"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # Add tzutils import first
    content = add_tzutils_import(content)

    # Apply fixes
    for fix in FIXES:
        if fix['pattern'] in content or re.search(fix['pattern'], content):
            if 'import' in fix['description']:
                continue  # Skip import fix, already done
            content = re.sub(fix['pattern'], fix['replacement'], content)

    # Only write if changed
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def main():
    routes_dir = Path('./routes')
    fixed_count = 0
    skipped = []

    for filepath in sorted(routes_dir.glob('*.py')):
        if filepath.name == '__pycache__':
            continue

        try:
            if fix_file(filepath):
                print(f'✓ Fixed: {filepath.name}')
                fixed_count += 1
            else:
                skipped.append(filepath.name)
        except Exception as e:
            print(f'✗ Error fixing {filepath.name}: {e}')

    print(f'\n✅ Fixed {fixed_count} files')
    if skipped:
        print(f'⏭️  Skipped (no changes needed): {", ".join(skipped)}')

if __name__ == '__main__':
    main()
