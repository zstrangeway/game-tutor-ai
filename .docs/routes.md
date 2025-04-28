# GameTutorAI Web and API Routes

## Frontend Routes (Next.js)

### Authentication & User Management
- `/` - Landing page with app overview and signup/login buttons
- `/login` - User login page
- `/signup` - New user registration page
- `/verify` - Email verification page
- `/reset-password` - Password reset page
- `/profile` - User profile management
- `/settings` - User preferences and account settings

### Subscription Management
- `/subscription` - Subscription management page
- `/subscription/checkout` - Stripe checkout page
- `/subscription/success` - Successful subscription confirmation
- `/subscription/cancel` - Subscription cancellation page
- `/trial` - Trial signup page

### Game Management
- `/dashboard` - Main user dashboard showing stats and recent games
- `/game/new` - Game type and opponent selection
- `/game/[id]` - Main game screen for an active or completed game
- `/games` - Game history list with filtering options
- `/games/[id]` - Detailed view of a completed game with replay

### Multiplayer
- `/lobby` - Multiplayer game lobby and matchmaking
- `/lobby/[gameType]` - Game-specific lobby (e.g., `/lobby/chess`)

### Additional Pages
- `/learn` - Learning resources and daily tips
- `/help` - Help documentation and FAQ
- `/contact` - Contact and support form
- `/terms` - Terms of service
- `/privacy` - Privacy policy

## Backend API Routes (Nest.js)

### Authentication & User API
- `POST /auth/register` - Register new user
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `POST /auth/verify` - Verify email address
- `POST /auth/reset-password` - Request password reset
- `PUT /auth/reset-password` - Process password reset
- `GET /users/me` - Get current user profile
- `PUT /users/me` - Update user profile
- `PUT /users/me/preferences` - Update user preferences
- `GET /users/me/stats` - Get user statistics

### Subscription API
- `GET /subscription/plans` - Get available subscription plans
- `POST /subscription/create` - Create new subscription
- `POST /subscription/trial` - Start free trial
- `GET /subscription/status` - Get current subscription status
- `POST /subscription/cancel` - Cancel subscription
- `POST /subscription/webhook` - Stripe webhook endpoint

### Game Management API
- `POST /games/new` - Create new game (AI or waiting for multiplayer)
- `GET /games` - Get list of user's games (with pagination/filtering)
- `GET /games/:id` - Get specific game details
- `POST /games/:id/move` - Submit a move in a game
- `POST /games/:id/resign` - Resign from a game
- `POST /games/:id/draw/offer` - Offer a draw
- `POST /games/:id/draw/respond` - Accept/reject draw offer
- `GET /games/:id/pgn` - Get PGN notation for a game (Premium only)

### AI Interaction API
- `POST /ai/feedback` - Get AI feedback on a position (Premium only)
- `POST /ai/analysis` - Request post-game analysis (Premium only)

### Multiplayer API
- `POST /multiplayer/queue/join` - Join matchmaking queue
- `POST /multiplayer/queue/leave` - Leave matchmaking queue
- `GET /multiplayer/queue/status` - Check queue status
- `GET /multiplayer/active` - Get active multiplayer games count
- `POST /multiplayer/rematch` - Request a rematch

### Chat API
- `POST /chat/message` - Send a chat message (player-to-player or to AI)
- `GET /chat/:gameId` - Get chat history for a game

### WebSocket Endpoints
- `/socket.io` - Socket.IO connection for real-time updates
  - Events: 
    - `game:update` - Game state updates
    - `chat:message` - New chat messages
    - `match:found` - Matchmaking successful
    - `move:new` - New move made
    - `draw:offered` - Draw offer received
    - `game:end` - Game ended

### Analytics API
- `POST /analytics/event` - Record user event for analytics
- `GET /analytics/daily-tip` - Get daily tip for user

## Database Triggers & Background Jobs

- Elo Rating Updates (after game completion)
- Trial Expiration Notifications (2 days before expiry)
- Weekly Progress Snapshot Generation
- Game Cleanup (for abandoned games)
- AI Usage Monitoring
