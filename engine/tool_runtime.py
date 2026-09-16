import os
import uuid
import difflib
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional

# In-memory store for pending edit previews: {preview_id: preview_data}
pending_previews: Dict[str, Dict[str, Any]] = {}

def validate_workspace_path(root_path: str, target_path: str) -> str:
    """Validate that target_path resolves strictly within root_path and return its absolute path.
    Raises ValueError if outside root_path or if target is a directory.
    """
    if not target_path or not str(target_path).strip():
        raise ValueError("Target file path cannot be empty.")

    abs_root = os.path.abspath(root_path)
    clean_target = str(target_path).strip()

    # Target path can be relative or absolute.
    # On Windows or POSIX, strip leading slashes if not a drive-letter absolute path to avoid jumping to drive root.
    is_absolute_drive = os.path.isabs(clean_target) and (len(clean_target) >= 2 and clean_target[1] == ":")
    if not is_absolute_drive and not (os.name != "nt" and os.path.isabs(clean_target)):
        clean_rel = clean_target.lstrip("/\\")
        abs_target = os.path.abspath(os.path.join(abs_root, clean_rel))
    else:
        abs_target = os.path.abspath(clean_target)
        
    # Check that abs_target starts with abs_root, using normcase for case-insensitive platforms
    try:
        common = os.path.commonpath([abs_root, abs_target])
    except ValueError:
        raise ValueError(f"Path traversal detected: target path '{target_path}' is on a different drive than workspace root '{root_path}'")

    if os.path.normcase(common) != os.path.normcase(abs_root):
        raise ValueError(f"Path traversal detected: target path '{target_path}' is outside workspace root '{root_path}'")

    if os.path.normcase(abs_target) == os.path.normcase(abs_root):
        raise ValueError(f"Target path '{target_path}' resolves to the workspace root directory, not a file.")

    if os.path.exists(abs_target) and os.path.isdir(abs_target):
        raise ValueError(f"Target path '{target_path}' is a directory, not a file.")
        
    return abs_target

def generate_unified_diff(file_path_rel: str, original_content: str, proposed_content: str) -> str:
    """Generate a clean unified diff string."""
    original_lines = original_content.splitlines()
    proposed_lines = proposed_content.splitlines()
    
    diff = difflib.unified_diff(
        original_lines,
        proposed_lines,
        fromfile=f"a/{file_path_rel}",
        tofile=f"b/{file_path_rel}",
        lineterm=""
    )
    return "\n".join(diff)

def create_edit_preview(workspace_root: str, file_path_rel: str, proposed_content: str, operation: str = "replace") -> Dict[str, Any]:
    """Create a pending edit preview and store it in memory with 1-hour TTL. Returns the EditPreview dict."""
    try:
        abs_path = validate_workspace_path(workspace_root, file_path_rel)
    except ValueError as e:
        return {"error": str(e)}

    original_content = ""
    if os.path.exists(abs_path) and operation != "insert":
        try:
            with open(abs_path, "r", encoding="utf-8", errors="ignore") as f:
                original_content = f.read()
        except Exception as e:
            original_content = f"<Error reading file: {e}>"

    # Generate the diff
    diff_text = generate_unified_diff(file_path_rel, original_content, proposed_content)
    
    preview_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(hours=1)

    preview_data = {
        "id": preview_id,
        "filePath": file_path_rel,
        "operation": operation,
        "diff": diff_text,
        "proposed_content": proposed_content,
        "createdAt": now.isoformat(),
        "expiresAt": expires_at.isoformat(),
        "requiresApproval": True
    }
    
    # Store in memory
    pending_previews[preview_id] = {
        "workspace_root": workspace_root,
        "file_path_abs": abs_path,
        "proposed_content": proposed_content,
        "operation": operation,
        "expires_at": expires_at,
        "preview_data": preview_data
    }
    
    return preview_data

def apply_edit(preview_id: str) -> Dict[str, Any]:
    """Apply a pending edit preview, writing the changes to disk."""
    if preview_id not in pending_previews:
        return {"success": False, "error": f"Preview ID '{preview_id}' not found or expired."}
        
    edit_info = pending_previews[preview_id]
    
    # Verify preview is unexpired (SPEC.md Section 8 & 10)
    if "expires_at" in edit_info and datetime.now(timezone.utc) > edit_info["expires_at"]:
        del pending_previews[preview_id]
        return {"success": False, "error": f"Preview ID '{preview_id}' has expired."}

    abs_path = edit_info["file_path_abs"]
    proposed_content = edit_info["proposed_content"]
    operation = edit_info.get("operation", "replace")
    
    try:
        if operation == "delete":
            if os.path.exists(abs_path):
                os.remove(abs_path)
            del pending_previews[preview_id]
            return {"success": True, "message": f"Successfully deleted {abs_path}"}

        # Create directories if they do not exist
        os.makedirs(os.path.dirname(abs_path), exist_ok=True)
        
        # Write to disk
        with open(abs_path, "w", encoding="utf-8") as f:
            f.write(proposed_content)
            
        # Clean up
        del pending_previews[preview_id]
        return {"success": True, "message": f"Successfully applied changes to {abs_path}"}
    except Exception as e:
        return {"success": False, "error": f"Failed to write file: {e}"}

def get_preview(preview_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve details of a pending preview."""
    if preview_id in pending_previews:
        return pending_previews[preview_id]["preview_data"]
    return None

def clear_previews(workspace_root: Optional[str] = None):
    """Clear pending edit previews for a workspace or all."""
    global pending_previews
    if workspace_root:
        abs_root = os.path.abspath(workspace_root)
        pending_previews = {k: v for k, v in pending_previews.items() if os.path.normcase(v.get("workspace_root", "")) != os.path.normcase(abs_root)}
    else:
        pending_previews.clear()
