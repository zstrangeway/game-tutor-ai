#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# API base URL
API_URL=${API_URL:-http://localhost:3001/api}

# Test data
TEST_EMAIL="test@example.com"
TEST_PASSWORD="Password123!"
ACCESS_TOKEN=""
GAME_ID=""

echo -e "${YELLOW}Testing Multiplayer Endpoints for GameTutorAI API${NC}"
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

# Login to get access token
echo -e "\n${YELLOW}Setting up: Logging in to get access token...${NC}"
login_response=$(curl -s -X POST $API_URL/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\", \"password\":\"$TEST_PASSWORD\"}")

# Print the login response for debugging
echo -e "${YELLOW}Login response: ${NC}"
echo "$login_response" | grep "access_token" || echo "$login_response"

# Extract access token with better regex
ACCESS_TOKEN=$(echo "$login_response" | grep -o '"access_token":"[^"]*"' | sed 's/"access_token":"//;s/"//')

if [ -z "$ACCESS_TOKEN" ]; then
  echo -e "${RED}Failed to get access token. Exiting.${NC}"
  exit 1
else
  echo -e "${GREEN}Successfully obtained access token.${NC}"
fi

# 1. Test Join Queue
echo -e "\n${YELLOW}1. Testing join matchmaking queue...${NC}"
join_queue_response=$(curl -s -X POST $API_URL/multiplayer/queue/join \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d "{\"gameType\":\"chess\"}")

check_response "$join_queue_response" "queueId" "Join queue returned queue entry ID"
check_response "$join_queue_response" "status" "Join queue returned status"
check_response "$join_queue_response" "estimatedWaitTimeSeconds" "Join queue returned estimated wait time"
check_response "$join_queue_response" "inQueue" "Join queue returned inQueue status"
check_response "$join_queue_response" "gameType" "Join queue returned game type"

# 2. Test Get Queue Status
echo -e "\n${YELLOW}2. Testing get queue status...${NC}"
queue_status_response=$(curl -s -X GET $API_URL/multiplayer/queue/status \
  -H "Authorization: Bearer $ACCESS_TOKEN")

check_response "$queue_status_response" "status" "Queue status returned status"
check_response "$queue_status_response" "position" "Queue status returned position"
check_response "$queue_status_response" "estimatedWaitTimeSeconds" "Queue status returned estimated wait time"
check_response "$queue_status_response" "inQueue" "Queue status returned inQueue status"
check_response "$queue_status_response" "totalInQueue" "Queue status returned total in queue"

# 3. Test Get Active Games Count
echo -e "\n${YELLOW}3. Testing get active games count...${NC}"
active_games_response=$(curl -s -X GET $API_URL/multiplayer/active \
  -H "Authorization: Bearer $ACCESS_TOKEN")

check_response "$active_games_response" "count" "Active games returned count"

# 4. Test Leave Queue
echo -e "\n${YELLOW}4. Testing leave matchmaking queue...${NC}"
leave_queue_response=$(curl -s -X POST $API_URL/multiplayer/queue/leave \
  -H "Authorization: Bearer $ACCESS_TOKEN")

check_response "$leave_queue_response" "success" "Leave queue returned success status"
check_response "$leave_queue_response" "message" "Leave queue returned message"

# 5. Create a game to test rematch
echo -e "\n${YELLOW}Setting up: Creating a game for rematch test...${NC}"
create_game_response=$(curl -s -X POST $API_URL/games/new \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d "{\"gameType\":\"chess\", \"opponentType\":\"ai\", \"difficulty\":\"beginner\"}")

# Extract game ID using a robust method
GAME_ID=$(echo "$create_game_response" | python3 -c "import sys, json; print(json.loads(sys.stdin.read()).get('id', ''))")

if [ -z "$GAME_ID" ]; then
  # Fallback for Python error
  echo "Python extraction failed. Trying grep extraction."
  GAME_ID=$(echo "$create_game_response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
fi

if [ -z "$GAME_ID" ]; then
  echo -e "${RED}Failed to create a game for rematch test. Skipping rematch test.${NC}"
else
  echo -e "${GREEN}Successfully created game with ID: $GAME_ID${NC}"
  
  # Simulate game completion by resigning
  echo -e "\n${YELLOW}Setting up: Resigning game to simulate completion...${NC}"
  resign_response=$(curl -s -X POST $API_URL/games/$GAME_ID/resign \
    -H "Authorization: Bearer $ACCESS_TOKEN")
  
  # 5. Test Rematch Request
  echo -e "\n${YELLOW}5. Testing rematch request...${NC}"
  rematch_response=$(curl -s -X POST $API_URL/multiplayer/rematch \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -d "{\"gameId\":\"$GAME_ID\"}")

  check_response "$rematch_response" "success" "Rematch request returned success status"
  check_response "$rematch_response" "status" "Rematch request returned status"
fi

echo -e "\n${GREEN}✓ Multiplayer endpoints testing completed${NC}\n" 