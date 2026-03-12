#!/bin/bash
# =============================================================================
# ProTra Helper App - End-to-End Test Checklist
# =============================================================================
# Part C: Guided E2E test combining Helper App + Backend + Frontend
#
# This script runs automated pre-checks, then guides through manual steps.
#
# Usage:
#   bash tests/test-e2e-checklist.sh
# =============================================================================

set -euo pipefail

HELPER_URL="http://localhost:3001"
BACKEND_URL="${1:-http://localhost:3000}"
FRONTEND_URL="${2:-http://localhost:4200}"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo "============================================="
echo " ProTra Helper App - E2E Test Checklist"
echo "============================================="
echo ""

# -----------------------------------------------
# Automated Pre-checks
# -----------------------------------------------
echo -e "${BOLD}--- Automated Pre-checks ---${NC}"
echo ""

# Check Helper App
echo -n "  Checking Helper App at $HELPER_URL... "
HELPER_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HELPER_URL/status" 2>/dev/null || echo "000")
if [ "$HELPER_STATUS" = "200" ]; then
  HELPER_VERSION=$(curl -s "$HELPER_URL/status" 2>/dev/null | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
  echo -e "${GREEN}Running (v$HELPER_VERSION)${NC}"
else
  echo -e "${RED}Not reachable (HTTP $HELPER_STATUS)${NC}"
  echo -e "  ${YELLOW}Start the Helper App before running E2E tests.${NC}"
fi

# Check Backend
echo -n "  Checking Backend at $BACKEND_URL... "
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/helper-app/info" 2>/dev/null || echo "000")
if [ "$BACKEND_STATUS" = "200" ]; then
  echo -e "${GREEN}Running${NC}"
else
  echo -e "${RED}Not reachable (HTTP $BACKEND_STATUS)${NC}"
fi

# Check Frontend
echo -n "  Checking Frontend at $FRONTEND_URL... "
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" 2>/dev/null || echo "000")
if [ "$FRONTEND_STATUS" = "200" ]; then
  echo -e "${GREEN}Running${NC}"
else
  echo -e "${RED}Not reachable (HTTP $FRONTEND_STATUS)${NC}"
fi

echo ""

# -----------------------------------------------
# Manual E2E Checklist
# -----------------------------------------------
echo -e "${BOLD}--- Manual E2E Test Steps ---${NC}"
echo ""
echo "Follow these steps and mark each as pass/fail:"
echo ""

STEPS=(
  "1. Helper App tray icon is visible in Windows taskbar"
  "2. http://localhost:3001/status returns 'running' in browser"
  "3. Open ProTra Web-App and log in"
  "4. Dashboard loads -> Onboarding dialog appears (first time)"
  "5. Click 'Automatisch verbinden' in onboarding dialog"
  "6. Pairing completes successfully (green checkmark)"
  "7. Go to Settings page -> Status shows 'Verbunden'"
  "8. Open a Grasshopper file via Launch button in Web-App"
  "9. Rhino 8 opens with the Grasshopper file loaded"
  "10. Tray menu: Right-click -> 'API Token anzeigen' shows dialog"
  "11. Tray menu: 'Logs oeffnen' opens Explorer at log directory"
  "12. Tray menu: 'Beenden' closes the Helper App"
)

echo -e "${CYAN}Checklist:${NC}"
for step in "${STEPS[@]}"; do
  echo "  [ ] $step"
done

echo ""
echo -e "${BOLD}--- Additional Checks ---${NC}"
echo ""
echo "  [ ] Auth Interceptor: Browser DevTools -> Network tab"
echo "      - Requests to localhost:3001 do NOT have Authorization header"
echo "      - Requests to backend DO have Authorization header"
echo ""
echo "  [ ] Onboarding suppression: After dismissing onboarding,"
echo "      reload page -> dialog should NOT reappear (sessionStorage)"
echo ""
echo "  [ ] Settings page 'Unpair' button: Click -> status changes to 'Disconnected'"
echo ""
echo "  [ ] After unpairing, re-open onboarding -> pair again"
echo ""

# -----------------------------------------------
# Log locations
# -----------------------------------------------
echo -e "${BOLD}--- Log Locations (if debugging needed) ---${NC}"
echo ""
echo "  Helper App: %APPDATA%/ProTra Helfer/logs/"
echo "  Backend:    Server console / deployment logs"
echo "  Frontend:   Browser DevTools -> Console + Network tabs"
echo ""
echo "============================================="
echo " Done. Complete the manual checklist above."
echo "============================================="
