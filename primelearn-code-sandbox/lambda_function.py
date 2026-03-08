import json
import sys
import io
import re
import os
import signal
import traceback
import subprocess
import sqlite3
import tempfile

CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
}

MAX_EXEC_TIME = 10
MAX_OUTPUT_SIZE = 10000

BLOCKED_IMPORTS = {
    'os', 'sys', 'subprocess', 'shutil', 'socket', 'http', 'urllib',
    'requests', 'pathlib', 'glob', 'signal', 'ctypes', 'importlib',
    'code', 'pickle', 'shelve', 'tempfile', 'webbrowser', 'multiprocessing',
    'threading', 'asyncio', 'concurrent', 'pty', 'resource',
}


def respond(status_code, body):
    return {
        "statusCode": status_code,
        "headers": CORS_HEADERS,
        "body": json.dumps(body)
    }

def get_body(event):
    if not event.get('body'):
        return {}
    return json.loads(event['body']) if isinstance(event['body'], str) else event['body']


def validate_code(code):
    """Pre-execution static analysis to block dangerous patterns."""
    dangerous_patterns = [
        '__import__', '__builtins__', '__subclasses__', '__globals__',
        '__code__', '__class__', '__bases__', '__mro__',
        'eval(', 'exec(', 'compile(', 'open(', 'file(',
        'getattr(', 'setattr(', 'delattr(',
        'globals(', 'locals(', 'vars(',
        'breakpoint(', '__dict__', '__spec__',
    ]
    code_lower = code.lower()
    for pattern in dangerous_patterns:
        if pattern.lower() in code_lower:
            return False, f"Security: '{pattern}' is not allowed in the sandbox."

    import_matches = re.findall(r'(?:^|\n)\s*(?:import|from)\s+(\w+)', code)
    for mod in import_matches:
        if mod in BLOCKED_IMPORTS:
            return False, f"Security: importing '{mod}' is not allowed in the sandbox."

    return True, None


def timeout_handler(signum, frame):
    raise TimeoutError("Code execution timed out (max 10 seconds)")


def execute_python(code):
    """Execute Python code with restricted builtins, timeout, and output capture."""
    is_valid, error_msg = validate_code(code)
    if not is_valid:
        return {"success": False, "output": "", "error": error_msg}

    output_buffer = io.StringIO()

    safe_builtins = {
        'print': print, 'range': range, 'len': len, 'int': int, 'float': float,
        'str': str, 'bool': bool, 'list': list, 'dict': dict, 'set': set,
        'tuple': tuple, 'enumerate': enumerate, 'zip': zip, 'map': map,
        'filter': filter, 'sorted': sorted, 'reversed': reversed,
        'sum': sum, 'min': min, 'max': max, 'abs': abs, 'round': round,
        'isinstance': isinstance, 'type': type, 'input': lambda *a: '',
        'True': True, 'False': False, 'None': None,
        'chr': chr, 'ord': ord, 'hex': hex, 'bin': bin, 'oct': oct,
        'all': all, 'any': any, 'hash': hash, 'repr': repr,
        'format': format, 'pow': pow, 'divmod': divmod,
        'slice': slice, 'iter': iter, 'next': next,
        'StopIteration': StopIteration, 'ValueError': ValueError,
        'TypeError': TypeError, 'KeyError': KeyError, 'IndexError': IndexError,
        'RuntimeError': RuntimeError, 'Exception': Exception,
        'ZeroDivisionError': ZeroDivisionError, 'AttributeError': AttributeError,
    }

    safe_globals = {"__builtins__": safe_builtins}

    # Pre-import safe standard library modules
    import math, random, string, collections, itertools, functools
    import re as re_mod
    import datetime as dt_mod
    import json as json_mod

    safe_globals.update({
        'math': math, 'random': random, 'string': string,
        'collections': collections, 'itertools': itertools,
        'functools': functools, 're': re_mod,
        'datetime': dt_mod, 'json': json_mod,
    })

    error_output = None
    success = False

    # Set timeout on Linux/Lambda
    has_alarm = False
    try:
        old_handler = signal.signal(signal.SIGALRM, timeout_handler)
        signal.alarm(MAX_EXEC_TIME)
        has_alarm = True
    except (AttributeError, OSError):
        pass

    old_stdout, old_stderr = sys.stdout, sys.stderr
    sys.stdout = output_buffer
    sys.stderr = output_buffer

    try:
        exec(code, safe_globals)
        success = True
    except TimeoutError as e:
        error_output = str(e)
    except Exception:
        error_output = traceback.format_exc()
    finally:
        sys.stdout = old_stdout
        sys.stderr = old_stderr
        if has_alarm:
            signal.alarm(0)
            signal.signal(signal.SIGALRM, old_handler)

    stdout = output_buffer.getvalue()
    if len(stdout) > MAX_OUTPUT_SIZE:
        stdout = stdout[:MAX_OUTPUT_SIZE] + "\n... [Output truncated at 10,000 characters]"

    return {"success": success, "output": stdout, "error": error_output}


def execute_sql(code):
    """Execute SQL queries against an in-memory SQLite database with sample tables."""
    try:
        conn = sqlite3.connect(':memory:')
        cursor = conn.cursor()

        # Create sample tables so learners can practice
        cursor.executescript("""
            CREATE TABLE Students (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                age INTEGER,
                grade TEXT
            );
            INSERT INTO Students VALUES (1, 'Alice', 20, 'A');
            INSERT INTO Students VALUES (2, 'Bob', 17, 'B');
            INSERT INTO Students VALUES (3, 'Charlie', 19, 'A');
            INSERT INTO Students VALUES (4, 'Diana', 16, 'C');
            INSERT INTO Students VALUES (5, 'Eve', 22, 'A');
            INSERT INTO Students VALUES (6, 'Frank', 18, 'B');

            CREATE TABLE Employees (
                emp_id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                department TEXT,
                salary INTEGER
            );
            INSERT INTO Employees VALUES (1, 'Alice', 'Engineering', 80000);
            INSERT INTO Employees VALUES (2, 'Bob', 'Sales', 50000);
            INSERT INTO Employees VALUES (3, 'Carol', 'Engineering', 90000);
            INSERT INTO Employees VALUES (4, 'Dave', 'Sales', 45000);
            INSERT INTO Employees VALUES (5, 'Eve', 'HR', 55000);
            INSERT INTO Employees VALUES (6, 'Frank', 'Engineering', 75000);

            CREATE TABLE Customers (
                customer_id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                city TEXT
            );
            INSERT INTO Customers VALUES (1, 'Alice', 'Mumbai');
            INSERT INTO Customers VALUES (2, 'Bob', 'Delhi');
            INSERT INTO Customers VALUES (3, 'Carol', 'Bangalore');

            CREATE TABLE Orders (
                order_id INTEGER PRIMARY KEY,
                customer_id INTEGER,
                product TEXT,
                amount INTEGER,
                FOREIGN KEY (customer_id) REFERENCES Customers(customer_id)
            );
            INSERT INTO Orders VALUES (101, 1, 'Laptop', 50000);
            INSERT INTO Orders VALUES (102, 1, 'Mouse', 500);
            INSERT INTO Orders VALUES (103, 2, 'Phone', 20000);

            CREATE TABLE Users (
                id INTEGER PRIMARY KEY,
                email TEXT
            );
            INSERT INTO Users VALUES (1, 'a@example.com');
            INSERT INTO Users VALUES (2, 'b@example.com');
            INSERT INTO Users VALUES (3, 'a@example.com');

            CREATE TABLE Scores (
                student_id INTEGER PRIMARY KEY,
                name TEXT,
                subject TEXT,
                score INTEGER
            );
            INSERT INTO Scores VALUES (1, 'Alice', 'Math', 95);
            INSERT INTO Scores VALUES (2, 'Bob', 'Math', 87);
            INSERT INTO Scores VALUES (3, 'Carol', 'Math', 95);
            INSERT INTO Scores VALUES (4, 'Alice', 'Science', 88);
            INSERT INTO Scores VALUES (5, 'Bob', 'Science', 92);
        """)

        # Strip comments, then split into statements
        lines_no_comments = [l for l in code.split('\n') if not l.strip().startswith('--')]
        clean_code = '\n'.join(lines_no_comments)
        statements = [s.strip() for s in clean_code.split(';') if s.strip()]

        output_lines = []
        for stmt in statements:
            if not stmt.strip():
                continue

            cursor.execute(stmt)

            if cursor.description:  # SELECT query — has results
                cols = [desc[0] for desc in cursor.description]
                rows = cursor.fetchall()

                # Format as table
                col_widths = [len(c) for c in cols]
                for row in rows:
                    for i, val in enumerate(row):
                        col_widths[i] = max(col_widths[i], len(str(val)))

                header = ' | '.join(c.ljust(col_widths[i]) for i, c in enumerate(cols))
                separator = '-+-'.join('-' * w for w in col_widths)
                output_lines.append(header)
                output_lines.append(separator)
                for row in rows:
                    output_lines.append(' | '.join(str(v).ljust(col_widths[i]) for i, v in enumerate(row)))

                output_lines.append(f"\n({len(rows)} row{'s' if len(rows) != 1 else ''})")
            else:
                affected = cursor.rowcount
                if affected >= 0:
                    output_lines.append(f"Query OK, {affected} row(s) affected.")

        conn.commit()
        conn.close()

        output = '\n'.join(output_lines)
        if not output.strip():
            output = "Query executed successfully (no output)."

        return {"success": True, "output": output, "error": None}

    except Exception as e:
        return {"success": False, "output": "", "error": f"SQL Error: {str(e)}"}


def execute_compiled(code, language):
    """Execute C, C++, or Java code via subprocess compilation and run."""
    tmp_dir = tempfile.mkdtemp(prefix='sandbox_')
    try:
        if language == 'c':
            src_file = os.path.join(tmp_dir, 'main.c')
            out_file = os.path.join(tmp_dir, 'main')
            with open(src_file, 'w') as f:
                f.write(code)
            # Compile
            comp = subprocess.run(
                ['gcc', src_file, '-o', out_file, '-lm'],
                capture_output=True, text=True, timeout=MAX_EXEC_TIME
            )
            if comp.returncode != 0:
                return {"success": False, "output": "", "error": f"Compilation Error:\n{comp.stderr}"}
            # Run
            run = subprocess.run(
                [out_file], capture_output=True, text=True, timeout=MAX_EXEC_TIME
            )

        elif language == 'cpp':
            src_file = os.path.join(tmp_dir, 'main.cpp')
            out_file = os.path.join(tmp_dir, 'main')
            with open(src_file, 'w') as f:
                f.write(code)
            comp = subprocess.run(
                ['g++', src_file, '-o', out_file, '-std=c++17'],
                capture_output=True, text=True, timeout=MAX_EXEC_TIME
            )
            if comp.returncode != 0:
                return {"success": False, "output": "", "error": f"Compilation Error:\n{comp.stderr}"}
            run = subprocess.run(
                [out_file], capture_output=True, text=True, timeout=MAX_EXEC_TIME
            )

        elif language == 'java':
            src_file = os.path.join(tmp_dir, 'Main.java')
            with open(src_file, 'w') as f:
                f.write(code)
            comp = subprocess.run(
                ['javac', src_file],
                capture_output=True, text=True, timeout=MAX_EXEC_TIME
            )
            if comp.returncode != 0:
                return {"success": False, "output": "", "error": f"Compilation Error:\n{comp.stderr}"}
            run = subprocess.run(
                ['java', '-cp', tmp_dir, 'Main'],
                capture_output=True, text=True, timeout=MAX_EXEC_TIME
            )
        else:
            return {"success": False, "output": "", "error": f"Unsupported compiled language: {language}"}

        output = run.stdout
        if len(output) > MAX_OUTPUT_SIZE:
            output = output[:MAX_OUTPUT_SIZE] + "\n... [Output truncated]"

        if run.returncode != 0:
            return {"success": False, "output": output, "error": f"Runtime Error:\n{run.stderr}"}

        return {"success": True, "output": output, "error": None}

    except subprocess.TimeoutExpired:
        return {"success": False, "output": "", "error": "Code execution timed out (max 10 seconds)"}
    except FileNotFoundError as e:
        compiler = 'gcc' if language == 'c' else 'g++' if language == 'cpp' else 'javac'
        return {"success": False, "output": "", "error": f"Compiler '{compiler}' not available in this environment. Try Python or SQL."}
    except Exception as e:
        return {"success": False, "output": "", "error": str(e)}
    finally:
        # Cleanup
        import shutil
        shutil.rmtree(tmp_dir, ignore_errors=True)


def handle_execute(event):
    body = get_body(event)
    code = body.get('code')
    language = body.get('language', 'python').lower()

    if not code:
        return respond(400, {"error": "code is required"})
    if not code.strip():
        return respond(200, {"success": True, "output": "", "error": None})

    if language == 'python':
        result = execute_python(code)
    elif language == 'sql':
        result = execute_sql(code)
    elif language in ('c', 'cpp', 'java'):
        result = execute_compiled(code, language)
    else:
        result = {
            "success": False, "output": "",
            "error": f"Language '{language}' is not supported. Available: python, sql, c, cpp, java"
        }

    return respond(200, result)


def lambda_handler(event, context):
    http_method = event.get('httpMethod') or event.get('requestContext', {}).get('http', {}).get('method', '')
    if http_method == 'OPTIONS':
        return respond(200, {})

    try:
        path = event.get('resource') or event.get('rawPath', '')
        if http_method == 'POST' and path.endswith('/code/execute'):
            return handle_execute(event)
        return respond(404, {"error": f"Route not found: {http_method} {path}"})
    except Exception as e:
        print(f"Error: {str(e)}")
        return respond(500, {"error": "Internal server error", "details": str(e)})
