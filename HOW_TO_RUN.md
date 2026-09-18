# How to Run Intellego

Intellego consists of two main components that need to be run concurrently in separate terminal windows:
1. **Engine** (Python/FastAPI Backend)
2. **App** (Electron/React Frontend)

## Prerequisites
- **Node.js** (v18 or higher recommended)
- **Python** (v3.9 or higher recommended)
- **Git** (for repository indexing features)

---

## Step 1: Start the Backend Engine

The backend must be running before you start the frontend. It binds securely to `127.0.0.1:8000`.

1. Open a new terminal and navigate to the project directory.
2. Navigate to the `engine` directory:
   ```bash
   cd engine
   ```
3. Create and activate a Python virtual environment (if you haven't already):
   ```bash
   python -m venv .venv
   
   # Activate on Windows:
   .venv\Scripts\activate
   
   # Activate on macOS/Linux:
   source .venv/bin/activate
   ```
4. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```
   *(Note: If `requirements.txt` is missing, run `pip install fastapi uvicorn httpx websockets`)*
5. Configure your environment variables:
   - Copy `.env.example` to a new file named `.env`
   - Open `.env` and add your `NEMOTRON_API_KEY`
6. Start the FastAPI server:
   ```bash
   uvicorn main:app --host 127.0.0.1 --port 8000
   ```
   *(Leave this terminal window running)*

---

## Step 2: Start the Frontend App

Once the backend is running, you can launch the desktop application.

1. Open a **second** terminal window and navigate to the project directory.
2. Navigate to the `app` directory:
   ```bash
   cd app
   ```
3. Install the Node dependencies:
   ```bash
   npm install
   ```
4. Start the Electron desktop app:
   ```bash
   npm run dev
   ```
   *(Depending on your package.json, this might also be `npm start`)*

---

## Troubleshooting

- **404 / API Key Errors**: Ensure your `.env` file is properly created in the `engine/` directory and contains a valid NVIDIA Nemotron API key.
- **Port Conflicts**: Ensure nothing else on your machine is running on port `8000` (Backend) or the Vite development port (usually `5173`).
- **Connection Refused**: Double-check that your backend is actively running and bound to `127.0.0.1`. The frontend requires the backend to function.
