#!/bin/bash
# =============================================================================
# ProTra Helper App - Backend Endpoint Verification Script
# =============================================================================
# Part B: Tests the HEFL backend endpoints related to the Helper App
#
# Prerequisites:
#   - Backend server running (or access to deployed instance)
#   - curl available
#   - Optional: JWT token for authenticated endpoints
#
# Usage:
#   bash tests/test-backend-endpoints.sh [BASE_URL] [JWT_TOKEN]
#
# Defaults:
#   BASE_URL = http://localhost:3000
# =============================================================================

set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
JWT_TOKEN="${2:-}"
PASS=0
FAIL=0
SKIP=0

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
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
echo " ProTra Helper App - Backend Endpoint Tests"
echo "============================================="
echo -e " Backend URL: ${CYAN}$BASE_URL${NC}"
echo ""

# -----------------------------------------------
# B1: Installer Download Endpoint
# -----------------------------------------------
echo "--- B1: Installer Download Endpoint ---"

# HEAD request to check if download endpoint is available
DOWNLOAD_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -I "$BASE_URL/helper-app/download" 2>/dev/null || echo "000")

if [ "$DOWNLOAD_RESPONSE" = "200" ]; then
  print_result "GET /helper-app/download returns 200" "PASS"

  # Check Content-Disposition header
  DOWNLOAD_HEADERS=$(curl -s -I "$BASE_URL/helper-app/download" 2>/dev/null)
  if echo "$DOWNLOAD_HEADERS" | grep -qi "content-disposition"; then
    print_result "Response has Content-Disposition header" "PASS"
  else
    print_result "Response has Content-Disposition header" "FAIL"
  fi

  # Check filename in Content-Disposition
  if echo "$DOWNLOAD_HEADERS" | grep -qi "ProTra"; then
    print_result "Content-Disposition contains ProTra filename" "PASS"
  else
    print_result "Content-Disposition contains ProTra filename" "FAIL"
  fi

  # Check X-Version header
  if echo "$DOWNLOAD_HEADERS" | grep -qi "x-version"; then
    VERSION=$(echo "$DOWNLOAD_HEADERS" | grep -i "x-version" | tr -d '\r' | awk '{print $2}')
    print_result "X-Version header present: $VERSION" "PASS"
  else
    print_result "X-Version header present" "FAIL"
  fi

  # Check X-Platform header
  if echo "$DOWNLOAD_HEADERS" | grep -qi "x-platform"; then
    print_result "X-Platform header present" "PASS"
  else
    print_result "X-Platform header present" "FAIL"
  fi
elif [ "$DOWNLOAD_RESPONSE" = "404" ]; then
  print_result "GET /helper-app/download returns 200" "FAIL" "Got 404 - No installer file in helper-app-installers/ directory"
else
  print_result "GET /helper-app/download returns 200" "FAIL" "Got HTTP $DOWNLOAD_RESPONSE"
fi

echo ""

# -----------------------------------------------
# B2: Installer Info Endpoint
# -----------------------------------------------
echo "--- B2: Installer Info Endpoint ---"

INFO_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/helper-app/info" 2>/dev/null || echo -e "\n000")
INFO_CODE=$(echo "$INFO_RESPONSE" | tail -1)
INFO_BODY=$(echo "$INFO_RESPONSE" | sed '$d')

if [ "$INFO_CODE" = "200" ]; then
  print_result "GET /helper-app/info returns 200" "PASS"

  # Check response structure
  for field in available detectedPlatform platforms downloadUrl; do
    if echo "$INFO_BODY" | grep -q "\"$field\""; then
      print_result "/info contains field: $field" "PASS"
    else
      print_result "/info contains field: $field" "FAIL"
    fi
  done

  # Check platforms sub-object
  for platform in windows macos linux; do
    if echo "$INFO_BODY" | grep -q "\"$platform\""; then
      print_result "/info contains platform: $platform" "PASS"
    else
      print_result "/info contains platform: $platform" "FAIL"
    fi
  done

  echo ""
  echo -e "  ${CYAN}Info response:${NC}"
  echo "$INFO_BODY" | python3 -m json.tool 2>/dev/null || echo "$INFO_BODY"
else
  print_result "GET /helper-app/info returns 200" "FAIL" "Got HTTP $INFO_CODE"
fi

echo ""

# -----------------------------------------------
# B3: Grasshopper File Endpoints (require auth)
# -----------------------------------------------
echo "--- B3: Grasshopper File Endpoints ---"

if [ -z "$JWT_TOKEN" ]; then
  print_result "GET /files/grasshopper/list" "SKIP" "No JWT_TOKEN provided"
  print_result "GET /files/grasshopper/:id" "SKIP" "No JWT_TOKEN provided"
  print_result "GET /files/grasshopper/download/:id" "SKIP" "No JWT_TOKEN provided"
else
  AUTH_HEADER="Authorization: Bearer $JWT_TOKEN"

  # List grasshopper files
  GH_LIST_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/files/grasshopper/list" \
    -H "$AUTH_HEADER" 2>/dev/null || echo -e "\n000")
  GH_LIST_CODE=$(echo "$GH_LIST_RESPONSE" | tail -1)
  GH_LIST_BODY=$(echo "$GH_LIST_RESPONSE" | sed '$d')

  if [ "$GH_LIST_CODE" = "200" ]; then
    print_result "GET /files/grasshopper/list returns 200" "PASS"
    FILE_COUNT=$(echo "$GH_LIST_BODY" | grep -o '"uniqueIdentifier"' | wc -l)
    echo -e "  ${CYAN}Found $FILE_COUNT grasshopper files${NC}"
  elif [ "$GH_LIST_CODE" = "401" ]; then
    print_result "GET /files/grasshopper/list returns 200" "FAIL" "401 Unauthorized - JWT may be expired"
  else
    print_result "GET /files/grasshopper/list returns 200" "FAIL" "Got HTTP $GH_LIST_CODE"
  fi
fi

echo ""

# -----------------------------------------------
# B4: Token Validation Endpoint
# -----------------------------------------------
echo "--- B4: Token Validation (validate-helper-token) ---"

# Without body -> should return error (not 500)
VALIDATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/validate-helper-token" \
  -H "Content-Type: application/json" \
  -d '{}' 2>/dev/null || echo -e "\n000")
VALIDATE_CODE=$(echo "$VALIDATE_RESPONSE" | tail -1)

if [ "$VALIDATE_CODE" != "500" ] && [ "$VALIDATE_CODE" != "000" ]; then
  print_result "POST /auth/validate-helper-token with empty body doesn't crash (HTTP $VALIDATE_CODE)" "PASS"
else
  print_result "POST /auth/validate-helper-token with empty body doesn't crash" "FAIL" "Got HTTP $VALIDATE_CODE"
fi

# With invalid token
VALIDATE_INVALID_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/validate-helper-token" \
  -H "Content-Type: application/json" \
  -d '{"token": "invalid.jwt.token"}' 2>/dev/null || echo -e "\n000")
VALIDATE_INVALID_CODE=$(echo "$VALIDATE_INVALID_RESPONSE" | tail -1)
VALIDATE_INVALID_BODY=$(echo "$VALIDATE_INVALID_RESPONSE" | sed '$d')

if [ "$VALIDATE_INVALID_CODE" = "200" ]; then
  if echo "$VALIDATE_INVALID_BODY" | grep -q '"valid":false'; then
    print_result "Invalid JWT returns valid:false" "PASS"
  else
    print_result "Invalid JWT returns valid:false" "FAIL" "Response: $VALIDATE_INVALID_BODY"
  fi
else
  print_result "POST /auth/validate-helper-token with invalid JWT" "FAIL" "Got HTTP $VALIDATE_INVALID_CODE"
fi

if [ -n "$JWT_TOKEN" ]; then
  # With valid token
  VALIDATE_VALID_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/validate-helper-token" \
    -H "Content-Type: application/json" \
    -d "{\"token\": \"$JWT_TOKEN\"}" 2>/dev/null || echo -e "\n000")
  VALIDATE_VALID_CODE=$(echo "$VALIDATE_VALID_RESPONSE" | tail -1)
  VALIDATE_VALID_BODY=$(echo "$VALIDATE_VALID_RESPONSE" | sed '$d')

  if [ "$VALIDATE_VALID_CODE" = "200" ]; then
    if echo "$VALIDATE_VALID_BODY" | grep -q '"valid":true'; then
      print_result "Valid JWT returns valid:true" "PASS"
    else
      print_result "Valid JWT returns valid:true" "FAIL" "Response: $VALIDATE_VALID_BODY"
    fi
  else
    print_result "POST /auth/validate-helper-token with valid JWT" "FAIL" "Got HTTP $VALIDATE_VALID_CODE"
  fi
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
  exit 1
else
  echo -e "${GREEN}All executed tests passed!${NC}"
  exit 0
fi
