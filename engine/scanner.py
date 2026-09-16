import os
import ast
import re
import hashlib
from typing import List, Dict, Any

def get_relative_path(root_path: str, absolute_path: str) -> str:
    """Get the relative path of a file with forward slashes for cross-platform safety."""
    rel = os.path.relpath(absolute_path, root_path)
    return rel.replace("\\", "/")

class PythonSymbolExtractor(ast.NodeVisitor):
    def __init__(self, relative_path: str):
        self.relative_path = relative_path
        self.symbols = []
        self.imports = []

    def visit_ClassDef(self, node: ast.ClassDef):
        symbol_id = f"{self.relative_path}::{node.name}"
        self.symbols.append({
            "id": symbol_id,
            "file_path": self.relative_path,
            "kind": "class",
            "name": node.name,
            "depends_on": []
        })
        self.generic_visit(node)

    def visit_FunctionDef(self, node: ast.FunctionDef):
        symbol_id = f"{self.relative_path}::{node.name}"
        self.symbols.append({
            "id": symbol_id,
            "file_path": self.relative_path,
            "kind": "function",
            "name": node.name,
            "depends_on": []
        })
        self.generic_visit(node)

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef):
        symbol_id = f"{self.relative_path}::{node.name}"
        self.symbols.append({
            "id": symbol_id,
            "file_path": self.relative_path,
            "kind": "function",
            "name": node.name,
            "depends_on": []
        })
        self.generic_visit(node)

    def visit_Assign(self, node: ast.Assign):
        for target in node.targets:
            if isinstance(target, ast.Name) and (target.id.isupper() or len(target.id) > 1):
                symbol_id = f"{self.relative_path}::{target.id}"
                self.symbols.append({
                    "id": symbol_id,
                    "file_path": self.relative_path,
                    "kind": "variable",
                    "name": target.id,
                    "depends_on": []
                })
        self.generic_visit(node)

    def visit_AnnAssign(self, node: ast.AnnAssign):
        if isinstance(node.target, ast.Name):
            symbol_id = f"{self.relative_path}::{node.target.id}"
            self.symbols.append({
                "id": symbol_id,
                "file_path": self.relative_path,
                "kind": "variable",
                "name": node.target.id,
                "depends_on": []
            })
        self.generic_visit(node)

    def visit_Import(self, node: ast.Import):
        for alias in node.names:
            if alias.name not in self.imports:
                self.imports.append(alias.name)
        self.generic_visit(node)

    def visit_ImportFrom(self, node: ast.ImportFrom):
        module = node.module or ""
        for alias in node.names:
            name = f"{module}.{alias.name}" if module else alias.name
            if name not in self.imports:
                self.imports.append(name)
        self.generic_visit(node)

def scan_python_file(root_path: str, file_path: str, relative_path: str) -> List[Dict[str, Any]]:
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
        tree = ast.parse(content, filename=file_path)
        extractor = PythonSymbolExtractor(relative_path)
        extractor.visit(tree)
        
        # Add imports as symbols as well
        symbols = extractor.symbols
        seen_import_ids = set()
        for imp in extractor.imports:
            symbol_id = f"{relative_path}::import::{imp}"
            if symbol_id not in seen_import_ids:
                seen_import_ids.add(symbol_id)
                symbols.append({
                    "id": symbol_id,
                    "file_path": relative_path,
                    "kind": "import",
                    "name": imp,
                    "depends_on": []
                })
        return symbols
    except Exception as e:
        print(f"Error parsing python file {file_path}: {e}")
        return []

def scan_js_ts_file(root_path: str, file_path: str, relative_path: str) -> List[Dict[str, Any]]:
    symbols = []
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
            
        # Extract Classes: class ClassName
        class_pattern = re.compile(r'\bclass\s+([A-Za-z0-9_$]+)')
        for match in class_pattern.finditer(content):
            name = match.group(1)
            symbols.append({
                "id": f"{relative_path}::{name}",
                "file_path": relative_path,
                "kind": "class",
                "name": name,
                "depends_on": []
            })
            
        # Extract Functions: function name() or const name = () =>
        func_pattern = re.compile(r'\bfunction\s+([A-Za-z0-9_$]+)\s*\(')
        for match in func_pattern.finditer(content):
            name = match.group(1)
            symbols.append({
                "id": f"{relative_path}::{name}",
                "file_path": relative_path,
                "kind": "function",
                "name": name,
                "depends_on": []
            })
            
        arrow_func_pattern = re.compile(r'\b(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(?:\([^)]*\)|[A-Za-z0-9_$]+)\s*=>')
        for match in arrow_func_pattern.finditer(content):
            name = match.group(1)
            symbols.append({
                "id": f"{relative_path}::{name}",
                "file_path": relative_path,
                "kind": "function",
                "name": name,
                "depends_on": []
            })

        # Extract Variables: const/let/var NAME = ...
        var_pattern = re.compile(r'\b(?:export\s+)?(?:const|let|var)\s+([A-Za-z0-9_$]{2,})\s*=')
        for match in var_pattern.finditer(content):
            name = match.group(1)
            # Avoid re-adding if already extracted as function/arrow-function
            if not any(s["name"] == name for s in symbols):
                symbols.append({
                    "id": f"{relative_path}::{name}",
                    "file_path": relative_path,
                    "kind": "variable",
                    "name": name,
                    "depends_on": []
                })

        # Extract Imports: import ... from 'module'
        import_pattern = re.compile(r'\bimport\s+[^;]+?\s+from\s+[\'"]([^\'"]+)[\'"]')
        for match in import_pattern.finditer(content):
            imp = match.group(1)
            symbols.append({
                "id": f"{relative_path}::import::{imp}",
                "file_path": relative_path,
                "kind": "import",
                "name": imp,
                "depends_on": []
            })
            
    except Exception as e:
        print(f"Error parsing JS/TS file {file_path}: {e}")
    return symbols

def scan_generic_file(root_path: str, file_path: str, relative_path: str) -> List[Dict[str, Any]]:
    # Just represent the file as a single module node
    return [{
        "id": f"{relative_path}::file",
        "file_path": relative_path,
        "kind": "export", # represent file container export
        "name": os.path.basename(relative_path),
        "depends_on": []
    }]

def scan_workspace(root_path: str) -> List[Dict[str, Any]]:
    """Walk through the workspace, parse relevant files, and resolve dependency links."""
    all_symbols = []
    
    ignored_dirs = {
        ".git", "node_modules", ".venv", "venv", "env", "__pycache__", 
        ".intellego", "dist", "build", "out", ".next", ".vite"
    }
    ignored_exts = {
        ".png", ".jpg", ".jpeg", ".gif", ".ico", ".pdf", ".zip", ".tar", 
        ".gz", ".exe", ".dll", ".so", ".dylib", ".woff", ".woff2", ".eot", ".ttf"
    }
    
    file_map = {}
    
    for root, dirs, files in os.walk(root_path):
        # In-place modify dirs to skip ignored ones and prevent cyclic symlinks
        dirs[:] = [d for d in dirs if d not in ignored_dirs and not d.startswith(".") and not os.path.islink(os.path.join(root, d))]
        
        for file in files:
            file_path = os.path.join(root, file)
            _, ext = os.path.splitext(file)
            ext = ext.lower()
            
            if ext in ignored_exts or file.startswith("."):
                continue
                
            relative_path = get_relative_path(root_path, file_path)
            
            if ext == ".py":
                file_symbols = scan_python_file(root_path, file_path, relative_path)
            elif ext in [".js", ".jsx", ".ts", ".tsx"]:
                file_symbols = scan_js_ts_file(root_path, file_path, relative_path)
            else:
                file_symbols = scan_generic_file(root_path, file_path, relative_path)
                
            all_symbols.extend(file_symbols)
            
    # Deduplicate symbols by ID, adding index suffix if name collision occurs
    unique_symbols = []
    seen_ids = set()
    for s in all_symbols:
        sid = s["id"]
        if sid in seen_ids:
            counter = 2
            candidate = f"{sid}#{counter}"
            while candidate in seen_ids:
                counter += 1
                candidate = f"{sid}#{counter}"
            s["id"] = candidate
            sid = candidate
        seen_ids.add(sid)
        unique_symbols.append(s)

    # Resolve simple dependencies between symbols based on names
    # Create lookup map of all defined symbols
    defined_symbols = {}
    for s in unique_symbols:
        if s["kind"] not in ["import"]:
            # Map symbol name to its ID
            defined_symbols[s["name"]] = s["id"]
            
    # Connect imports/functions to defined symbols if they share a name
    for s in unique_symbols:
        if s["kind"] == "import":
            imported_name = s["name"].split(".")[-1] # take last part
            if imported_name in defined_symbols:
                target_id = defined_symbols[imported_name]
                if target_id not in s["depends_on"]:
                    s["depends_on"].append(target_id)
        # SPEC.md Section 9 camelCase aliases
        s["filePath"] = s["file_path"]
        s["dependsOn"] = s["depends_on"]
                
    return unique_symbols
