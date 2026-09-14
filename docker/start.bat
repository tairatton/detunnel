@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..") do set "PROJECT_ROOT=%%~fI"

pushd "%PROJECT_ROOT%"
if errorlevel 1 (
    echo [ERROR] Could not open the DETUNNEL project directory.
    exit /b 1
)

echo =======================================================
echo   Starting DETUNNEL Docker service
echo =======================================================

if not exist workspace (
    mkdir workspace
    echo Created ./workspace directory for your project files.
)

if not exist "%SCRIPT_DIR%.env" (
    if exist "%SCRIPT_DIR%.env.example" (
        copy "%SCRIPT_DIR%.env.example" "%SCRIPT_DIR%.env" >nul
        echo Created docker/.env from template.
    )
)

echo.
echo Building and launching detunnel container...
docker compose -f "%SCRIPT_DIR%compose.yml" up -d --build

if errorlevel 1 (
    echo [ERROR] Failed to start Docker container. Please ensure Docker Desktop is running.
    pause
    popd
    exit /b 1
)

echo.
echo =======================================================
echo   DETUNNEL is running successfully!
echo   MCP Endpoint: http://127.0.0.1:18765/mcp (default)
echo   Workspace:    %PROJECT_ROOT%\workspace
echo =======================================================
echo.
echo Useful commands:
echo   - View logs: docker compose -f docker/compose.yml logs -f
echo   - Stop:      docker compose -f docker/compose.yml down
echo.
pause
popd
