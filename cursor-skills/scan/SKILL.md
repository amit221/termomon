---
name: scan
description: Show nearby creatures that can be caught
---

1. Call the compi `scan` MCP tool to scan for nearby creatures.
2. Then run this Bash command to display the result with colors:
   ```
   cat "$LOCALAPPDATA/Temp/compi_display.txt" && rm -f "$LOCALAPPDATA/Temp/compi_display.txt"
   ```

After both steps, count the creatures from the MCP response and respond with ONLY:
"You found [N] compis!"

Do NOT describe or list the creatures.
