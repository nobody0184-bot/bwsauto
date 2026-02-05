@echo off
REM BWS Automation - Reset all done/invalid files only
title BWS Automation - Reset Files
echo Resetting all done/invalid files...
node run.js --reset
echo.
echo Reset complete! You can now run any start script.
pause
