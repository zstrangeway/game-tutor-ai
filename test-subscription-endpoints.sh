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
TEST_EMAIL="test-sub-user-$(date +%s)@example.com"
TEST_USERNAME="testsubuser$(date +%s)"
TEST_PASSWORD="Password123!"
ACCESS_TOKEN=""
PLAN_ID=""
PAYMENT_METHOD_ID="pm_card_visa" # Using Stripe test payment method

echo -e "${YELLOW}Testing Subscription Endpoints for GameTutorAI API${NC}"
echo -e "${YELLOW}Using API URL: ${API_URL}${NC}"
echo -e "${YELLOW}Test user: ${TEST_EMAIL}${NC}"
echo -e "${BLUE}Note: This is a test script for the subscription service. Some endpoints may fail if the service is not fully implemented yet.${NC}"

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

# Function to handle tests that may fail without failing the entire script
test_endpoint() {
  name=$1
  command=$2
  
  echo -e "\n${YELLOW}$name${NC}"
  response=$(eval $command)
  
  if [ -z "$response" ]; then
    echo -e "${YELLOW}! No response received - endpoint may not be fully implemented${NC}"
  else
    echo -e "${BLUE}Response: $response${NC}"
  fi
  
  # Return the response for further processing
  echo "$response"
}

# 1. Register user and login to get access token
echo -e "\n${YELLOW}1. Preparing - Creating test user and logging in...${NC}"
register_response=$(curl -s -X POST $API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\", \"username\":\"$TEST_USERNAME\", \"password\":\"$TEST_PASSWORD\"}")

echo -e "${BLUE}Registration response: $register_response${NC}"

# Even if registration appears to fail, try login (it might have worked)
login_response=$(curl -s -X POST $API_URL/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\", \"password\":\"$TEST_PASSWORD\"}")

echo -e "${BLUE}Login response: $login_response${NC}"

if echo "$login_response" | grep -q "\"access_token\""; then
  echo -e "${GREEN}✓ Login successful${NC}"
  ACCESS_TOKEN=$(echo $login_response | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')
  echo -e "${GREEN}✓ Retrieved access token${NC}"
else
  echo -e "${RED}✗ Login failed${NC}"
  echo -e "${YELLOW}! Using a dummy bearer token for further tests (they will likely fail)${NC}"
  ACCESS_TOKEN="dummy-token"
fi

# 2. Get available subscription plans
plans_response=$(test_endpoint "2. Testing get subscription plans..." "curl -s -X GET $API_URL/subscription/plans")

if echo "$plans_response" | grep -q "\"id\""; then
  echo -e "${GREEN}✓ Retrieved subscription plans${NC}"
  # Extract the first plan ID for testing
  PLAN_ID=$(echo $plans_response | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  if [ -n "$PLAN_ID" ]; then
    echo -e "${GREEN}✓ Retrieved plan ID: $PLAN_ID${NC}"
  else
    echo -e "${YELLOW}! No plan ID found, using dummy value for tests${NC}"
    PLAN_ID="dummy-plan-id"
  fi
else
  echo -e "${YELLOW}! Using dummy plan ID for tests${NC}"
  PLAN_ID="dummy-plan-id"
fi

# 3. Test starting a free trial
trial_response=$(test_endpoint "3. Testing start free trial..." "curl -s -X POST $API_URL/subscription/trial \
  -H \"Authorization: Bearer $ACCESS_TOKEN\" \
  -H \"Content-Type: application/json\"")

# 4. Test get subscription status
status_response=$(test_endpoint "4. Testing get subscription status..." "curl -s -X GET $API_URL/subscription/status \
  -H \"Authorization: Bearer $ACCESS_TOKEN\"")

# 5. Test creating a paid subscription
create_response=$(test_endpoint "5. Testing create subscription (expected to fail without real payment setup)..." "curl -s -X POST $API_URL/subscription/create \
  -H \"Authorization: Bearer $ACCESS_TOKEN\" \
  -H \"Content-Type: application/json\" \
  -d '{\"planId\":\"$PLAN_ID\", \"paymentMethodId\":\"$PAYMENT_METHOD_ID\"}'")

# 6. Test canceling a subscription
cancel_response=$(test_endpoint "6. Testing cancel subscription..." "curl -s -X POST $API_URL/subscription/cancel \
  -H \"Authorization: Bearer $ACCESS_TOKEN\" \
  -H \"Content-Type: application/json\" \
  -d '{\"cancelAtPeriodEnd\":true}'")

# 7. Test webhook handling (simulating a webhook event)
webhook_response=$(test_endpoint "7. Testing webhook handler (simulated event)..." "curl -s -X POST $API_URL/subscription/webhook \
  -H \"Content-Type: application/json\" \
  -d '{\"type\":\"customer.subscription.updated\", \"data\":{\"object\":{\"id\":\"sub_123\", \"customer\":\"cus_123\", \"status\":\"active\"}}}'")

# 8. Check subscription status again
status_response=$(test_endpoint "8. Testing get subscription status after changes..." "curl -s -X GET $API_URL/subscription/status \
  -H \"Authorization: Bearer $ACCESS_TOKEN\"")

echo -e "\n${YELLOW}Subscription endpoints test completed${NC}"
echo -e "${BLUE}This test script has run all subscription endpoints. Some failures are expected if the subscription service is not fully implemented.${NC}" 