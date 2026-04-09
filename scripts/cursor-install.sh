#!/usr/bin/env bash
# scripts/cursor-install.sh
#
# Install the Compi plugin into Cursor's local plugin directory for testing.
# Run after `npm run build`. Restart Cursor after running this script.
#
# Usage: bash scripts/cursor-install.sh

set -euo pipefail

PLUGIN_NAME="compi"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Determine Cursor plugin directory (cross-platform)
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]]; then
  CURSOR_PLUGINS="$USERPROFILE/.cursor/plugins"
  CLAUDE_DIR="$USERPROFILE/.claude"
else
  CURSOR_PLUGINS="$HOME/.cursor/plugins"
  CLAUDE_DIR="$HOME/.claude"
fi

INSTALL_DIR="$CURSOR_PLUGINS/$PLUGIN_NAME"

echo "=== Compi Cursor Plugin Installer ==="
echo ""
echo "Source:  $REPO_ROOT"
echo "Target:  $INSTALL_DIR"
echo ""

# 1. Check dist/ exists
if [ ! -f "$REPO_ROOT/dist/cli.js" ]; then
  echo "ERROR: dist/ not found. Run 'npm run build' first."
  exit 1
fi

# 2. Clean previous install
if [ -d "$INSTALL_DIR" ]; then
  echo "Removing previous install..."
  rm -rf "$INSTALL_DIR"
fi

# 3. Create target directory
mkdir -p "$INSTALL_DIR"

# 4. Copy plugin files
echo "Copying plugin files..."
cp -r "$REPO_ROOT/.cursor-plugin" "$INSTALL_DIR/.cursor-plugin"
cp -r "$REPO_ROOT/cursor-skills" "$INSTALL_DIR/cursor-skills"
cp -r "$REPO_ROOT/hooks" "$INSTALL_DIR/hooks"
cp -r "$REPO_ROOT/scripts" "$INSTALL_DIR/scripts"
cp -r "$REPO_ROOT/dist" "$INSTALL_DIR/dist"
cp -r "$REPO_ROOT/config" "$INSTALL_DIR/config"
cp "$REPO_ROOT/package.json" "$INSTALL_DIR/package.json"

# 5. Copy node_modules (needed for MCP server runtime deps)
if [ -d "$REPO_ROOT/node_modules" ]; then
  echo "Copying node_modules..."
  cp -r "$REPO_ROOT/node_modules" "$INSTALL_DIR/node_modules"
fi

# 6. Register plugin in installed_plugins.json
PLUGINS_JSON="$CLAUDE_DIR/plugins/installed_plugins.json"
mkdir -p "$(dirname "$PLUGINS_JSON")"

COMPI_PLUGINS_JSON="$PLUGINS_JSON" COMPI_INSTALL_DIR="$INSTALL_DIR" COMPI_PLUGIN_NAME="$PLUGIN_NAME" \
  node -e '
    const fs = require("fs");
    const p = process.env.COMPI_PLUGINS_JSON;
    const installDir = process.env.COMPI_INSTALL_DIR;
    const name = process.env.COMPI_PLUGIN_NAME + "@local";
    let data = {};
    try { data = JSON.parse(fs.readFileSync(p, "utf8")); } catch {}
    if (!data.plugins) data.plugins = {};
    data.plugins[name] = [{ scope: "user", installPath: installDir }];
    fs.writeFileSync(p, JSON.stringify(data, null, 2));
    console.log("Registered plugin in " + p);
  '

# 7. Enable plugin in settings.json
SETTINGS_JSON="$CLAUDE_DIR/settings.json"

COMPI_SETTINGS_JSON="$SETTINGS_JSON" COMPI_PLUGIN_NAME="$PLUGIN_NAME" \
  node -e '
    const fs = require("fs");
    const p = process.env.COMPI_SETTINGS_JSON;
    const name = process.env.COMPI_PLUGIN_NAME + "@local";
    let data = {};
    try { data = JSON.parse(fs.readFileSync(p, "utf8")); } catch {}
    if (!data.enabledPlugins) data.enabledPlugins = {};
    data.enabledPlugins[name] = true;
    fs.writeFileSync(p, JSON.stringify(data, null, 2));
    console.log("Enabled plugin in " + p);
  '

echo ""
echo "Done! Restart Cursor to load the plugin."
echo "Check Settings > Plugins to verify it appears."
