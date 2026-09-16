import os
import uuid
from datetime import datetime
from fastapi import FastAPI, HTTPException, Body, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

import database as db
import scanner
import agent
import tool_runtime

app = FastAPI(title="Intellego Backend Sidecar")

# Allow CORS for local frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Active State Store
active_workspace: Dict[str, Any] = {
    "id": None,
    "rootPath": None,
    "state": "UNOPENED",
    "lastIndexedAt": None,
    "db_path": None
}

active_session_id: Optional[str] = None

class OpenWorkspaceRequest(BaseModel):
    path: str

class ChatRequest(BaseModel):
    message: str
    sessionId: Optional[str] = None

def get_envelope(success: bool, message: str, data: Any = None, error: Any = None) -> Dict[str, Any]:
    envelope = {
        "success": success,
        "message": message
    }
    if data is not None:
        envelope["data"] = data
    if error is not None:
        envelope["error"] = error
    return envelope

@app.get("/health")
def health_check():
    return get_envelope(True, "Engine is alive", {"status": "ok"})

@app.post("/workspace/open")
def open_workspace(req: OpenWorkspaceRequest):
    global active_workspace, active_session_id
    
    if not req.path or not req.path.strip():
        return get_envelope(False, "Workspace path cannot be empty", error={"code": "EMPTY_PATH", "detail": "A non-empty path is required."})

    root_path = os.path.abspath(req.path.strip())
    if not os.path.exists(root_path):
        return get_envelope(False, "Directory does not exist", error={"code": "PATH_NOT_FOUND", "detail": f"Path '{req.path}' was not found on this machine."})
        
    if not os.path.isdir(root_path):
        return get_envelope(False, "Path is not a directory", error={"code": "NOT_A_DIRECTORY", "detail": f"Path '{req.path}' is a file, not a directory."})

    ws_id = hashlib_path(root_path)
    db_dir = os.path.join(root_path, ".intellego")
    db_path = os.path.join(db_dir, "workspace.db")
    
    # Initialize SQLite database in workspace
    try:
        db.init_db(db_path)
    except Exception as e:
        return get_envelope(False, "Failed to initialize workspace database", error={"code": "DB_INIT_ERROR", "detail": str(e)})

    # Fetch last_indexed_at if previously saved
    last_indexed = None
    try:
        conn = db.get_connection(db_path)
        existing_ws = db.get_workspace(conn, ws_id)
        if existing_ws:
            last_indexed = existing_ws.get("last_indexed_at")
        db.save_workspace(conn, ws_id, root_path, "READY", last_indexed)
        conn.close()
    except Exception:
        pass
        
    active_workspace = {
        "id": ws_id,
        "rootPath": root_path,
        "state": "READY",
        "lastIndexedAt": last_indexed,
        "db_path": db_path
    }
    
    # Start fresh session for UI convenience
    active_session_id = str(uuid.uuid4())
    
    return get_envelope(True, "Workspace opened successfully", {
        "id": ws_id,
        "rootPath": root_path,
        "state": "READY",
        "lastIndexedAt": last_indexed,
        "sessionId": active_session_id
    })

@app.get("/workspace/status")
def workspace_status():
    if not active_workspace["id"]:
        return get_envelope(True, "No workspace open", {
            "id": None,
            "rootPath": None,
            "state": active_workspace.get("state", "UNOPENED"),
            "lastIndexedAt": None
        })
        
    return get_envelope(True, "Current workspace status", {
        "id": active_workspace["id"],
        "rootPath": active_workspace["rootPath"],
        "state": active_workspace["state"],
        "lastIndexedAt": active_workspace["lastIndexedAt"]
    })

@app.post("/workspace/index")
def index_workspace():
    if not active_workspace.get("id") or not active_workspace.get("rootPath"):
        return get_envelope(False, "No workspace open to index", error={"code": "NO_ACTIVE_WORKSPACE", "detail": "A workspace must be open before indexing."})
        
    root_path = active_workspace["rootPath"]
    db_path = active_workspace["db_path"]
    ws_id = active_workspace["id"]
    
    active_workspace["state"] = "INDEXING"
    
    try:
        # Scan files and extract symbols
        symbols = scanner.scan_workspace(root_path)
        
        # Save to database
        conn = db.get_connection(db_path)
        db.save_symbols(conn, ws_id, symbols, root_path)
        
        last_indexed = datetime.now().isoformat()
        db.save_workspace(conn, ws_id, root_path, "READY", last_indexed)
        conn.close()
        
        active_workspace["state"] = "READY"
        active_workspace["lastIndexedAt"] = last_indexed
        
        return get_envelope(True, "Indexing complete", {
            "symbolCount": len(symbols),
            "lastIndexedAt": last_indexed
        })
    except Exception as e:
        active_workspace["state"] = "ERROR"
        return get_envelope(False, "Indexing failed", error={"code": "INDEXING_FAILED", "detail": str(e)})

def ensure_active_workspace():
    global active_workspace
    if not active_workspace["id"] or not active_workspace.get("db_path"):
        default_dir = os.path.abspath(".")
        ws_id = hashlib_path(default_dir)
        db_dir = os.path.join(default_dir, ".intellego")
        db_path = os.path.join(db_dir, "workspace.db")
        db.init_db(db_path)
        active_workspace["id"] = ws_id
        active_workspace["rootPath"] = default_dir
        active_workspace["state"] = "READY"
        active_workspace["db_path"] = db_path
        try:
            conn = db.get_connection(db_path)
            db.save_workspace(conn, ws_id, default_dir, "READY")
            conn.close()
        except Exception:
            pass

@app.websocket("/chat/stream")
async def websocket_chat_stream(websocket: WebSocket):
    await websocket.accept()
    global active_session_id
    try:
        data = await websocket.receive_json()
        message = data.get("message", "")
        session_id = data.get("sessionId") or active_session_id or str(uuid.uuid4())
        active_session_id = session_id
        
        ensure_active_workspace()
        db_path = active_workspace["db_path"]
        root_path = active_workspace["rootPath"]
        
        conn = db.get_connection(db_path)
        db.create_session(conn, session_id, active_workspace["id"], datetime.now().isoformat())
        user_msg_id = str(uuid.uuid4())
        db.save_message(conn, user_msg_id, session_id, "user", message, datetime.now().isoformat())
        history_rows = db.get_messages(conn, session_id)
        conn.close()
        
        messages = [{"role": r["role"], "content": r["content"]} for r in history_rows]
        
        workspace_files = []
        if root_path and os.path.exists(root_path):
            for root, dirs, files in os.walk(root_path):
                dirs[:] = [d for d in dirs if d not in {".git", "node_modules", ".venv", "venv", ".intellego", "dist"}]
                for f in files:
                    full_f = os.path.join(root, f)
                    rel_f = os.path.relpath(full_f, root_path).replace("\\", "/")
                    if not rel_f.startswith("."):
                        workspace_files.append(rel_f)
                        
        full_text = ""
        async for chunk in agent.call_nemotron_stream(messages, workspace_files):
            full_text += chunk
            await websocket.send_text(chunk)
            
        proposed_changes = agent.parse_proposed_changes(full_text)
        preview_ids = []
        for change in proposed_changes:
            preview = tool_runtime.create_edit_preview(root_path, change["filePath"], change["content"])
            if "id" in preview:
                preview_ids.append(preview)
                
        clean_text = agent.clean_agent_response(full_text)
        conn = db.get_connection(db_path)
        asst_msg_id = str(uuid.uuid4())
        file_refs = [p["filePath"] for p in preview_ids]
        db.save_message(conn, asst_msg_id, session_id, "assistant", clean_text, datetime.now().isoformat(), file_refs)
        conn.close()
        
        if preview_ids:
            import json
            await websocket.send_text(f"\n\n__INTELLEGO_PREVIEW_JSON__:{json.dumps(preview_ids)}")
            
        await websocket.close()
    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({
                "error": {
                    "code": "CHAT_STREAM_ERROR",
                    "detail": str(e)
                }
            })
            await websocket.close()
        except Exception:
            pass

@app.post("/chat/stream")
async def chat_stream(req: ChatRequest):
    global active_session_id
    ensure_active_workspace()
        
    session_id = req.sessionId or active_session_id or str(uuid.uuid4())
    active_session_id = session_id
    
    db_path = active_workspace["db_path"]
    root_path = active_workspace["rootPath"]
    
    # Save user message to database
    conn = db.get_connection(db_path)
    db.create_session(conn, session_id, active_workspace["id"], datetime.now().isoformat())
    user_msg_id = str(uuid.uuid4())
    db.save_message(conn, user_msg_id, session_id, "user", req.message, datetime.now().isoformat())
    
    # Fetch conversation history
    history_rows = db.get_messages(conn, session_id)
    conn.close()
    
    messages = []
    for r in history_rows:
        messages.append({"role": r["role"], "content": r["content"]})
        
    # Get all file paths in workspace to feed to agent as context
    workspace_files = []
    if root_path and os.path.exists(root_path):
        for root, dirs, files in os.walk(root_path):
            dirs[:] = [d for d in dirs if d not in {".git", "node_modules", ".venv", "venv", ".intellego", "dist"}]
            for f in files:
                full_f = os.path.join(root, f)
                rel_f = os.path.relpath(full_f, root_path).replace("\\", "/")
                if not rel_f.startswith("."):
                    workspace_files.append(rel_f)
                
    async def generate_response():
        full_text = ""
        # Stream response from Nemotron
        async for chunk in agent.call_nemotron_stream(messages, workspace_files):
            full_text += chunk
            yield chunk
            
        # Parse any proposed changes at the end of the text
        proposed_changes = agent.parse_proposed_changes(full_text)
        preview_ids = []
        for change in proposed_changes:
            # Create the edit preview in tool runtime
            preview = tool_runtime.create_edit_preview(root_path, change["filePath"], change["content"])
            if "id" in preview:
                preview_ids.append(preview)
                
        # Save assistant message in DB (with XML tags cleaned for chat view)
        clean_text = agent.clean_agent_response(full_text)
        conn = db.get_connection(db_path)
        asst_msg_id = str(uuid.uuid4())
        
        file_refs = [p["filePath"] for p in preview_ids]
        db.save_message(conn, asst_msg_id, session_id, "assistant", clean_text, datetime.now().isoformat(), file_refs)
        conn.close()
        
        # If there are previews, send a payload token at the very end
        if preview_ids:
            import json
            yield f"\n\n__INTELLEGO_PREVIEW_JSON__:{json.dumps(preview_ids)}"

    return StreamingResponse(generate_response(), media_type="text/plain")

@app.get("/session/history")
def get_session_history(sessionId: Optional[str] = None):
    session_id = sessionId or active_session_id
    if not session_id or not active_workspace["id"]:
        return get_envelope(True, "No session active", {"messages": []})
        
    db_path = active_workspace["db_path"]
    conn = db.get_connection(db_path)
    messages = db.get_messages(conn, session_id)
    conn.close()
    
    return get_envelope(True, "Session history retrieved", {"messages": messages})

class EditPreviewRequest(BaseModel):
    filePath: Optional[str] = None
    file_path: Optional[str] = None
    proposedContent: Optional[str] = None
    proposed_content: Optional[str] = None
    operation: Optional[str] = "replace"

    @property
    def target_file(self) -> str:
        return (self.filePath or self.file_path or "").strip()

    @property
    def content(self) -> str:
        return self.proposedContent if self.proposedContent is not None else (self.proposed_content or "")

class ApplyEditRequest(BaseModel):
    previewId: Optional[str] = None
    preview_id: Optional[str] = None

@app.post("/edit/preview")
def create_preview(req: EditPreviewRequest):
    ensure_active_workspace()
    root_path = active_workspace.get("rootPath")
    if not root_path:
        return get_envelope(False, "No active workspace open", error={"code": "NO_ACTIVE_WORKSPACE", "detail": "A workspace must be open before requesting an edit preview."})

    if not req.target_file:
        return get_envelope(False, "filePath is required", error={"code": "MISSING_FILE_PATH", "detail": "Target file path must be specified."})

    preview = tool_runtime.create_edit_preview(
        workspace_root=root_path,
        file_path_rel=req.target_file,
        proposed_content=req.content,
        operation=req.operation or "replace"
    )

    if "error" in preview:
        return get_envelope(False, preview["error"], error={"code": "PREVIEW_ERROR", "detail": preview["error"]})

    return get_envelope(True, "Edit preview generated successfully", preview)

@app.post("/edit/apply")
def apply_edit(req: Optional[ApplyEditRequest] = None, previewId: Optional[str] = Body(None, embed=True)):
    pid = None
    if req and (req.previewId or req.preview_id):
        pid = req.previewId or req.preview_id
    elif previewId:
        pid = previewId

    if not pid or not pid.strip():
        return get_envelope(False, "previewId is required", error={"code": "INVALID_PREVIEW_ID", "detail": "A valid preview ID is strictly required before changes can be applied."})

    result = tool_runtime.apply_edit(pid.strip())
    if result.get("success"):
        return get_envelope(True, result["message"], {"applied": True, "previewId": pid.strip()})
    else:
        err_msg = result.get("error", "Failed to apply edit")
        err_code = "PREVIEW_EXPIRED" if "expired" in err_msg.lower() else "APPLY_REJECTED"
        return get_envelope(False, err_msg, error={"code": err_code, "detail": err_msg})

@app.get("/git/status")
def git_status():
    if not active_workspace.get("id") or not active_workspace.get("rootPath"):
        return get_envelope(False, "No active workspace open", error={"code": "NO_ACTIVE_WORKSPACE", "detail": "A workspace must be opened before checking git status."})
        
    root_path = active_workspace["rootPath"]
    import subprocess
    try:
        # Run git status --porcelain to get a clean list of changes
        result = subprocess.run(
            ["git", "status", "--porcelain"], 
            cwd=root_path, 
            capture_output=True, 
            text=True, 
            check=False
        )
        if result.returncode != 0:
            # Not a git repo or git not found
            return get_envelope(True, "Not a git repository or git error", {"status": "untracked", "changes": []})
            
        changes = []
        for line in result.stdout.splitlines():
            if len(line) > 3:
                state = line[:2].strip()
                file_path = line[3:].strip().strip('"')
                changes.append({"file": file_path, "state": state})
                
        return get_envelope(True, "Git status retrieved", {"status": "tracked", "changes": changes})
    except Exception as e:
        return get_envelope(False, "Failed to check git status", error={"code": "GIT_STATUS_FAILED", "detail": str(e)})

class CommitRequest(BaseModel):
    message: str

@app.post("/git/commit")
def git_commit(req: CommitRequest):
    if not active_workspace.get("id") or not active_workspace.get("rootPath"):
        return get_envelope(False, "No active workspace open", error={"code": "NO_ACTIVE_WORKSPACE", "detail": "A workspace must be opened before committing."})

    if not req.message or not req.message.strip():
        return get_envelope(False, "Commit message cannot be empty", error={"code": "EMPTY_COMMIT_MESSAGE", "detail": "A descriptive commit message is required."})
        
    root_path = active_workspace["rootPath"]
    import subprocess
    try:
        # Stage all changes
        add_res = subprocess.run(["git", "add", "."], cwd=root_path, capture_output=True, text=True, check=False)
        if add_res.returncode != 0:
            err_detail = (add_res.stderr or add_res.stdout or "Failed to stage changes with git add.").strip()
            err_code = "NOT_A_GIT_REPO" if "not a git repository" in err_detail.lower() else "GIT_ADD_FAILED"
            return get_envelope(False, "Git add failed", error={"code": err_code, "detail": err_detail})

        # Commit
        commit_res = subprocess.run(["git", "commit", "-m", req.message.strip()], cwd=root_path, capture_output=True, text=True, check=False)
        if commit_res.returncode != 0:
            err_detail = (commit_res.stderr or commit_res.stdout or "Git commit command failed.").strip()
            err_code = "NOTHING_TO_COMMIT" if "nothing to commit" in err_detail.lower() else "GIT_COMMIT_FAILED"
            err_msg = "Nothing to commit, working tree is clean" if err_code == "NOTHING_TO_COMMIT" else "Git commit failed"
            return get_envelope(False, err_msg, error={"code": err_code, "detail": err_detail})

        return get_envelope(True, "Changes committed successfully", {"message": req.message.strip(), "output": commit_res.stdout.strip()})
    except Exception as e:
        return get_envelope(False, "Failed to commit changes", error={"code": "GIT_COMMIT_ERROR", "detail": str(e)})

@app.get("/workspace/symbols")
def get_workspace_symbols(kind: Optional[str] = None, query: Optional[str] = None):
    if not active_workspace.get("id") or not active_workspace.get("db_path"):
        return get_envelope(True, "No workspace open", {"symbols": [], "total": 0})
        
    db_path = active_workspace["db_path"]
    try:
        conn = db.get_connection(db_path)
        symbols = db.get_symbols(conn, active_workspace["id"], kind=kind, query=query)
        conn.close()
        return get_envelope(True, "Symbols retrieved successfully", {"symbols": symbols, "total": len(symbols)})
    except Exception as e:
        return get_envelope(False, "Failed to retrieve symbols", error={"code": "SYMBOLS_QUERY_FAILED", "detail": str(e)})

@app.get("/config")
def get_config():
    # Return effective configuration
    config = {
        "modelName": agent.MODEL_NAME,
        "apiBase": agent.API_URL,
        "hasApiKey": bool(agent.NEMOTRON_API_KEY)
    }
    return get_envelope(True, "Configuration retrieved", config)

class UpdateConfigRequest(BaseModel):
    modelName: Optional[str] = None
    apiBase: Optional[str] = None
    apiKey: Optional[str] = None

@app.post("/config")
def update_config(req: UpdateConfigRequest):
    if req.modelName:
        agent.MODEL_NAME = req.modelName
    if req.apiBase:
        agent.API_URL = req.apiBase
    if req.apiKey:
        agent.NEMOTRON_API_KEY = req.apiKey
        # Write to environment in-memory
        os.environ["NEMOTRON_API_KEY"] = req.apiKey
        
    return get_envelope(True, "Configuration updated successfully", {
        "modelName": agent.MODEL_NAME,
        "apiBase": agent.API_URL,
        "hasApiKey": bool(agent.NEMOTRON_API_KEY)
    })

@app.post("/workspace/close")
def close_workspace():
    global active_workspace, active_session_id
    tool_runtime.clear_previews()
    active_workspace = {
        "id": None,
        "rootPath": None,
        "state": "CLOSED",
        "lastIndexedAt": None,
        "db_path": None
    }
    active_session_id = None
    return get_envelope(True, "Workspace closed")

def hashlib_path(path: str) -> str:
    """Generate a unique deterministic ID for a workspace path."""
    return hashlib_md5(path.lower().encode("utf-8")).hexdigest()

def hashlib_md5(data: bytes):
    import hashlib
    return hashlib.md5(data)

