#!/bin/bash
# =============================================================================
# ProTra Helper App - Windows Integration Test Script
# =============================================================================
# Part A: Tests the locally running Helper App on Windows
#
# Prerequisites:
#   - Helper App installed and running (tray icon visible)
#   - curl available (Git Bash or WSL)
#
# Usage:
#   bash tests/test-helper-app-windows.sh [API_TOKEN]
#
# If API_TOKEN is not provided, only unauthenticated tests run.
# =============================================================================

set -euo pipefail

HELPER_APP_URL="http://localhost:3001"
API_TOKEN="${1:-}"
PASS=0
FAIL=0
SKIP=0

# Colors (works in Git Bash / mintty)
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_result() {
  local test_name="$1"
  local status="$2"
  local detail="${3:-}"

  if [ "$status" = "PASS" ]; then
    echo -e "  ${GREEN}[PASS]${NC} $test_name"
    ((PASS++))
  elif [ "$status" = "FAIL" ]; then
    echo -e "  ${RED}[FAIL]${NC} $test_name"
    [ -n "$detail" ] && echo -e "         ${RED}$detail${NC}"
    ((FAIL++))
  elif [ "$status" = "SKIP" ]; then
    echo -e "  ${YELLOW}[SKIP]${NC} $test_name"
    [ -n "$detail" ] && echo -e "         ${YELLOW}$detail${NC}"
    ((SKIP++))
  fi
}

echo "============================================="
echo " ProTra Helper App - Windows Integration Tests"
echo "============================================="
echo ""

# -----------------------------------------------
# Phase 1: Config File Check
# -----------------------------------------------
echo "--- Phase 1: Installation & Config ---"

CONFIG_DIR="$APPDATA/ProTra Helfer/protra-helper-config"
CONFIG_FILE="$CONFIG_DIR/settings.json"

if [ -f "$CONFIG_FILE" ]; then
  print_result "Config file exists at %APPDATA%/ProTra Helfer/" "PASS"

  # Check for required keys
  for key in rhino8Path apiSecretToken setupCompleted corsAllowedOrigins backendUrl; do
    if grep -q "\"$key\"" "$CONFIG_FILE" 2>/dev/null; then
      print_result "Config contains key: $key" "PASS"
    else
      print_result "Config contains key: $key" "FAIL" "Key not found in settings.json"
    fi
  done
else
  print_result "Config file exists" "FAIL" "Not found at: $CONFIG_FILE"
fi

echo ""

# -----------------------------------------------
# Phase 2: Server Status Check
# -----------------------------------------------
echo "--- Phase 2: Server Status ---"

STATUS_RESPONSE=$(curl -s -w "\n%{http_code}" "$HELPER_APP_URL/status" 2>/dev/null || echo -e "\n000")
STATUS_CODE=$(echo "$STATUS_RESPONSE" | tail -1)
STATUS_BODY=$(echo "$STATUS_RESPONSE" | sed '$d')

if [ "$STATUS_CODE" = "200" ]; then
  print_result "GET /status returns 200" "PASS"

  # Check response fields
  for field in status version serverTime rhinoPathConfigured; do
    if echo "$STATUS_BODY" | grep -q "\"$field\""; then
      print_result "/status contains field: $field" "PASS"
    else
      print_result "/status contains field: $field" "FAIL" "Field missing from response"
    fi
  done

  # Check status value
  if echo "$STATUS_BODY" | grep -q '"status":"running"'; then
    print_result "/status reports 'running'" "PASS"
  else
    print_result "/status reports 'running'" "FAIL" "Status is not 'running'"
  fi

  # Check version
  VERSION=$(echo "$STATUS_BODY" | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
  if [ "$VERSION" = "1.0.18" ]; then
    print_result "/status version is 1.0.18" "PASS"
  else
    print_result "/status version is 1.0.18" "FAIL" "Got version: $VERSION"
  fi
else
  print_result "GET /status returns 200" "FAIL" "HTTP $STATUS_CODE - Is the Helper App running?"
  echo ""
  echo -e "${RED}Helper App not reachable. Remaining tests will likely fail.${NC}"
fi

echo ""

# -----------------------------------------------
# Phase 4: Security Tests
# -----------------------------------------------
echo "--- Phase 4: Security (Auth) ---"

# /launch-rhino without token -> 401
AUTH_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$HELPER_APP_URL/launch-rhino" 2>/dev/null || echo -e "\n000")
AUTH_CODE=$(echo "$AUTH_RESPONSE" | tail -1)
AUTH_BODY=$(echo "$AUTH_RESPONSE" | sed '$d')

if [ "$AUTH_CODE" = "401" ]; then
  print_result "POST /launch-rhino without token returns 401" "PASS"
else
  print_result "POST /launch-rhino without token returns 401" "FAIL" "Got HTTP $AUTH_CODE"
fi

# Check error message
if echo "$AUTH_BODY" | grep -q "Authentifizierungstoken fehlt"; then
  print_result "401 error message is correct" "PASS"
else
  print_result "401 error message is correct" "FAIL" "Got: $AUTH_BODY"
fi

# /launch-rhino with wrong token -> 403
WRONG_TOKEN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$HELPER_APP_URL/launch-rhino" \
  -H "x-protra-helper-token: falschertoken" 2>/dev/null || echo -e "\n000")
WRONG_TOKEN_CODE=$(echo "$WRONG_TOKEN_RESPONSE" | tail -1)
WRONG_TOKEN_BODY=$(echo "$WRONG_TOKEN_RESPONSE" | sed '$d')

if [ "$WRONG_TOKEN_CODE" = "403" ]; then
  print_result "POST /launch-rhino with wrong token returns 403" "PASS"
else
  print_result "POST /launch-rhino with wrong token returns 403" "FAIL" "Got HTTP $WRONG_TOKEN_CODE"
fi

if echo "$WRONG_TOKEN_BODY" | grep -qi "ung.*ltig"; then
  print_result "403 error message mentions invalid token" "PASS"
else
  print_result "403 error message mentions invalid token" "FAIL" "Got: $WRONG_TOKEN_BODY"
fi

# /launch-rhino-with-download without token -> 401
DL_AUTH_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$HELPER_APP_URL/launch-rhino-with-download" 2>/dev/null || echo -e "\n000")
DL_AUTH_CODE=$(echo "$DL_AUTH_RESPONSE" | tail -1)

if [ "$DL_AUTH_CODE" = "401" ]; then
  print_result "POST /launch-rhino-with-download without token returns 401" "PASS"
else
  print_result "POST /launch-rhino-with-download without token returns 401" "FAIL" "Got HTTP $DL_AUTH_CODE"
fi

echo ""

# -----------------------------------------------
# Phase 5: Rhino Integration (requires token)
# -----------------------------------------------
echo "--- Phase 5: Rhino Integration ---"

if [ -z "$API_TOKEN" ]; then
  print_result "Launch Rhino with valid token" "SKIP" "No API_TOKEN provided. Pass token as first argument."
  print_result "Launch Rhino with non-existent file" "SKIP" "No API_TOKEN provided."
else
  # Test with non-existent file (should return 400)
  BAD_FILE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$HELPER_APP_URL/launch-rhino" \
    -H "Content-Type: application/json" \
    -H "x-protra-helper-token: $API_TOKEN" \
    -d '{"ghFilePath": "C:\\nicht\\vorhanden.gh"}' 2>/dev/null || echo -e "\n000")
  BAD_FILE_CODE=$(echo "$BAD_FILE_RESPONSE" | tail -1)

  if [ "$BAD_FILE_CODE" = "400" ]; then
    print_result "POST /launch-rhino with non-existent file returns 400" "PASS"
  else
    print_result "POST /launch-rhino with non-existent file returns 400" "FAIL" "Got HTTP $BAD_FILE_CODE"
  fi

  # Test with missing ghFilePath field
  MISSING_FIELD_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$HELPER_APP_URL/launch-rhino" \
    -H "Content-Type: application/json" \
    -H "x-protra-helper-token: $API_TOKEN" \
    -d '{}' 2>/dev/null || echo -e "\n000")
  MISSING_FIELD_CODE=$(echo "$MISSING_FIELD_RESPONSE" | tail -1)

  if [ "$MISSING_FIELD_CODE" = "400" ]; then
    print_result "POST /launch-rhino with missing ghFilePath returns 400" "PASS"
  else
    print_result "POST /launch-rhino with missing ghFilePath returns 400" "FAIL" "Got HTTP $MISSING_FIELD_CODE"
  fi

  echo ""
  echo -e "  ${YELLOW}[INFO]${NC} To test actual Rhino launch, run manually:"
  echo "    curl -X POST $HELPER_APP_URL/launch-rhino \\"
  echo "      -H 'Content-Type: application/json' \\"
  echo "      -H 'x-protra-helper-token: $API_TOKEN' \\"
  echo '      -d '"'"'{"ghFilePath": "C:\\path\\to\\file.gh"}'"'"
fi

echo ""

# -----------------------------------------------
# Phase 6: Pairing Endpoints
# -----------------------------------------------
echo "--- Phase 6: Pairing Endpoints ---"

# /pairing-status should be accessible
PAIRING_STATUS_RESPONSE=$(curl -s -w "\n%{http_code}" "$HELPER_APP_URL/pairing-status" 2>/dev/null || echo -e "\n000")
PAIRING_STATUS_CODE=$(echo "$PAIRING_STATUS_RESPONSE" | tail -1)

if [ "$PAIRING_STATUS_CODE" = "200" ]; then
  print_result "GET /pairing-status returns 200" "PASS"
else
  print_result "GET /pairing-status returns 200" "FAIL" "Got HTTP $PAIRING_STATUS_CODE"
fi

# /pair without body should return error (not crash)
PAIR_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$HELPER_APP_URL/pair" \
  -H "Content-Type: application/json" \
  -d '{}' 2>/dev/null || echo -e "\n000")
PAIR_CODE=$(echo "$PAIR_RESPONSE" | tail -1)

if [ "$PAIR_CODE" != "000" ] && [ "$PAIR_CODE" != "500" ]; then
  print_result "POST /pair with empty body doesn't crash (HTTP $PAIR_CODE)" "PASS"
else
  print_result "POST /pair with empty body doesn't crash" "FAIL" "Got HTTP $PAIR_CODE"
fi

echo ""

# -----------------------------------------------
# Summary
# -----------------------------------------------
echo "============================================="
echo " Summary"
echo "============================================="
echo -e "  ${GREEN}Passed: $PASS${NC}"
echo -e "  ${RED}Failed: $FAIL${NC}"
echo -e "  ${YELLOW}Skipped: $SKIP${NC}"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo -e "${RED}Some tests failed! Check the output above.${NC}"
  echo ""
  echo "Logs location: %APPDATA%/ProTra Helfer/logs/"
  exit 1
else
  echo -e "${GREEN}All executed tests passed!${NC}"
  exit 0
fi
