import os
import py_compile
import sys

def check_dir(directory):
    errors = 0
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.py'):
                path = os.path.join(root, file)
                try:
                    py_compile.compile(path, doraise=True)
                except py_compile.PyCompileError as e:
                    print(f"Syntax Error in {path}:")
                    print(e)
                    errors += 1
    return errors

if __name__ == "__main__":
    total_errors = check_dir('server-flask')
    if total_errors > 0:
        sys.exit(1)
    else:
        print("All files passed syntax check.")
        sys.exit(0)
