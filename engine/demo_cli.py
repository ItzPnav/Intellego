import os
import sys
import time
import subprocess
import httpx
import json

API_URL = "http://127.0.0.1:8000"

def start_backend():
    """Start uvicorn sidecar backend if it's not already running."""
    try:
        # Check if already running
        with httpx.Client(timeout=1.0) as client:
            resp = client.get(f"{API_URL}/health")
            if resp.status_code == 200:
                print("Connected to running Intellego Backend Engine.")
                return None
    except Exception:
        pass

    print("Starting Intellego Backend Engine uvicorn sidecar...")
    # Spawn uvicorn process
    python_exe = os.path.join(".venv", "Scripts", "python.exe")
    if not os.path.exists(python_exe):
        python_exe = "python" # fallback
        
    process = subprocess.Popen(
        [python_exe, "-m", "uvicorn", "main:app", "--port", "8000", "--host", "127.0.0.1", "--log-level", "warning"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    
    # Wait for startup
    retries = 10
    for i in range(retries):
        time.sleep(0.5)
        try:
            with httpx.Client(timeout=0.5) as client:
                if client.get(f"{API_URL}/health").status_code == 200:
                    print("Backend Engine successfully started and connected.")
                    return process
        except Exception:
            pass
            
    print("Error: Could not start backend engine sidecar.")
    if process:
        process.terminate()
    sys.exit(1)

def print_diff(diff_text: str):
    """Print diff with red/green colors in console."""
    for line in diff_text.splitlines():
        if line.startswith("+") and not line.startswith("+++"):
            print(f"\033[92m{line}\033[0m") # Green
        elif line.startswith("-") and not line.startswith("---"):
            print(f"\033[91m{line}\033[0m") # Red
        elif line.startswith("@@"):
            print(f"\033[36m{line}\033[0m") # Cyan
        else:
            print(line)

def run_cli():
    backend_process = start_backend()
    
    try:
        client = httpx.Client(timeout=60.0)
        
        # 1. Open Workspace
        default_path = os.path.abspath(os.path.join(os.getcwd(), ".."))
        print(f"\nDefault path: {default_path}")
        ws_path = input("Enter workspace folder path to open [Press Enter for default]: ").strip()
        if not ws_path:
            ws_path = default_path
            
        print(f"Opening workspace: {ws_path}...")
        resp = client.post(f"{API_URL}/workspace/open", json={"path": ws_path})
        res_json = resp.json()
        
        if not res_json.get("success"):
            print(f"Error opening workspace: {res_json.get('error', {}).get('detail', 'Unknown error')}")
            return
            
        data = res_json["data"]
        session_id = data["sessionId"]
        print(f"Workspace opened. Session ID: {session_id}")
        
        # 2. Index Workspace
        print("Indexing workspace files (Building Semantic Knowledge Graph)...")
        resp = client.post(f"{API_URL}/workspace/index")
        idx_json = resp.json()
        if idx_json.get("success"):
            print(f"Indexing completed! Registered {idx_json['data'].get('symbolCount', 0)} symbols.")
        else:
            print(f"Warning: Indexing failed. {idx_json.get('error', {}).get('detail')}")

        # 3. Chat Loop
        print("\n=== Intellego AI Engineer CLI Terminal ===")
        print("Type '/exit' to quit, '/git' to check git status, or '/acp' to auto-commit and push.")
        print("Ask any question or command (e.g. 'create helper.py to greet users')\n")
        
        while True:
            try:
                user_msg = input("\033[1mYou > \033[0m").strip()
                if not user_msg:
                    continue
                if user_msg.lower() == "/exit":
                    break
                    
                if user_msg.lower() == "/git":
                    # Check git status
                    git_resp = client.get(f"{API_URL}/git/status").json()
                    if git_resp.get("success"):
                        changes = git_resp["data"].get("changes", [])
                        if not changes:
                            print("Git status: No changes detected (clean working tree).")
                        else:
                            print("Git Changes:")
                            for c in changes:
                                print(f"  [{c['state']}] {c['file']}")
                    else:
                        print("Failed to get git status.")
                    continue
                    
                # Standard Chat call
                print("\033[1mAssistant > \033[0m", end="", flush=True)
                
                # Streaming call
                previews = []
                assistant_response = ""
                
                with client.stream("POST", f"{API_URL}/chat/stream", json={"message": user_msg, "sessionId": session_id}) as r:
                    for chunk in r.iter_text():
                        if "__INTELLEGO_PREVIEW_JSON__:" in chunk:
                            parts = chunk.split("__INTELLEGO_PREVIEW_JSON__:")
                            # Print text before delimiter
                            print(parts[0], end="", flush=True)
                            assistant_response += parts[0]
                            # Parse JSON previews
                            try:
                                previews = json.loads(parts[1])
                            except Exception as e:
                                print(f"\n[Error parsing preview JSON: {e}]")
                        else:
                            print(chunk, end="", flush=True)
                            assistant_response += chunk
                print("\n")
                
                # Process Previews if generated
                if previews:
                    for preview in previews:
                        print("=" * 60)
                        print(f"PROPOSED EDIT PREVIEW: {preview['filePath']} ({preview['operation']})")
                        print("=" * 60)
                        print_diff(preview["diff"])
                        print("=" * 60)
                        
                        ans = input(f"Apply these changes to {preview['filePath']}? (y/n): ").strip().lower()
                        if ans == "y":
                            app_resp = client.post(f"{API_URL}/edit/apply", json={"previewId": preview["id"]})
                            app_json = app_resp.json()
                            if app_json.get("success"):
                                print(f"\033[92mSuccess: {app_json.get('message')}\033[0m\n")
                            else:
                                print(f"\033[91mError: {app_json.get('error', {}).get('detail', 'Failed to apply')}\033[0m\n")
                        else:
                            print("Changes discarded.\n")
                            
            except KeyboardInterrupt:
                print("\nType '/exit' to close session.")
                
    finally:
        if backend_process:
            print("Stopping backend engine server...")
            backend_process.terminate()
            backend_process.wait()
            print("Backend server stopped.")

if __name__ == "__main__":
    # OS colors support on Windows
    os.system("")
    run_cli()
