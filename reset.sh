#!/bin/bash
# BWS Automation - Reset all done/invalid files only
echo "Resetting all done/invalid files..."
node run.js --reset
echo ""
echo "Reset complete! You can now run any start script."
