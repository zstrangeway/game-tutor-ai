#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# API base URL
API_URL=${API_URL:-http://localhost:3001/api}

# Test data
TEST_EMAIL="test-user-$(date +%s)@example.com"
TEST_USERNAME="testuser$(date +%s)"
TEST_PASSWORD="Password123!"
ACCESS_TOKEN=""
REFRESH_TOKEN=""
VERIFICATION_TOKEN=""

echo -e "${YELLOW}Testing Auth Endpoints for GameTutorAI API${NC}"
echo -e "${YELLOW}Using API URL: ${API_URL}${NC}"
echo -e "${YELLOW}Test user: ${TEST_EMAIL}${NC}"

# Function to check if a response contains a specific status code or message
check_response() {
  response=$1
  expected_status=$2
  message=$3
  
  if echo "$response" | grep -q "\"statusCode\":$expected_status" || echo "$response" | grep -q "\"message\""; then
    echo -e "${GREEN}✓ $message${NC}"
    return 0
  else
    echo -e "${RED}✗ $message${NC}"
    echo -e "${RED}Response: $response${NC}"
    return 1
  fi
}

# 1. Test registration
echo -e "\n${YELLOW}1. Testing registration...${NC}"
register_response=$(curl -s -X POST $API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\", \"username\":\"$TEST_USERNAME\", \"password\":\"$TEST_PASSWORD\"}")

check_response "$register_response" 201 "Registration"

# Extract verification token from logs in dev mode
# In a real test environment you would need to extract this from the database or email service
if [ "$EXTRACT_TOKEN" = "true" ]; then
  echo -e "\n${YELLOW}Extracting verification token from logs (only for local testing)...${NC}"
  sleep 2
  VERIFICATION_TOKEN=$(docker logs game-api 2>&1 | grep -o 'Verification URL: http.*token=[a-f0-9]*' | tail -1 | awk -F'token=' '{print $2}')
  
  if [ -n "$VERIFICATION_TOKEN" ]; then
    echo -e "${GREEN}✓ Got verification token: $VERIFICATION_TOKEN${NC}"
  else
    echo -e "${RED}✗ Failed to extract verification token${NC}"
  fi
else
  echo -e "\n${YELLOW}Skipping token extraction, set EXTRACT_TOKEN=true to enable${NC}"
  # For demo purposes we'll use a dummy token
  VERIFICATION_TOKEN="dummy-token"
fi

# 2. Test login
echo -e "\n${YELLOW}2. Testing login...${NC}"
login_response=$(curl -s -X POST $API_URL/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\", \"password\":\"$TEST_PASSWORD\"}")

if echo "$login_response" | grep -q "\"access_token\""; then
  echo -e "${GREEN}✓ Login successful${NC}"
  ACCESS_TOKEN=$(echo $login_response | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')
  REFRESH_TOKEN=$(echo $login_response | sed -n 's/.*"refresh_token":"\([^"]*\)".*/\1/p')
  echo -e "${GREEN}✓ Retrieved access_token and refresh_token${NC}"
else
  echo -e "${RED}✗ Login failed${NC}"
  echo -e "${RED}Response: $login_response${NC}"
fi

# 3. Test email verification
if [ -n "$VERIFICATION_TOKEN" ] && [ "$VERIFICATION_TOKEN" != "dummy-token" ]; then
  echo -e "\n${YELLOW}3. Testing email verification...${NC}"
  verify_response=$(curl -s -X POST $API_URL/auth/verify \
    -H "Content-Type: application/json" \
    -d "{\"token\":\"$VERIFICATION_TOKEN\"}")
  
  check_response "$verify_response" 200 "Email verification"
else
  echo -e "\n${YELLOW}3. Skipping email verification (no real token)${NC}"
fi

# 4. Test refresh token
if [ -n "$REFRESH_TOKEN" ]; then
  echo -e "\n${YELLOW}4. Testing token refresh...${NC}"
  refresh_response=$(curl -s -X POST $API_URL/auth/refresh \
    -H "Content-Type: application/json" \
    -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}")
  
  if echo "$refresh_response" | grep -q "\"access_token\""; then
    echo -e "${GREEN}✓ Token refresh successful${NC}"
    OLD_ACCESS_TOKEN=$ACCESS_TOKEN
    ACCESS_TOKEN=$(echo $refresh_response | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')
    REFRESH_TOKEN=$(echo $refresh_response | sed -n 's/.*"refresh_token":"\([^"]*\)".*/\1/p')
    
    if [ "$OLD_ACCESS_TOKEN" != "$ACCESS_TOKEN" ]; then
      echo -e "${GREEN}✓ New access token is different from old one${NC}"
    else
      echo -e "${RED}✗ New access token is the same as old one${NC}"
    fi
  else
    echo -e "${RED}✗ Token refresh failed${NC}"
    echo -e "${RED}Response: $refresh_response${NC}"
  fi
else
  echo -e "\n${YELLOW}4. Skipping token refresh (no token available)${NC}"
fi

# 5. Test password reset request
echo -e "\n${YELLOW}5. Testing password reset request...${NC}"
reset_request_response=$(curl -s -X POST $API_URL/auth/reset-password \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\"}")

check_response "$reset_request_response" 200 "Password reset request"

# 6. Test logout
if [ -n "$ACCESS_TOKEN" ] && [ -n "$REFRESH_TOKEN" ]; then
  echo -e "\n${YELLOW}6. Testing logout...${NC}"
  logout_response=$(curl -s -X POST $API_URL/auth/logout \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}")
  
  check_response "$logout_response" 200 "Logout"
else
  echo -e "\n${YELLOW}6. Skipping logout (no tokens available)${NC}"
fi

echo -e "\n${YELLOW}Auth endpoints test completed${NC}" 