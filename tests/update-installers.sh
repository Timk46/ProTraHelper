#!/bin/bash
# =============================================================================
# Update Helper App Installers from GitHub Actions Artifacts
# =============================================================================
# Downloads the latest build artifacts and copies them to the
# server_nestjs/helper-app-installers/ directory.
#
# Prerequisites:
#   - gh CLI installed and authenticated (https://cli.github.com/)
#   - Run from the repository root
#
# Usage:
#   bash protra-helper-app/tests/update-installers.sh
# =============================================================================

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
INSTALLER_DIR="$REPO_ROOT/server_nestjs/helper-app-installers"
TEMP_DIR=$(mktemp -d)

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

cleanup() {
  rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

echo "============================================="
echo " Update Helper App Installers"
echo "============================================="
echo ""

# Check gh CLI
if ! command -v gh &>/dev/null; then
  echo -e "${RED}Error: gh CLI not found. Install from https://cli.github.com/${NC}"
  exit 1
fi

# Find the latest successful run
echo -e "${CYAN}Finding latest successful build...${NC}"
RUN_ID=$(gh run list --workflow=build-helper-app.yml --status=success --limit=1 --json databaseId --jq '.[0].databaseId' 2>/dev/null)

if [ -z "$RUN_ID" ] || [ "$RUN_ID" = "null" ]; then
  echo -e "${RED}No successful build found. Run the workflow first.${NC}"
  echo "  gh workflow run build-helper-app.yml"
  exit 1
fi

echo "  Latest successful run: #$RUN_ID"

# Download Windows artifact
echo ""
echo -e "${CYAN}Downloading Windows installer...${NC}"
gh run download "$RUN_ID" --name ProTra-Helfer-Windows --dir "$TEMP_DIR/windows" 2>/dev/null || {
  echo -e "${YELLOW}Windows artifact not found or expired (30-day retention)${NC}"
}

# Download macOS artifact
echo -e "${CYAN}Downloading macOS installer...${NC}"
gh run download "$RUN_ID" --name ProTra-Helfer-macOS --dir "$TEMP_DIR/macos" 2>/dev/null || {
  echo -e "${YELLOW}macOS artifact not found or expired (30-day retention)${NC}"
}

# Copy to installer directory
echo ""
echo -e "${CYAN}Updating installer directory: $INSTALLER_DIR${NC}"
echo ""

# List current installers
echo "Current installers:"
ls -la "$INSTALLER_DIR"/*.exe "$INSTALLER_DIR"/*.dmg 2>/dev/null || echo "  (none)"
echo ""

# Copy Windows EXE
if ls "$TEMP_DIR/windows/"*.exe 1>/dev/null 2>&1; then
  for exe in "$TEMP_DIR/windows/"*.exe; do
    FILENAME=$(basename "$exe")
    echo -e "  ${GREEN}Copying:${NC} $FILENAME"
    cp "$exe" "$INSTALLER_DIR/"
  done
else
  echo -e "  ${YELLOW}No Windows EXE found in artifacts${NC}"
fi

# Copy macOS DMG
if ls "$TEMP_DIR/macos/"*.dmg 1>/dev/null 2>&1; then
  for dmg in "$TEMP_DIR/macos/"*.dmg; do
    FILENAME=$(basename "$dmg")
    echo -e "  ${GREEN}Copying:${NC} $FILENAME"
    cp "$dmg" "$INSTALLER_DIR/"
  done
else
  echo -e "  ${YELLOW}No macOS DMG found in artifacts${NC}"
fi

echo ""
echo "Updated installers:"
ls -la "$INSTALLER_DIR"/*.exe "$INSTALLER_DIR"/*.dmg 2>/dev/null || echo "  (none)"

echo ""
echo -e "${GREEN}Done!${NC}"
echo ""
echo "Next steps:"
echo "  1. Verify the new installers work (run test-helper-app-windows.sh)"
echo "  2. Remove old versions if desired:"
echo "     rm '$INSTALLER_DIR/ProTra Helfer-Setup-1.0.17.exe'"
echo "     rm '$INSTALLER_DIR/ProTra Helfer-Setup-1.0.17.dmg'"
echo "  3. Commit the updated installers"
