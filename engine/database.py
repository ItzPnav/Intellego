import sqlite3
import json
import os
from typing import List, Dict, Any, Optional

def init_db(db_path: str):
    """Initialize the SQLite database and create tables if they do not exist."""
    db_dir = os.path.dirname(db_path)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)
        
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Create Workspaces Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY,
        root_path TEXT NOT NULL,
        state TEXT NOT NULL,
        last_indexed_at TEXT
    )
    """)
    
    # Create Sessions Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
    )
    """)
    
    # Create Messages Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        file_references TEXT, -- JSON string array of file paths
        created_at TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    )
    """)
    
    # Create Symbols Table for the Semantic Knowledge Graph
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS symbols (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        file_path TEXT NOT NULL,
        kind TEXT NOT NULL, -- class, function, variable, import, export
        name TEXT NOT NULL,
        depends_on TEXT, -- JSON string array of other Symbol Node IDs
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
    )
    """)
    
    conn.commit()
    conn.close()

def get_connection(db_path: str) -> sqlite3.Connection:
    """Get a connection to the SQLite database."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    # Enable foreign keys
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

# Helper Functions for Workspace Management
def save_workspace(conn: sqlite3.Connection, ws_id: str, root_path: str, state: str, last_indexed_at: Optional[str] = None):
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO workspaces (id, root_path, state, last_indexed_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
        state = excluded.state,
        last_indexed_at = COALESCE(excluded.last_indexed_at, workspaces.last_indexed_at)
    """, (ws_id, root_path, state, last_indexed_at))
    conn.commit()

def get_workspace(conn: sqlite3.Connection, ws_id: str) -> Optional[Dict[str, Any]]:
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM workspaces WHERE id = ?", (ws_id,))
    row = cursor.fetchone()
    if row:
        return dict(row)
    return None

# Helper Functions for Session Management
def create_session(conn: sqlite3.Connection, session_id: str, workspace_id: str, created_at: str):
    cursor = conn.cursor()
    # Guard against foreign key violation by ensuring workspace exists
    cursor.execute("SELECT id FROM workspaces WHERE id = ?", (workspace_id,))
    if not cursor.fetchone():
        cursor.execute("INSERT OR IGNORE INTO workspaces (id, root_path, state) VALUES (?, ?, ?)",
                       (workspace_id, ".", "READY"))
    cursor.execute("""
    INSERT INTO sessions (id, workspace_id, created_at)
    VALUES (?, ?, ?)
    ON CONFLICT(id) DO NOTHING
    """, (session_id, workspace_id, created_at))
    conn.commit()

def save_message(conn: sqlite3.Connection, msg_id: str, session_id: str, role: str, content: str, created_at: str, file_references: Optional[List[str]] = None):
    cursor = conn.cursor()
    # Guard against foreign key violation by ensuring session exists
    cursor.execute("SELECT id FROM sessions WHERE id = ?", (session_id,))
    if not cursor.fetchone():
        cursor.execute("SELECT id FROM workspaces LIMIT 1")
        ws_row = cursor.fetchone()
        ws_id = ws_row[0] if ws_row else "default"
        if not ws_row:
            cursor.execute("INSERT OR IGNORE INTO workspaces (id, root_path, state) VALUES (?, ?, ?)", (ws_id, ".", "READY"))
        cursor.execute("INSERT OR IGNORE INTO sessions (id, workspace_id, created_at) VALUES (?, ?, ?)", (session_id, ws_id, created_at))
    file_refs_str = json.dumps(file_references) if file_references else None
    cursor.execute("""
    INSERT INTO messages (id, session_id, role, content, file_references, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (msg_id, session_id, role, content, file_refs_str, created_at))
    conn.commit()

def get_messages(conn: sqlite3.Connection, session_id: str) -> List[Dict[str, Any]]:
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC", (session_id,))
    rows = cursor.fetchall()
    messages = []
    for r in rows:
        msg = dict(r)
        if msg["file_references"]:
            try:
                msg["file_references"] = json.loads(msg["file_references"])
            except Exception:
                msg["file_references"] = []
        else:
            msg["file_references"] = []
        # SPEC.md Section 9 camelCase aliases
        msg["sessionId"] = msg["session_id"]
        msg["fileReferences"] = msg["file_references"]
        msg["createdAt"] = msg["created_at"]
        messages.append(msg)
    return messages

# Helper Functions for Symbols (Knowledge Graph)
def save_symbols(conn: sqlite3.Connection, workspace_id: str, symbols: List[Dict[str, Any]], root_path: Optional[str] = None):
    """Batch save symbols. Deletes all existing symbols for this workspace first to keep graph fresh."""
    cursor = conn.cursor()
    # Ensure workspace exists to satisfy foreign key constraint
    cursor.execute("SELECT id FROM workspaces WHERE id = ?", (workspace_id,))
    if not cursor.fetchone():
        cursor.execute("INSERT OR IGNORE INTO workspaces (id, root_path, state) VALUES (?, ?, ?)",
                       (workspace_id, root_path or ".", "READY"))
    cursor.execute("DELETE FROM symbols WHERE workspace_id = ?", (workspace_id,))
    
    seen_ids = set()
    for s in symbols:
        sid = s["id"]
        if sid in seen_ids:
            continue
        seen_ids.add(sid)
        dep_list = s.get("depends_on") or s.get("dependsOn") or []
        depends_on_str = json.dumps(dep_list)
        fpath = s.get("file_path") or s.get("filePath") or ""
        cursor.execute("""
        INSERT OR REPLACE INTO symbols (id, workspace_id, file_path, kind, name, depends_on)
        VALUES (?, ?, ?, ?, ?, ?)
        """, (sid, workspace_id, fpath, s["kind"], s["name"], depends_on_str))
        
    conn.commit()

def get_symbols(conn: sqlite3.Connection, workspace_id: str, kind: Optional[str] = None, query: Optional[str] = None) -> List[Dict[str, Any]]:
    cursor = conn.cursor()
    sql = "SELECT * FROM symbols WHERE workspace_id = ?"
    params = [workspace_id]
    if kind:
        sql += " AND LOWER(kind) = ?"
        params.append(kind.lower())
    if query:
        sql += " AND (name LIKE ? OR file_path LIKE ?)"
        params.append(f"%{query}%")
        params.append(f"%{query}%")
    sql += " ORDER BY file_path ASC, name ASC"
    cursor.execute(sql, params)
    rows = cursor.fetchall()
    symbols = []
    for r in rows:
        sym = dict(r)
        if sym["depends_on"]:
            try:
                sym["depends_on"] = json.loads(sym["depends_on"])
            except Exception:
                sym["depends_on"] = []
        else:
            sym["depends_on"] = []
        # SPEC.md Section 9 camelCase aliases
        sym["workspaceId"] = sym["workspace_id"]
        sym["filePath"] = sym["file_path"]
        sym["dependsOn"] = sym["depends_on"]
        symbols.append(sym)
    return symbols
