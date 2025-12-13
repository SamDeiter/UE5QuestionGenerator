@echo off
REM Batch wrapper for Python MCP server
REM Ensures clean stdio handling on Windows
setlocal EnableDelayedExpansion

set PYTHON_PATH=C:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\.venv\Scripts\python.exe
set SERVER_PATH=C:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\optimized_performance_server.py

REM Run Python with unbuffered output and UTF-8 encoding
"%PYTHON_PATH%" -u -X utf8 "%SERVER_PATH%" 2>nul
