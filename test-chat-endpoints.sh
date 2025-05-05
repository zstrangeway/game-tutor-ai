#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# API base URL
API_URL=${API_URL:-http://localhost:3001/api}

# Test data
TEST_EMAIL="test-user-$(date +%s)@example.com"
TEST_USERNAME="testuser$(date +%s)"
TEST_PASSWORD="Password123!"
ACCESS_TOKEN=""
GAME_ID=""

echo -e "${BLUE}Testing Chat Service Endpoints${NC}"
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

# Step 1: Register and login to get access token
echo -e "\n${BLUE}Step 1: Registering test user...${NC}"
register_response=$(curl -s -X POST $API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\", \"username\":\"$TEST_USERNAME\", \"password\":\"$TEST_PASSWORD\"}")

if echo "$register_response" | grep -q "userId"; then
  echo -e "${GREEN}✓ Registration successful${NC}"
else
  echo -e "${RED}✗ Registration failed${NC}"
  echo -e "${RED}Response: $register_response${NC}"
  exit 1
fi

echo -e "\n${BLUE}Step 2: Logging in to get access token...${NC}"
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

# Step 3: Create a new game (with AI player)
echo -e "\n${BLUE}Step 3: Creating a new game with AI opponent...${NC}"
create_game_response=$(curl -s -X POST $API_URL/games/new \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"gameType\":\"chess\",\"opponentType\":\"ai\",\"difficulty\":\"beginner\",\"timeControl\":\"untimed\"}")

if echo "$create_game_response" | grep -q "id"; then
  echo -e "${GREEN}✓ Game creation successful${NC}"
  GAME_ID=$(echo $create_game_response | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo -e "${GREEN}✓ Retrieved game ID: $GAME_ID${NC}"
else
  echo -e "${RED}✗ Game creation failed${NC}"
  echo -e "${RED}Response: $create_game_response${NC}"
  exit 1
fi

# Step 4: Send a chat message
echo -e "\n${BLUE}Step 4: Sending a chat message...${NC}"
chat_response=$(curl -s -X POST $API_URL/chat/message \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"gameId\":\"$GAME_ID\",\"message\":\"Hello, this is a test message!\"}")

check_response "$chat_response" "\"id\"" "Send chat message"
check_response "$chat_response" "\"message\"" "Chat message content received"

MESSAGE_ID=$(echo $chat_response | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$MESSAGE_ID" ]; then
  echo -e "${GREEN}✓ Retrieved message ID: $MESSAGE_ID${NC}"
else
  echo -e "${RED}✗ Could not retrieve message ID${NC}"
fi

# Step 5: Get chat history
echo -e "\n${BLUE}Step 5: Getting chat history...${NC}"
history_response=$(curl -s -X GET "$API_URL/chat/$GAME_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

check_response "$history_response" "\"id\"" "Get chat history"
check_response "$history_response" "\"message\"" "Chat history contains messages"

if [ -n "$MESSAGE_ID" ]; then
  check_response "$history_response" "$MESSAGE_ID" "Found our message in history"
fi

# Step 6: Get AI feedback
echo -e "\n${BLUE}Step 6: Getting AI feedback...${NC}"
ai_response=$(curl -s -X POST $API_URL/chat/ai-feedback \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"gameId\":\"$GAME_ID\",\"message\":\"Can you explain your move?\"}")

check_response "$ai_response" "AI feedback" "Get AI feedback"
check_response "$ai_response" "\"isAi\":true" "Response is marked as AI message"

echo -e "\n${BLUE}All chat tests completed!${NC}" 