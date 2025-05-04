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
NEW_USERNAME="updated$(date +%s)"
ACCESS_TOKEN=""
USER_ID=""

echo -e "${YELLOW}Testing User Endpoints for GameTutorAI API${NC}"
echo -e "${YELLOW}Using API URL: ${API_URL}${NC}"
echo -e "${YELLOW}Test user: ${TEST_EMAIL}${NC}"

# Function to check if a response contains expected content
check_response() {
  response=$1
  expected_content=$2
  message=$3
  
  if echo "$response" | grep -q "$expected_content"; then
    echo -e "${GREEN}✓ $message${NC}"
    return 0
  else
    echo -e "${RED}✗ $message${NC}"
    echo -e "${RED}Response: $response${NC}"
    return 1
  fi
}

# 1. Register and login to get access token
echo -e "\n${YELLOW}1. Registering test user...${NC}"
register_response=$(curl -s -X POST $API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\", \"username\":\"$TEST_USERNAME\", \"password\":\"$TEST_PASSWORD\"}")

if echo "$register_response" | grep -q "userId"; then
  echo -e "${GREEN}✓ Registration successful${NC}"
  USER_ID=$(echo $register_response | sed -n 's/.*"userId":"\([^"]*\)".*/\1/p')
  echo -e "${GREEN}✓ Retrieved user ID: $USER_ID${NC}"
else
  echo -e "${RED}✗ Registration failed${NC}"
  echo -e "${RED}Response: $register_response${NC}"
  exit 1
fi

echo -e "\n${YELLOW}2. Logging in to get access token...${NC}"
login_response=$(curl -s -X POST $API_URL/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\", \"password\":\"$TEST_PASSWORD\"}")

if echo "$login_response" | grep -q "access_token"; then
  echo -e "${GREEN}✓ Login successful${NC}"
  ACCESS_TOKEN=$(echo $login_response | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')
  echo -e "${GREEN}✓ Retrieved access token${NC}"
else
  echo -e "${RED}✗ Login failed${NC}"
  echo -e "${RED}Response: $login_response${NC}"
  exit 1
fi

# 3. Get user profile
echo -e "\n${YELLOW}3. Testing get user profile...${NC}"
profile_response=$(curl -s -X GET $API_URL/users/me \
  -H "Authorization: Bearer $ACCESS_TOKEN")

check_response "$profile_response" "$TEST_USERNAME" "Get user profile"
check_response "$profile_response" "$TEST_EMAIL" "Profile contains correct email"

# 4. Update user profile
echo -e "\n${YELLOW}4. Testing update user profile...${NC}"
update_response=$(curl -s -X PUT $API_URL/users/me \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$NEW_USERNAME\"}")

check_response "$update_response" "$NEW_USERNAME" "Update user profile"

# 5. Get updated profile to verify changes
echo -e "\n${YELLOW}5. Verifying profile update...${NC}"
updated_profile_response=$(curl -s -X GET $API_URL/users/me \
  -H "Authorization: Bearer $ACCESS_TOKEN")

check_response "$updated_profile_response" "$NEW_USERNAME" "Profile reflects new username"

# 6. Update user preferences
echo -e "\n${YELLOW}6. Testing update preferences...${NC}"
preferences_response=$(curl -s -X PUT $API_URL/users/me/preferences \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"preferences\":{\"theme\":\"dark\",\"soundEnabled\":true,\"notifications\":false}}")

check_response "$preferences_response" "theme" "Update preferences"
check_response "$preferences_response" "soundEnabled" "Preferences includes sound setting"

# 7. Get user stats
echo -e "\n${YELLOW}7. Testing get user stats...${NC}"
stats_response=$(curl -s -X GET $API_URL/users/me/stats \
  -H "Authorization: Bearer $ACCESS_TOKEN")

check_response "$stats_response" "totalGames" "Get user stats"
check_response "$stats_response" "winRate" "Stats includes win rate"

# 8. Get user by ID
if [ -n "$USER_ID" ]; then
  echo -e "\n${YELLOW}8. Testing get user by ID...${NC}"
  user_by_id_response=$(curl -s -X GET $API_URL/users/$USER_ID \
    -H "Authorization: Bearer $ACCESS_TOKEN")
  
  check_response "$user_by_id_response" "$NEW_USERNAME" "Get user by ID"
else
  echo -e "\n${YELLOW}8. Skipping get user by ID (no user ID available)${NC}"
fi

echo -e "\n${YELLOW}User endpoints test completed${NC}" 