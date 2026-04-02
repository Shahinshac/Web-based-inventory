#!/usr/bin/env python3
"""
Script to find all React components that need timestamp formatting updates
Run: python3 find_timestamp_issues.py
"""

import os
import re
from pathlib import Path

def find_timestamp_issues():
    """Find all React files with old date formatting"""
    web_app_path = Path('./../../web-app/client/src')

    patterns = [
        (r'toLocaleDateString\(', 'toLocaleDateString()'),
        (r'toLocaleString\(', 'toLocaleString()'),
        (r'new Date\([^)]+\)\.toLocal', 'new Date().toLocal...()'),
    ]

    issues = {}

    for jsx_file in web_app_path.rglob('*.jsx'):
        with open(jsx_file, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()

        for pattern, description in patterns:
            matches = re.findall(pattern, content)
            if matches:
                rel_path = str(jsx_file.relative_to(web_app_path))
                if rel_path not in issues:
                    issues[rel_path] = []
                issues[rel_path].append(f"{len(matches)}x {description}")

    if issues:
        print("React components needing timestamp formatting updates:\n")
        for file, problem_list in sorted(issues.items()):
            print(f"  {file}")
            for problem in problem_list:
                print(f"    - {problem}")
    else:
        print("✓ All React components have been updated!")

    return issues

if __name__ == '__main__':
    find_timestamp_issues()
