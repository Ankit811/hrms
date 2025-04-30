@echo off
cd /d %~dp0
echo ----------------------------------------
echo Git Auto Push Script for HRMS
echo ----------------------------------------
set /p msg=Enter commit message: 

git add .
git commit -m "%msg%"
git push

echo ----------------------------------------
echo Code pushed successfully to GitHub!
pause
