---
name: catch
description: Attempt to catch a nearby creature
---

Parse the argument for which creature number (1-indexed) from the scan list.

Usage: `/catch [number]`

1. Call the compi `catch` MCP tool with the parsed `index` (number).
2. Then run this Bash command to open the colored result:
   ```
   start "" "$LOCALAPPDATA/Temp/compi_display.html"
   ```

Do NOT describe the catch result.
