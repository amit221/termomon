---
name: energy
description: Show current energy level
---

1. Call the compi `energy` MCP tool to check energy.
2. Then run this Bash command to display it with colors:
   ```
   cat "$LOCALAPPDATA/Temp/compi_display.txt" && rm -f "$LOCALAPPDATA/Temp/compi_display.txt"
   ```
