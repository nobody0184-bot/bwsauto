@echo off
REM BWS Automation - Reset and run 50 parallel browsers (headless)
title BWS Automation - Reset + 50 Parallel (Headless)
echo Resetting all done/invalid files and starting 50 PARALLEL browsers...
echo WARNING: This will use significant system resources!
node run.js --reset --parallel 50 --headless
pause
