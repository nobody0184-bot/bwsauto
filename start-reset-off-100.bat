@echo off
REM BWS Automation - Reset and run 100 parallel browsers (headless)
title BWS Automation - Reset + 100 Parallel (Headless)
echo Resetting all done/invalid files and starting 100 PARALLEL browsers...
echo WARNING: This will use significant system resources!
node run.js --reset --parallel 100 --headless
pause
