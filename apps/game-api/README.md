<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ pnpm install
```

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Run tests

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ pnpm install -g mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

## Database Setup with Prisma

This project uses Prisma ORM to interact with the PostgreSQL database. 

### Option 1: Using Docker (Recommended)

We provide a Docker Compose setup at the root of the repository to make database setup easy:

1. Start the PostgreSQL database container:

```bash
# From project root
pnpm docker:db:up
```

2. Create a `.env` file in the `apps/game-api` directory with the following connection string:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/gametutor?schema=public"
```

3. Generate the Prisma client:

```bash
# From project root
pnpm db:generate

# Or from apps/game-api directory
pnpm db:generate
```

4. Run migrations to set up the database schema:

```bash
# From project root
pnpm db:migrate

# Or from apps/game-api directory
pnpm db:migrate
```

5. Seed the database with initial data:

```bash
# From project root
pnpm db:seed

# Or from apps/game-api directory
pnpm db:seed
```

### Option 2: Using your own PostgreSQL instance

If you prefer to use your own PostgreSQL instance:

1. Create a `.env` file in the `apps/game-api` directory with your database connection string:

```
DATABASE_URL="postgresql://username:password@localhost:5432/gametutor"
```

Then follow steps 3-5 from Option 1.

### Database Management Commands

If you need to reset the database (WARNING: this will delete all data):

```bash
# From project root
pnpm db:reset

# Or from apps/game-api directory
pnpm db:reset
```

Docker-specific commands (run from the project root):

```bash
# Start the database
pnpm docker:db:up

# Stop the database
pnpm docker:db:down

# View database logs
pnpm docker:db:logs

# Restart the database
pnpm docker:db:restart
```

## Available Scripts

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

# GameTutorAI API

Backend API for the GameTutorAI platform.

## Authentication and User Management

The authentication and user management system is production-ready with the following features:

- Secure password hashing with bcrypt
- JWT-based authentication with proper secret management
- Email verification flow
- Password reset functionality
- Rate limiting for security-sensitive endpoints
- Comprehensive error handling and logging
- User profile management

## Setup Instructions

### 1. Environment Variables

Create a `.env.local` file with the following variables:

```
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/gametutor?schema=public"

# JWT
JWT_SECRET="your-secure-jwt-secret-minimum-32-chars"
JWT_EXPIRES_IN="1d"

# CORS
CORS_ORIGIN="https://plydojo.ai"

# Application
PORT=3001
NODE_ENV="development"
```

For production, use secure environment variables with proper secrets management.

### 2. Database Setup

Run database migrations and seed:

```bash
npm run db:generate
npm run db:migrate
npm run db:push
npm run db:seed
```

### 3. Development

Start the development server:

```bash
npm run dev
```

### 4. Production Deployment

Build and start the production server:

```bash
npm run build
npm run start:prod
```

## Authentication Endpoints

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login with email and password
- `POST /api/auth/verify` - Verify email address with token
- `POST /api/auth/reset-password` - Request password reset
- `PUT /api/auth/reset-password` - Complete password reset

## User Management Endpoints

- `GET /api/users/me` - Get current user profile
- `PUT /api/users/me` - Update user profile
- `PUT /api/users/me/preferences` - Update user preferences
- `GET /api/users/me/stats` - Get user statistics

## Security Features

- Rate limiting to prevent brute force attacks
- JWT token expiration and validation
- Safe password reset flow with time-limited tokens
- Email verification
- Encryption of sensitive information
- Proper error handling that doesn't leak sensitive information

## Testing

Run tests with:

```bash
npm test
```
