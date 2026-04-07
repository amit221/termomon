---
name: status
description: View your player profile and game stats
---

1. Call the compi `status` MCP tool to view player stats.
2. Then run this Bash command to display it with colors:
   ```
   cat "$LOCALAPPDATA/Temp/compi_display.txt" && rm -f "$LOCALAPPDATA/Temp/compi_display.txt"
   ```
