@echo off
echo Starting EASY-LEARN Backend Server on http://localhost:8000 ...
cd /d "%~dp0backend"
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
pause
