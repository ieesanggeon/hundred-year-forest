@echo off
setlocal
chcp 65001 >nul
title Hundred Year Forest - Game Server
pushd "%~dp0"
if errorlevel 1 goto directory_error
if not exist "index.html" goto files_error
if not exist "dist\game.bundle.js" goto files_error

set "RPG_NODE="
for /f "delims=" %%N in ('where node.exe 2^>nul') do if not defined RPG_NODE set "RPG_NODE=%%N"
if defined RPG_NODE goto run_node
if exist "%ProgramFiles%\nodejs\node.exe" set "RPG_NODE=%ProgramFiles%\nodejs\node.exe"
if defined RPG_NODE goto run_node
if exist "%LocalAppData%\Programs\nodejs\node.exe" set "RPG_NODE=%LocalAppData%\Programs\nodejs\node.exe"
if defined RPG_NODE goto run_node

where py.exe >nul 2>nul
if errorlevel 1 goto find_python
py -3 --version >nul 2>nul
if not errorlevel 1 goto run_py
:find_python
set "RPG_PYTHON="
for /f "delims=" %%P in ('where python.exe 2^>nul') do if /i not "%%~dpP"=="%LocalAppData%\Microsoft\WindowsApps\" if not defined RPG_PYTHON set "RPG_PYTHON=%%P"
if defined RPG_PYTHON goto run_python
echo [ERROR] Install Node.js or Python, then run this file again.
set "RPG_EXIT=1"
goto finish

:run_node
"%RPG_NODE%" "%~dp0server.js" --open %*
set "RPG_EXIT=%errorlevel%"
goto finish
:run_py
set "PYTHONUTF8=1"
py -3 "%~dp0server.py" --open %*
set "RPG_EXIT=%errorlevel%"
goto finish
:run_python
set "PYTHONUTF8=1"
"%RPG_PYTHON%" "%~dp0server.py" --open %*
set "RPG_EXIT=%errorlevel%"
goto finish
:files_error
echo [ERROR] Required game files are missing. Keep this file in the RPG folder.
echo         Required: index.html and dist\game.bundle.js
set "RPG_EXIT=1"
goto finish
:directory_error
echo [ERROR] Cannot open the game folder.
set "RPG_EXIT=1"
goto failed
:finish
popd
if "%RPG_EXIT%"=="0" exit /b 0
:failed
echo.
echo The game could not start. Please check the message above.
if not defined RPG_LAUNCH_NO_PAUSE pause
exit /b 1
