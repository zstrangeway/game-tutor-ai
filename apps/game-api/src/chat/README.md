# Chat Service

The Chat service handles all real-time communication between players in games, as well as AI feedback in solo/tutoring mode.

## Features

- Player-to-player chat in multiplayer games
- AI feedback messages in solo/tutoring mode for Premium users
- Real-time WebSocket communication
- Chat history storage and retrieval
- Subscription-tier based access controls
- Content moderation for inappropriate messages
- Performance optimization with caching
- Rate limiting for abuse prevention
- Metrics collection for monitoring

## API Endpoints

### Send Chat Message
- **POST** `/chat/message`
- **Description**: Send a chat message in a game
- **Authentication**: Required
- **Rate Limit**: 100 requests per minute
- **Request Body**:
  ```json
  {
    "gameId": "uuid",
    "message": "Hello there!"
  }
  ```
- **Response**: ChatMessageResponseDto

### Get Chat History
- **GET** `/chat/:gameId`
- **Description**: Get chat history for a game
- **Authentication**: Required
- **Rate Limit**: 100 requests per minute
- **Query Parameters**:
  - `limit` (optional): Maximum number of messages to retrieve (default: 50, max: 100)
  - `offset` (optional): Number of messages to skip (default: 0)
  - `cursor` (optional): Message ID to start after (for cursor-based pagination)
- **Response**: Array of ChatMessageResponseDto

### Get AI Feedback
- **POST** `/chat/ai-feedback`
- **Description**: Get AI feedback in solo/tutoring mode (Premium only)
- **Authentication**: Required
- **Rate Limit**: 10 requests per minute
- **Request Body**:
  ```json
  {
    "gameId": "uuid",
    "message": "Can you explain your last move?" // Optional
  }
  ```
- **Response**: ChatMessageResponseDto

## WebSocket Events

### Connection
- Connect to WebSocket with: `io('https://api-url/chat', { query: { gameId: 'uuid' } })`

### Outgoing Events (Client to Server)
- `chat:message`: Send a new chat message
  ```json
  {
    "gameId": "uuid",
    "userId": "uuid",
    "message": "Hello there!"
  }
  ```
- `chat:typing`: Indicate user is typing
  ```json
  {
    "gameId": "uuid",
    "userId": "uuid",
    "isTyping": true
  }
  ```

### Incoming Events (Server to Client)
- `chat:message`: Receive a new chat message
- `chat:typing`: User typing status update
- `error`: Error message

## Implementation Details

- Messages are stored in the `ChatLog` table in the database
- WebSocket communication is handled via Socket.IO
- Real-time messages are broadcasted to all users in a game room
- Access control ensures only players in a game can view and send messages
- AI feedback is available only for Premium users in solo/tutoring mode
- Content moderation filters out inappropriate messages
- Caching improves chat history retrieval performance (5-minute TTL)
- Tiered rate limiting:
  - Regular chat: 100 requests per minute
  - AI feedback: 10 requests per minute
- Metrics collection for monitoring:
  - Message volume
  - AI message usage
  - Moderation blocks

## Error Handling

- **400 Bad Request**: Invalid input or message contains inappropriate content
- **401 Unauthorized**: User not authenticated
- **403 Forbidden**: User not a player in the game or lacks Premium subscription (for AI feedback)
- **404 Not Found**: Game not found
- **429 Too Many Requests**: Rate limit exceeded

## Adding New Features

When adding new features to the Chat service, consider:

1. **Security**: Always validate user access to games
2. **Performance**: Use caching for frequently accessed data
3. **Rate Limiting**: Apply appropriate limits to prevent abuse
4. **Content Moderation**: Filter inappropriate content
5. **Error Handling**: Use appropriate HTTP status codes and log errors
6. **Documentation**: Update this README and add Swagger annotations 