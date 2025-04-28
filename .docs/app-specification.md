# GameTutorAI SaaS App Specification

## 1. Overview
GameTutorAI is a SaaS platform for learning games via AI-powered opponents that provide unlimited, dynamic, context-aware feedback as chat messages in solo/tutoring mode and free multiplayer with player chat, with the MVP focused on **PlyDojo** (hosted at **plydojo.ai**). Future games (e.g., checkers, poker) are deferred until the MVP is complete. The Next.js app uses a **game-api** backend (game-api.vercel.app) and shared component library (@gametutor/components), hosted in the **game-tutor-ai** GitHub repo. Users play multiplayer for free with player-to-player chat or access AI gameplay and unlimited feedback (powered by GPT-4o-mini) in solo/tutoring mode with a Premium subscription or 7-day trial. Elo ratings and game history track progress. The unique value proposition is a conversational AI tutor for beginners and intermediates (Elo <1500 for chess), with free multiplayer to drive engagement. MVP prioritizes a PWA, marketed as “Your personal chess coach,” with mobile apps and new games deferred. Costs are managed via OpenAI credits and monitoring.

## 2. Target Audience
- **Primary Audience**: Chess beginners and intermediates (Elo <1500).
- **Exclusions**: No group support.
- **User Personas**:
  - **Beginner Ben**: 20-30yo, new to chess, casual, seeks simple guidance.
  - **Club Member Clara**: 25-40yo, Elo ~1000, chess club, needs match prep.
  - **Teen Learner Tim**: 13-17yo, Elo ~800, school player, wants competitive practice.

## 3. Core Features (MVP, PlyDojo)

### 3.1 User Account Management
- **Sign-Up/Login**: Supabase Auth (email/password, Google).
- **User Profiles**: Username, Elo ratings (per game type), preferences, stats (games played, win/loss).
- **Skill Level**: Self-reported Elo at sign-up, default 800 for chess.
- **Subscription**:
  - **Free Tier**: Unlimited multiplayer games with player-to-player chat, game history (no PGN export), daily tip, basic stats (win/loss, Elo), no AI gameplay or feedback.
  - **Premium Tier**: $10/month or $100/year, unlimited AI (solo/tutoring) and multiplayer games, unlimited AI feedback (chat messages in solo mode), PGN export, post-game analysis, Weekly Progress Snapshot, 7-day trial (credit card, manual cancellation, 2-day reminder email).

### 3.2 Gameplay
- **Play Against AI (Solo/Tutoring Mode)** (Premium only):
  - GPT-4o-mini generates moves and unlimited feedback as chat messages (e.g., “I played …Nf6 to pin; try Ng5!”), validated by Chess.js/Stockfish.js.
  - Configurable difficulty: beginner (~800), intermediate (~1200), advanced (~1800).
  - Standard rules, untimed or rapid (10 min), with legal move indicators, check/checkmate, undo (unlimited).
- **Multiplayer** (Free for all):
  - Ranked matchmaking (Elo ±200) via Supabase queue, real-time moves via Socket.IO.
  - Untimed or rapid (10 min), with resign/draw offers, Elo updates (K=32 new, K=16 established).
  - Unlimited games for all users, with player-to-player chat (no AI feedback).
- **Game Modes**: Standard game (AI solo/tutoring or multiplayer).

### 3.3 AI-Powered Feedback (Premium only, Solo/Tutoring Mode)
- **AI Opponent Feedback**:
  - Unlimited, dynamic, context-aware move explanations delivered as chat messages in a chat panel (~25% width, collapsible) for solo/tutoring mode.
  - GPT-4o-mini provides:
    - Automatic: After key moves (e.g., “I played …Nf6 to pin. Try Ng5!” or “Your …b6 weakens c6. Try …d5!”).
    - User-initiated: Responds to unlimited game-related questions (e.g., “Why …Nf6?” → “My …Nf6 pins your knight. Try Ng5!”).
  - Tone: Beginner (<20 words, friendly); Intermediate (30-50 words, strategic).
- **Post-Game Analysis**: Highlights 2-3 key mistakes with alternatives as chat messages, accessible in game history.
- **Periodic Reports**: Weekly Progress Snapshot email (Elo change, personalized tips).

### 3.4 Game History and Analytics
- **Game Archive**: List historical games (AI solo/tutoring or multiplayer), move replay, PGN export (Premium only), filter by date, chat logs (AI feedback for Premium solo, player chat for multiplayer).
- **Progress Tracking**: Dashboard charts (Elo, win/loss), feedback form (1-5 stars, Premium only).

### 3.5 Engagement Features
- Daily tip (e.g., “Control the center with e4”).

## 4. Technical Architecture

### 4.1 game-api (Backend)
- **Framework**: Nest.js with TypeScript.
- **URL**: game-api.vercel.app (internal).
- **Repo**: game-tutor-ai/packages/game-api.
- **GameEngine**: Game logic (Chess.js/Stockfish.js for chess), extensible interfaces (`validateMove`, `generatePuzzle`, `getFeedback`).
- **Multiplayer**: Supabase queue for matchmaking, Socket.IO for real-time moves and player chat, Elo updates.
- **AI Opponent**: GPT-4o-mini for moves and unlimited feedback as chat messages (Premium only, solo/tutoring mode).
- **Database**: Supabase (PostgreSQL).
  - **Schema**:
    - `users`: id, email, username, elo (JSONB, e.g., {'chess': 800}), preferences (JSONB), subscription_status.
    - `games`: id, game_type (e.g., 'chess'), state (e.g., PGN), result, timestamp.
    - `game_players`: id, game_id, user_id (null for AI), is_ai, role (e.g., 'white', 'black'), metadata (JSONB).
    - `chat_logs`: id, game_id, user_id (null for AI), message, is_ai, timestamp.
  - **ORM**: Prisma.
- **Authentication**: Supabase Auth, CORS for plydojo.ai.

### 4.2 Frontend
- **Framework**: Next.js with TypeScript, PWA.
- **Repo**: game-tutor-ai/apps/plydojo.
- **URL**: plydojo.ai.
- **Shared Component Library**: game-tutor-ai/packages/components (@gametutor/components).
  - Components: `GameHistory`, `GameBoard` (react-chessboard for chess), `MultiplayerLobby`, `ChatPanel`.
  - Styling: Tailwind CSS (blue-gray chess theme).
- **PlyDojo App**: Branded for chess, “PlyDojo, powered by GameTutorAI” in footer.
- **Accessibility**: Keyboard input, ARIA labels.

### 4.3 Infrastructure
- **Hosting**: Vercel (serverless).
- **Database/Storage**: Supabase Pro ($25/month).
- **Integrations**: Stripe, Google Analytics, Resend (emails).
- **Security**: HTTPS, JWT, rate limits (100/min gameplay, 10/min chat).
- **Scalability**: Supports 100 DAU, ~10-20 concurrent multiplayer games.

### 4.4 Deployment and Monitoring
- **CI/CD**: GitHub Actions (linting, Jest tests, deployment).
- **Monitoring**: Vercel Analytics, Supabase logs, uptime monitoring.

## 5. Monetization
- **Freemium Model**:
  - **Free Tier**: Unlimited multiplayer games with player-to-player chat, game history (no export), daily tip, basic stats.
  - **Premium Tier**: $10/month or $100/year, unlimited AI solo/tutoring and multiplayer games, unlimited AI feedback, export, post-game analysis, Weekly Progress Snapshot, 7-day trial.
  - **Standard Tier** (introduced in Phase 2): $8/month, offers a mid-tier option with limited AI gameplay and enhanced Puzzle Mode, bridging Free and Premium features.
- **Phase 2 Tier Differences**:
  In Phase 2 (3-6 months post-MVP), the Standard Tier is introduced alongside Puzzle Mode and mobile app access. The following table outlines the feature differences across tiers to drive engagement and conversions:

  | Feature                          | Free Tier ($0)                     | Standard Tier ($8/month)          | Premium Tier ($10/month)          |
  |----------------------------------|------------------------------------|------------------------------------|------------------------------------|
  | **Multiplayer Games**            | Unlimited, player-to-player chat  | Unlimited, player-to-player chat  | Unlimited, player-to-player chat  |
  | **Game History**                 | Yes (no PGN export)               | Yes (no PGN export)               | Yes (with PGN export)             |
  | **Daily Tip**                    | Yes                               | Yes                               | Yes                               |
  | **Basic Stats (Win/Loss, Elo)**  | Yes                               | Yes                               | Yes                               |
  | **Mobile App Access**            | Yes                               | Yes                               | Yes (with premium features)       |
  | **Puzzle Mode**                  | Limited (1-3 puzzles/day)         | Unlimited, basic customization     | Unlimited, advanced customization  |
  | **AI Gameplay (Solo/Tutoring)**  | No                                | Limited (5 games/day)             | Unlimited                         |
  | **AI Feedback**                  | No                                | Limited (5 messages/game)         | Unlimited (automatic + questions) |
  | **PGN Export**                   | No                                | No                                | Yes                               |
  | **Post-Game Analysis**           | No                                | No                                | Yes (2-3 key mistakes)            |
  | **Weekly Progress Snapshot**     | No                                | No                                | Yes (Elo change, tips)            |

## 6. Development Roadmap
### Phase 1: MVP (PlyDojo, 3.5-4.5 months)
- **Features**: User accounts, AI gameplay with unlimited chat-based feedback in solo/tutoring mode (Premium), unlimited multiplayer with player chat (Free), game history, daily tips, PWA.
- **Pricing**: Free Tier, Premium Tier ($10/month).
- **Architecture**: game-api (game-api.vercel.app), @gametutor/components, plydojo.ai.
- **Milestones**:
  - **Week 1-2**: Set up game-tutor-ai repo, game-api, components, plydojo.
  - **Week 3-5**: Build game-api (chess logic, multiplayer matchmaking, WebSockets, player chat, unlimited AI feedback for solo, subscription control).
  - **Week 6-8**: Implement chess UI, chat panel (unlimited AI feedback for solo, player chat for multiplayer), multiplayer lobby, dashboard.
  - **Week 9-10**: Add PWA, responsive design, Stripe, Vercel, plydojo.ai domain.
  - **Week 11-12**: Write tests, manual chess rule tests, multiplayer/chat sync tests, prompt testing.
  - **Week 13-15**: Beta test with 10-20 users (survey $10/month, AI solo feedback, multiplayer, trial conversion, PlyDojo branding), launch.
- **Total**: 15-19 weeks (~$3,750-$4,750 at $50/hour).

### Phase 2: Enhancements (3-6 months, Post-MVP)
- **Features**: Puzzle Mode, Standard Tier ($8/month), mobile app (Capacitor).
- **Pricing**: Free Tier, Standard Tier ($8/month), Premium Tier ($10/month → $15/month in Phase 3).
- **Milestones**:
  - **Month 1-2**: Implement Puzzle Mode, Standard Tier.
  - **Month 3-4**: Develop mobile app, beta test with 50-100 users.

### Phase 3: Community and Expansion (6-9 months)
- **Features**: Leaderboards, shareable challenges, Club Prep Mode, Checkers-Tutor.ai.
- **Pricing**: Free Tier, Standard Tier ($8/month), Premium Tier ($15/month).
- **Milestones**:
  - **Month 1-3**: Club Prep Mode, leaderboards, challenges.
  - **Month 4-6**: Checkers (checkers-tutor.ai, logic, UI, AI opponent, multiplayer).
  - **Month 7-9**: API optimization, beta test with 200-500 users.

## 7. Success Metrics
- **Engagement**: 100 DAU (MVP).
- **Retention**: 80% 30-day retention.
- **Revenue**: 10% Premium conversion (100 DAU → $100/month MRR).
- **Learning**: Elo improvement, feedback satisfaction (1-5 stars, Premium only).

## 8. Risks and Mitigation
- **Risk**: Generic schema adds complexity for chess MVP.
  - **Mitigation**: Use Prisma for joins, test game history and Elo updates early.
- **Risk**: Unlimited AI feedback increases GPT-4o-mini costs.
  - **Mitigation**: Monitor usage, optimize prompts, test UX in Week 11-12.
- **Risk**: Multiplayer and chat complexity delays MVP.
  - **Mitigation**: Use Supabase Realtime/Socket.IO, test sync early, leverage Cursor.ai.

## 9. Future Enhancements
- Games: Checkers-Tutor.ai, Poker-Tutor.ai (Phase 3).
- Puzzle Mode, mobile app (Phase 2).
- Club Prep Mode, leaderboards (Phase 3).

## 10. API Endpoints
- **POST /games/new**: Input: { user_id, game_type, opponent_type, difficulty? }; Output: { game_id, state, players }.
- **POST /games/move**: Input: { game_id, move }; Output: { new_state, feedback_text? (solo Premium), result? }.
- **GET /games/:id**: Output: { id, game_type, state, result, timestamp, players, chat_logs }.
- **GET /users/:user_id/games**: Output: List of games for user.
- **POST /chat/message**: Input: { game_id, user_id, message }; Output: { message_id, feedback_text? (solo Premium) }.

## 11. Competitor Analysis
- **Chess.com**: Chess-only, $5-$14/month, no unlimited chat-based solo feedback.
- **Lichess**: Free, ranked multiplayer, player chat, limited feedback.
- **ChessKid**: Kids-focused, $5/month, no AI chat feedback.
- **PlyDojo**: Free multiplayer with player chat, Premium unlimited AI feedback in solo/tutoring, $10/month.

## 12. Cost Estimates
- **ChatGPT (GPT-4o-mini)**: ~$2.50-$12/month (500-1000 calls/day, Premium only, solo/tutoring), covered by OpenAI credits.
- **Supabase Pro**: $25/month.
- **Vercel**: Free tier (MVP, monitor for multiplayer/chat load).
- **Domain (plydojo.ai)**: ~$10-$50/year.
- **Total**: ~$37.50-$87/month, offset by $100/month MRR (10% conversion).