@echo off
setlocal EnableDelayedExpansion
title Intellego Setup and Dependency Installer

:: Configuration & Setup Paths
set "ROOT_DIR=%~dp0"
set "LOG_FILE=%ROOT_DIR%setup.log"
set "ENGINE_DIR=%ROOT_DIR%engine"
set "APP_DIR=%ROOT_DIR%app"

:: Check and auto-discover Python if not in system PATH
set "PYTHON_EXE=python"
python --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" (
        set "PYTHON_EXE=%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
        set "PATH=%LOCALAPPDATA%\Programs\Python\Python312;%LOCALAPPDATA%\Programs\Python\Python312\Scripts;!PATH!"
    ) else if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" (
        set "PYTHON_EXE=%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
        set "PATH=%LOCALAPPDATA%\Programs\Python\Python311;%LOCALAPPDATA%\Programs\Python\Python311\Scripts;!PATH!"
    ) else if exist "C:\Python312\python.exe" (
        set "PYTHON_EXE=C:\Python312\python.exe"
        set "PATH=C:\Python312;C:\Python312\Scripts;!PATH!"
    ) else if exist "C:\Python311\python.exe" (
        set "PYTHON_EXE=C:\Python311\python.exe"
        set "PATH=C:\Python311;C:\Python311\Scripts;!PATH!"
    )
)

:: Clear previous session log
echo ================================================================= > "%LOG_FILE%"
echo   INTELLEGO INSTALLATION LOG - %DATE% %TIME% >> "%LOG_FILE%"
echo ================================================================= >> "%LOG_FILE%"

cls
color 0B
echo.
echo  ======================================================================
echo     ___ _   _ _____ _____ _     _     _____ ____  ___  
echo    ^|_ _^| \ ^| ^|_   _^| ____^| ^|   ^| ^|   ^| ____/ ___^|/ _ \ 
echo     ^| ^| ^|  \^| ^| ^| ^| ^|  _^| ^| ^|   ^| ^|   ^|  _^|^| ^|  _^| ^| ^| ^|
echo     ^| ^| ^| ^|\  ^| ^| ^| ^| ^|___^| ^|___^| ^|___^| ^|___^| ^|_^| ^| ^|_^| ^|
echo    ^|___^|_^| \_^| ^|_^| ^|_____^|_____^|_____^|_____^|\____^|\___/ 
echo.
echo           -- Automated Environment and Dependency Provisioner --
echo  ======================================================================
echo.
echo  [i] All actions are logged to: setup.log
echo.

:: ---------------------------------------------------------
:: STEP 1: Verify System Prerequisites (Python, Node, Git)
:: ---------------------------------------------------------
echo ============================================================================
echo  STEP 1: VERIFYING SYSTEM PREREQUISITES
echo ============================================================================
echo.

call :RUN_WITH_SPINNER "Checking Python installation..." "\"!PYTHON_EXE!\" --version"
if %ERRORLEVEL% neq 0 (
    echo.
    echo  [ERROR] Python is not installed or not in PATH!
    echo  [ERROR] Python could not be detected >> "%LOG_FILE%"
    goto :FAIL
)

call :RUN_WITH_SPINNER "Checking Node.js..." "node --version"
if %ERRORLEVEL% neq 0 (
    echo.
    echo  [ERROR] Node.js is not installed or not in PATH!
    echo  [ERROR] Node.js is not in PATH >> "%LOG_FILE%"
    goto :FAIL
)

call :RUN_WITH_SPINNER "Checking NPM package manager..." "npm --version"
if %ERRORLEVEL% neq 0 (
    echo.
    echo  [ERROR] NPM is not installed or not in PATH!
    echo  [ERROR] NPM is not in PATH >> "%LOG_FILE%"
    goto :FAIL
)

call :RUN_WITH_SPINNER "Checking Git installation..." "git --version"
if %ERRORLEVEL% neq 0 (
    echo.
    echo  [WARNING] Git was not found in PATH. Some VCS features may be disabled.
    echo  [WARNING] Git not in PATH >> "%LOG_FILE%"
)
echo.

:: ---------------------------------------------------------
:: STEP 2: Configure Environment (.env)
:: ---------------------------------------------------------
echo ============================================================================
echo  STEP 2: ENVIRONMENT CONFIGURATION
echo ============================================================================
echo.

if not exist "%ROOT_DIR%.env" (
    if exist "%ROOT_DIR%.env.example" (
        call :RUN_WITH_SPINNER "Creating root .env from template..." "copy /Y \"%ROOT_DIR%.env.example\" \"%ROOT_DIR%.env\""
    )
) else (
    echo   [OK]   [================] Root .env already exists.
)

if not exist "%ENGINE_DIR%\.env" (
    if exist "%ROOT_DIR%.env" (
        call :RUN_WITH_SPINNER "Syncing .env to engine directory..." "copy /Y \"%ROOT_DIR%.env\" \"%ENGINE_DIR%\.env\""
    )
) else (
    echo   [OK]   [================] Engine .env already exists.
)
echo.

:: ---------------------------------------------------------
:: STEP 3: Setup Python Engine & Virtual Environment
:: ---------------------------------------------------------
echo ============================================================================
echo  STEP 3: BACKEND PYTHON ENGINE SETUP
echo ============================================================================
echo.

if not exist "%ENGINE_DIR%\.venv" (
    call :RUN_WITH_SPINNER "Creating Python virtual environment (.venv)..." "\"!PYTHON_EXE!\" -m venv \"%ENGINE_DIR%\.venv\""
    if %ERRORLEVEL% neq 0 (
        echo  [ERROR] Failed to create virtual environment!
        goto :FAIL
    )
) else (
    echo   [OK]   [================] Python virtual environment already present (.venv).
)

call :RUN_WITH_SPINNER "Upgrading pip, setuptools, and wheel..." "\"%ENGINE_DIR%\.venv\Scripts\python.exe\" -m pip install --upgrade pip setuptools wheel"

if exist "%ENGINE_DIR%\requirements.txt" (
    call :RUN_WITH_SPINNER "Installing engine requirements (FastAPI, Uvicorn, etc.)..." "\"%ENGINE_DIR%\.venv\Scripts\python.exe\" -m pip install -r \"%ENGINE_DIR%\requirements.txt\""
    if %ERRORLEVEL% neq 0 (
        echo  [ERROR] Failed to install Python dependencies!
        goto :FAIL
    )
) else (
    echo  [WARNING] No requirements.txt found in engine/!
)
echo.

:: ---------------------------------------------------------
:: STEP 4: Setup Desktop App & NPM Dependencies
:: ---------------------------------------------------------
echo ============================================================================
echo  STEP 4: FRONTEND DESKTOP APP SETUP (ELECTRON + REACT)
echo ============================================================================
echo.

if exist "%APP_DIR%\package.json" (
    pushd "%APP_DIR%"
    call :RUN_WITH_SPINNER "Installing Node modules via npm install..." "cmd /c npm install"
    set "NPM_ERR=!ERRORLEVEL!"
    popd
    if !NPM_ERR! neq 0 (
        echo  [ERROR] Failed to install NPM dependencies!
        goto :FAIL
    )
) else (
    echo  [WARNING] package.json not found in app/!
)
echo.

:: ---------------------------------------------------------
:: SUCCESS SCREEN
:: ---------------------------------------------------------
echo ============================================================================
echo  INSTALLATION COMPLETED SUCCESSFULLY!
echo ============================================================================
echo.
echo  [+] Python Virtualenv created/updated in engine/.venv
echo  [+] Backend Python packages installed
echo  [+] Frontend Electron/React packages installed
echo  [+] All actions logged to: setup.log
echo.
echo  ----------------------------------------------------------------------
echo  How to start Intellego:
echo    1. Start Backend:
echo       cd engine ^&^& .venv\Scripts\activate ^&^& uvicorn main:app --host 127.0.0.1 --port 8000
echo    2. Start Frontend:
echo       cd app ^&^& npm run dev
echo  ----------------------------------------------------------------------
echo.
if "%~1"=="--no-pause" goto :EOF
pause
exit /b 0

:: ---------------------------------------------------------
:: SPINNER & ANIMATION ENGINE
:: Arguments: %1 = Task Description, %2 = Command to execute
:: ---------------------------------------------------------
:RUN_WITH_SPINNER
set "TASK_DESC=%~1"
set "TASK_CMD=%~2"
set "TEMP_SCRIPT=%TEMP%\task_%RANDOM%.bat"
set "DONE_FLAG=%TEMP%\task_done_%RANDOM%.flag"

echo [%DATE% %TIME%] STARTING: %TASK_DESC% >> "%LOG_FILE%"
echo [%DATE% %TIME%] COMMAND: %TASK_CMD% >> "%LOG_FILE%"

:: Build worker script that runs the command and captures output
> "%TEMP_SCRIPT%" (
    echo @echo off
    echo %TASK_CMD% ^>^> "%LOG_FILE%" 2^>^&1
    echo echo %%ERRORLEVEL%% ^> "%DONE_FLAG%"
)

:: Launch background worker
start /B "" cmd /c "%TEMP_SCRIPT%"

:: Live ASCII animation loop driven by PowerShell script
powershell -NoProfile -Command ^
    "$spin = @('|', '/', '-', '\'); $desc = '%TASK_DESC%'; $flag = '%DONE_FLAG%'; $i = 0; while (-not (Test-Path $flag)) { $g = $spin[$i %% 4]; $bar = ('=' * ($i %% 16)).PadRight(16, ' '); [Console]::Write(\"`r  [\" + $g + \"] [\" + $bar + \"] \" + $desc); Start-Sleep -Milliseconds 90; $i++; }"

set /p TASK_EXIT=<"%DONE_FLAG%"
del /q "%TEMP_SCRIPT%" "%DONE_FLAG%" >nul 2>&1

if "%TASK_EXIT%"=="0" (
    powershell -NoProfile -Command "[Console]::WriteLine(\"`r  [OK]   [================] \" + '%TASK_DESC%' + \"                    \")"
    echo [%DATE% %TIME%] SUCCESS: %TASK_DESC% >> "%LOG_FILE%"
) else (
    powershell -NoProfile -Command "[Console]::WriteLine(\"`r  [FAIL] [----------------] \" + '%TASK_DESC%' + \" (Code: \" + '%TASK_EXIT%' + \")\")"
    echo [%DATE% %TIME%] FAILED: %TASK_DESC% (Code: %TASK_EXIT%^) >> "%LOG_FILE%"
)

exit /b %TASK_EXIT%

:: ---------------------------------------------------------
:: FAILURE HANDLER
:: ---------------------------------------------------------
:FAIL
echo.
echo ============================================================================
echo  [X] INSTALLATION FAILED!
echo ============================================================================
echo  Review setup.log for full command traces and diagnostic information.
echo.
if "%~1"=="--no-pause" goto :EOF
pause
exit /b 1
