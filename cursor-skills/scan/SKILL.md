---
name: scan
description: Show nearby creatures that can be caught
---

1. Call the compi `scan` MCP tool to scan for nearby creatures.
2. Then run this Bash command to open the colored result:
   ```
   start "" "$LOCALAPPDATA/Temp/compi_display.html"
   ```

After both steps, count the creatures from the MCP response and respond with ONLY:
"You found [N] compis! Check the browser tab for the colored display."

Do NOT describe or list the creatures.
