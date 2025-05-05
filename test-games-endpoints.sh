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
GAME_ID=""

echo -e "${YELLOW}Testing Games Endpoints for GameTutorAI API${NC}"
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

# Test AI players endpoints
echo -e "\n${YELLOW}3. Testing get all AI players...${NC}"
ai_players_response=$(curl -s -X GET $API_URL/ai-players \
  -H "Authorization: Bearer $ACCESS_TOKEN")

check_response "$ai_players_response" "\"id\"" "Get all AI players"
check_response "$ai_players_response" "\"difficulty\"" "AI players include difficulty"
check_response "$ai_players_response" "\"name\"" "AI players include name"

echo -e "\n${YELLOW}4. Testing filter AI players by difficulty...${NC}"
beginner_ai_response=$(curl -s -X GET "$API_URL/ai-players?difficulty=BEGINNER" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

# Case-insensitive check for difficulty in the response
check_response "$beginner_ai_response" "\"difficulty\":\"[bB][eE][gG][iI][nN][nN][eE][rR]\"" "Filter AI players by difficulty"

# Save an AI player ID for the next test
AI_PLAYER_ID=$(echo $ai_players_response | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$AI_PLAYER_ID" ]; then
  echo -e "${GREEN}✓ Retrieved AI player ID: $AI_PLAYER_ID for detailed lookup${NC}"
  
  echo -e "\n${YELLOW}5. Testing get AI player details...${NC}"
  ai_player_details_response=$(curl -s -X GET $API_URL/ai-players/$AI_PLAYER_ID \
    -H "Authorization: Bearer $ACCESS_TOKEN")
  
  check_response "$ai_player_details_response" "\"id\":\"$AI_PLAYER_ID\"" "Get AI player details"
  check_response "$ai_player_details_response" "\"description\"" "AI player details include description"
else
  echo -e "${RED}✗ Could not retrieve AI player ID${NC}"
fi

# 6. Create a new AI game
echo -e "\n${YELLOW}6. Testing create new game (AI opponent)...${NC}"
create_game_response=$(curl -s -X POST $API_URL/games/new \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"gameType\":\"chess\",\"opponentType\":\"ai\",\"difficulty\":\"beginner\",\"timeControl\":\"untimed\"}")

# Debug output to see the complete response
echo -e "${YELLOW}Debug - Create game response: $create_game_response${NC}"

if echo "$create_game_response" | grep -q "id"; then
  echo -e "${GREEN}✓ Game creation successful${NC}"
  # Correctly extract the game ID, not the player ID
  GAME_ID=$(echo $create_game_response | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo -e "${GREEN}✓ Retrieved game ID: $GAME_ID${NC}"
else
  echo -e "${RED}✗ Game creation failed${NC}"
  echo -e "${RED}Response: $create_game_response${NC}"
  exit 1
fi

# 7. Get list of games
echo -e "\n${YELLOW}7. Testing get list of games...${NC}"
games_list_response=$(curl -s -X GET $API_URL/games \
  -H "Authorization: Bearer $ACCESS_TOKEN")

check_response "$games_list_response" "\"items\"" "Get games list"
check_response "$games_list_response" "\"total\"" "Games list includes total count"

# 8. Get game details
echo -e "\n${YELLOW}8. Testing get game details...${NC}"
game_details_response=$(curl -s -X GET $API_URL/games/$GAME_ID \
  -H "Authorization: Bearer $ACCESS_TOKEN")

check_response "$game_details_response" "\"gameType\":\"chess\"" "Get game details"
check_response "$game_details_response" "\"players\"" "Game details include players"

# 9. Submit a move
echo -e "\n${YELLOW}9. Testing submit move...${NC}"
move_response=$(curl -s -X POST $API_URL/games/$GAME_ID/move \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"move\":\"e4\"}")

check_response "$move_response" "\"state\"" "Submit move"
check_response "$move_response" "\"players\"" "Move response includes players"
check_response "$move_response" "\"moves\"" "Move response includes moves history"

# 10. Try to offer a draw
echo -e "\n${YELLOW}10. Testing offer draw...${NC}"
draw_offer_response=$(curl -s -X POST $API_URL/games/$GAME_ID/draw/offer \
  -H "Authorization: Bearer $ACCESS_TOKEN")

check_response "$draw_offer_response" "\"drawOffered\"" "Offer draw"

# 11. Try to resign game
echo -e "\n${YELLOW}11. Testing resign game...${NC}"
resign_response=$(curl -s -X POST $API_URL/games/$GAME_ID/resign \
  -H "Authorization: Bearer $ACCESS_TOKEN")

check_response "$resign_response" "\"result\"" "Resign game"

# 12. Try to get the PGN notation (Premium feature)
echo -e "\n${YELLOW}12. Testing get PGN (should fail without premium)...${NC}"
pgn_response=$(curl -s -X GET $API_URL/games/$GAME_ID/pgn \
  -H "Authorization: Bearer $ACCESS_TOKEN")

# This should fail as it requires premium subscription
check_response "$pgn_response" "\"statusCode\":401" "PGN access denied (as expected)"

# 13. Create a new game for multiplayer 
echo -e "\n${YELLOW}13. Testing create new game (multiplayer)...${NC}"
create_mp_game_response=$(curl -s -X POST $API_URL/games/new \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"gameType\":\"chess\",\"opponentType\":\"player\",\"timeControl\":\"untimed\"}")

check_response "$create_mp_game_response" "\"id\"" "Create multiplayer game"

echo -e "\n${YELLOW}Games endpoints test completed${NC}" 