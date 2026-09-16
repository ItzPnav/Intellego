import os
import sys
import tempfile
import shutil
import unittest
import json
from starlette.testclient import TestClient

# Add engine directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import main
import database as db
import scanner
import tool_runtime
import agent

class IntellegoEngineTestSuite(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(main.app)

    def setUp(self):
        # Create a fresh temporary directory for testing workspace operations
        self.test_dir = tempfile.mkdtemp(prefix="intellego_test_ws_")
        # Create a sample python file and js file
        with open(os.path.join(self.test_dir, "calc.py"), "w", encoding="utf-8") as f:
            f.write("""import os
import math
from typing import List

class Calculator:
    def add(self, a: int, b: int) -> int:
        return a + b

def multiply(x: int, y: int) -> int:
    return x * y
""")

        with open(os.path.join(self.test_dir, "index.js"), "w", encoding="utf-8") as f:
            f.write("""import { Calculator } from './calc';

class AppView {
    constructor() {}
}

function renderApp() {
    return true;
}
""")

    def tearDown(self):
        # Close workspace on engine
        self.client.post("/workspace/close")
        # Clean up temporary directory
        if os.path.exists(self.test_dir):
            shutil.rmtree(self.test_dir, ignore_errors=True)

    # 1. Health Endpoint
    def test_01_health_check(self):
        resp = self.client.get("/health")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data.get("success"))
        self.assertEqual(data.get("data", {}).get("status"), "ok")

    # 2. Workspace Open - Path Validation
    def test_02_workspace_open_validation(self):
        # Non-existent path
        resp = self.client.post("/workspace/open", json={"path": os.path.join(self.test_dir, "does_not_exist")})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertFalse(data.get("success"))
        self.assertEqual(data.get("error", {}).get("code"), "PATH_NOT_FOUND")

        # Empty path
        resp = self.client.post("/workspace/open", json={"path": ""})
        data = resp.json()
        self.assertFalse(data.get("success"))
        self.assertEqual(data.get("error", {}).get("code"), "EMPTY_PATH")

        # File instead of directory
        file_path = os.path.join(self.test_dir, "calc.py")
        resp = self.client.post("/workspace/open", json={"path": file_path})
        data = resp.json()
        self.assertFalse(data.get("success"))
        self.assertEqual(data.get("error", {}).get("code"), "NOT_A_DIRECTORY")

    # 3. Workspace Open & Status Life-Cycle
    def test_03_workspace_open_and_status(self):
        # Initial status before open
        status_resp = self.client.get("/workspace/status")
        self.assertEqual(status_resp.status_code, 200)
        self.assertIsNone(status_resp.json().get("data", {}).get("id"))

        # Open valid workspace
        open_resp = self.client.post("/workspace/open", json={"path": self.test_dir})
        self.assertEqual(open_resp.status_code, 200)
        open_data = open_resp.json()
        self.assertTrue(open_data.get("success"))
        ws_id = open_data.get("data", {}).get("id")
        self.assertIsNotNone(ws_id)
        self.assertEqual(open_data.get("data", {}).get("state"), "READY")

        # Status after open
        status_resp = self.client.get("/workspace/status")
        status_data = status_resp.json()
        self.assertTrue(status_data.get("success"))
        self.assertEqual(status_data.get("data", {}).get("id"), ws_id)
        self.assertEqual(status_data.get("data", {}).get("state"), "READY")

    # 4. AST Indexing and Knowledge Graph Persistence
    def test_04_workspace_indexing_and_symbols(self):
        self.client.post("/workspace/open", json={"path": self.test_dir})
        index_resp = self.client.post("/workspace/index")
        self.assertEqual(index_resp.status_code, 200)
        index_data = index_resp.json()
        self.assertTrue(index_data.get("success"))
        self.assertGreater(index_data.get("data", {}).get("symbolCount", 0), 0)

        # Query persisted symbols
        sym_resp = self.client.get("/workspace/symbols")
        self.assertEqual(sym_resp.status_code, 200)
        sym_data = sym_resp.json()
        self.assertTrue(sym_data.get("success"))
        symbols = sym_data.get("data", {}).get("symbols", [])
        self.assertGreater(len(symbols), 0)

        # Check extracted classes and functions
        names = [s["name"] for s in symbols]
        self.assertIn("Calculator", names)
        self.assertIn("multiply", names)
        self.assertIn("AppView", names)
        self.assertIn("renderApp", names)

    # 5. Tool Runtime: Edit Preview and Gated Apply
    def test_05_edit_preview_and_apply(self):
        self.client.post("/workspace/open", json={"path": self.test_dir})

        # Request edit preview for calc.py
        new_content = """import os
import math

class Calculator:
    def add(self, a: int, b: int) -> int:
        return a + b

    def subtract(self, a: int, b: int) -> int:
        return a - b
"""
        preview_resp = self.client.post("/edit/preview", json={
            "filePath": "calc.py",
            "proposedContent": new_content,
            "operation": "replace"
        })
        self.assertEqual(preview_resp.status_code, 200)
        prev_data = preview_resp.json()
        self.assertTrue(prev_data.get("success"))
        preview_id = prev_data.get("data", {}).get("id")
        diff_text = prev_data.get("data", {}).get("diff")

        self.assertIsNotNone(preview_id)
        self.assertIn("+    def subtract", diff_text)
        self.assertTrue(prev_data.get("data", {}).get("requiresApproval"))

        # Verify disk has NOT changed before apply (diff-before-apply discipline)
        with open(os.path.join(self.test_dir, "calc.py"), "r", encoding="utf-8") as f:
            disk_content = f.read()
        self.assertNotIn("subtract", disk_content)

        # Apply edit with preview_id
        apply_resp = self.client.post("/edit/apply", json={"previewId": preview_id})
        self.assertEqual(apply_resp.status_code, 200)
        apply_data = apply_resp.json()
        self.assertTrue(apply_data.get("success"))

        # Verify disk HAS changed after apply
        with open(os.path.join(self.test_dir, "calc.py"), "r", encoding="utf-8") as f:
            disk_content_after = f.read()
        self.assertIn("def subtract", disk_content_after)

        # Verify applying the same preview_id again fails (cannot re-apply expired/consumed preview)
        second_apply = self.client.post("/edit/apply", json={"previewId": preview_id})
        self.assertFalse(second_apply.json().get("success"))

    # 6. Tool Runtime: Path Traversal Prevention
    def test_06_path_traversal_rejection(self):
        self.client.post("/workspace/open", json={"path": self.test_dir})

        # Attempt to target outside workspace (e.g. ../../secret.txt)
        preview_resp = self.client.post("/edit/preview", json={
            "filePath": "../../secret.txt",
            "proposedContent": "malicious content",
            "operation": "replace"
        })
        self.assertEqual(preview_resp.status_code, 200)
        prev_data = preview_resp.json()
        self.assertFalse(prev_data.get("success"))
        self.assertEqual(prev_data.get("error", {}).get("code"), "PREVIEW_ERROR")
        self.assertIn("Path traversal", prev_data.get("error", {}).get("detail"))

    # 7. Chat Streaming via Chunked HTTP
    def test_07_http_chat_stream(self):
        self.client.post("/workspace/open", json={"path": self.test_dir})

        resp = self.client.post("/chat/stream", json={"message": "create test_math.py"})
        self.assertEqual(resp.status_code, 200)
        self.assertIn("text/plain", resp.headers["content-type"])
        body = resp.text
        self.assertGreater(len(body), 0)
        # Should contain mock demo response or model reasoning
        self.assertTrue("test_math.py" in body or "Mock Demo Mode" in body)

    # 8. Chat Streaming via WebSocket
    def test_08_websocket_chat_stream(self):
        self.client.post("/workspace/open", json={"path": self.test_dir})

        with self.client.websocket_connect("/chat/stream") as ws:
            ws.send_json({"message": "Hello Intellego"})
            chunks = []
            try:
                while True:
                    chunk = ws.receive_text()
                    chunks.append(chunk)
            except Exception:
                pass
            full_msg = "".join(chunks)
            self.assertGreater(len(full_msg), 0)

    # 9. Session History Persistence
    def test_09_session_history(self):
        self.client.post("/workspace/open", json={"path": self.test_dir})

        # Send a message through HTTP stream
        self.client.post("/chat/stream", json={"message": "First test query"})

        # Query history
        hist_resp = self.client.get("/session/history")
        self.assertEqual(hist_resp.status_code, 200)
        hist_data = hist_resp.json()
        self.assertTrue(hist_data.get("success"))
        messages = hist_data.get("data", {}).get("messages", [])
        self.assertGreaterEqual(len(messages), 2)  # 1 user + 1 assistant
        roles = [m["role"] for m in messages]
        self.assertIn("user", roles)
        self.assertIn("assistant", roles)

    # 10. Git Status and Commit Operations
    def test_10_git_status_and_commit(self):
        self.client.post("/workspace/open", json={"path": self.test_dir})

        # Initialize git repo in test dir
        import subprocess
        subprocess.run(["git", "init"], cwd=self.test_dir, capture_output=True, check=True)
        subprocess.run(["git", "config", "user.name", "Intellego Test"], cwd=self.test_dir, capture_output=True, check=True)
        subprocess.run(["git", "config", "user.email", "test@intellego.ai"], cwd=self.test_dir, capture_output=True, check=True)

        # Check git status (should show untracked files)
        status_resp = self.client.get("/git/status")
        self.assertEqual(status_resp.status_code, 200)
        status_data = status_resp.json()
        self.assertTrue(status_data.get("success"))
        self.assertEqual(status_data.get("data", {}).get("status"), "tracked")
        changes = status_data.get("data", {}).get("changes", [])
        self.assertGreater(len(changes), 0)

        # Commit changes
        commit_resp = self.client.post("/git/commit", json={"message": "initial test commit"})
        self.assertEqual(commit_resp.status_code, 200)
        commit_data = commit_resp.json()
        self.assertTrue(commit_data.get("success"))

        # Check git status again (working tree clean)
        clean_status = self.client.get("/git/status")
        clean_changes = clean_status.json().get("data", {}).get("changes", [])
        self.assertEqual(len(clean_changes), 0)

    # 11. Config Endpoint
    def test_11_config_endpoints(self):
        resp = self.client.get("/config")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data.get("success"))
        self.assertIn("modelName", data.get("data", {}))

        # Update config
        update_resp = self.client.post("/config", json={"modelName": "nvidia/nemotron-3.5-test"})
        self.assertEqual(update_resp.status_code, 200)
        self.assertEqual(update_resp.json().get("data", {}).get("modelName"), "nvidia/nemotron-3.5-test")

    # 12. Directory path preview rejection
    def test_12_directory_path_preview_rejection(self):
        self.client.post("/workspace/open", json={"path": self.test_dir})
        sub_dir = os.path.join(self.test_dir, "subdir")
        os.makedirs(sub_dir, exist_ok=True)
        # Attempt preview on directory
        resp = self.client.post("/edit/preview", json={
            "filePath": "subdir",
            "proposedContent": "not allowed",
            "operation": "replace"
        })
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertFalse(data.get("success"))
        self.assertEqual(data.get("error", {}).get("code"), "PREVIEW_ERROR")
        self.assertIn("directory", data.get("error", {}).get("detail", "").lower())

    # 13. Preview expiration enforcement
    def test_13_preview_expiration(self):
        from datetime import datetime, timezone, timedelta
        self.client.post("/workspace/open", json={"path": self.test_dir})
        prev_resp = self.client.post("/edit/preview", json={
            "filePath": "calc.py",
            "proposedContent": "# expired",
            "operation": "replace"
        })
        pid = prev_resp.json().get("data", {}).get("id")
        self.assertIsNotNone(pid)
        # Manually backdate expiration in pending_previews
        tool_runtime.pending_previews[pid]["expires_at"] = datetime.now(timezone.utc) - timedelta(seconds=10)

        apply_resp = self.client.post("/edit/apply", json={"previewId": pid})
        data = apply_resp.json()
        self.assertFalse(data.get("success"))
        self.assertEqual(data.get("error", {}).get("code"), "PREVIEW_EXPIRED")

    # 14. Symbols filtering by kind and query
    def test_14_symbols_query_and_kind_filter(self):
        self.client.post("/workspace/open", json={"path": self.test_dir})
        self.client.post("/workspace/index")

        # Kind filter = function
        fn_resp = self.client.get("/workspace/symbols?kind=function")
        fn_data = fn_resp.json()
        self.assertTrue(fn_data.get("success"))
        for sym in fn_data.get("data", {}).get("symbols", []):
            self.assertEqual(sym.get("kind"), "function")

        # Query filter = Calc
        query_resp = self.client.get("/workspace/symbols?query=Calc")
        query_data = query_resp.json()
        self.assertTrue(query_data.get("success"))
        symbols = query_data.get("data", {}).get("symbols", [])
        self.assertGreaterEqual(len(symbols), 1)
        self.assertTrue(any("calc" in s["name"].lower() or "calc" in s["filePath"].lower() for s in symbols))

    # 15. Git commit on clean tree returns NOTHING_TO_COMMIT
    def test_15_git_commit_clean_tree(self):
        import subprocess
        self.client.post("/workspace/open", json={"path": self.test_dir})
        subprocess.run(["git", "init"], cwd=self.test_dir, capture_output=True, check=True)
        subprocess.run(["git", "config", "user.name", "Intellego Test"], cwd=self.test_dir, capture_output=True, check=True)
        subprocess.run(["git", "config", "user.email", "test@intellego.ai"], cwd=self.test_dir, capture_output=True, check=True)
        # Initial commit
        self.client.post("/git/commit", json={"message": "initial commit"})
        # Second commit with nothing staged/changed
        clean_resp = self.client.post("/git/commit", json={"message": "empty commit"})
        data = clean_resp.json()
        self.assertFalse(data.get("success"))
        self.assertEqual(data.get("error", {}).get("code"), "NOTHING_TO_COMMIT")

    # 16. Workspace close clears pending previews
    def test_16_workspace_close_clears_previews(self):
        self.client.post("/workspace/open", json={"path": self.test_dir})
        prev_resp = self.client.post("/edit/preview", json={
            "filePath": "calc.py",
            "proposedContent": "# preview to clear",
            "operation": "replace"
        })
        pid = prev_resp.json().get("data", {}).get("id")
        self.assertIn(pid, tool_runtime.pending_previews)

        self.client.post("/workspace/close")
        self.assertNotIn(pid, tool_runtime.pending_previews)

if __name__ == "__main__":
    unittest.main()
