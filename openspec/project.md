# Project Context

## Purpose

Claude Relay Service is a multi-platform AI API relay service that acts as middleware between AI clients (Claude Code, Gemini CLI, Codex, Droid CLI, Cherry Studio, etc.) and various AI providers. The service provides:

- **Multi-platform support**: Claude (Official/Console), Gemini, OpenAI Responses (Codex), AWS Bedrock, Azure OpenAI, Droid (Factory.ai), CCR
- **Account management**: Multi-account support with intelligent scheduling and load balancing
- **Authentication & authorization**: API Key management with permissions, rate limiting, and client restrictions
- **Cost tracking**: Real-time token usage statistics and cost calculation per model
- **Enterprise features**: LDAP authentication, user management, webhook notifications
- **Modern web UI**: Real-time monitoring dashboard with light/dark mode support

## Tech Stack

### Backend
- **Runtime**: Node.js (ES6+ with ESM modules)
- **Framework**: Express.js with async/await patterns
- **Database**: Redis (primary data store with encryption)
- **Logging**: Winston (structured logging with daily rotation)
- **Authentication**: JWT tokens, OAuth 2.0 with PKCE flow
- **HTTP Client**: Axios with proxy support (SOCKS5/HTTP)
- **Encryption**: AES encryption for sensitive data
- **Testing**: Jest + SuperTest (configured but needs test coverage)

### Frontend
- **Framework**: Vue.js 3 with Composition API
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with responsive design
- **State Management**: Pinia stores
- **UI Features**: Dark mode support, glass morphism effects
- **HTTP Client**: Axios with interceptors

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Process Management**: PM2 for daemon mode
- **Monitoring**: Optional Prometheus + Grafana stack
- **Proxy Support**: Per-account proxy configuration (SOCKS5/HTTP)

## Project Conventions

### Code Style

- **Formatter**: Prettier (MUST run before commits)
  - Backend: `npx prettier --write <file>`
  - Frontend: Uses `prettier-plugin-tailwindcss`
- **Linter**: ESLint configured for Node.js/ES6+
- **Naming Conventions**:
  - Files: camelCase for services (e.g., `claudeRelayService.js`)
  - Variables: camelCase (e.g., `apiKeyService`)
  - Constants: UPPER_SNAKE_CASE (e.g., `JWT_SECRET`)
  - Redis keys: colon-separated (e.g., `api_key:{id}`)
  - API Key prefix: `cr_` by default (configurable via `API_KEY_PREFIX`)
  - Change IDs: kebab-case with verb prefix (e.g., `add-two-factor-auth`)
- **File Organization**:
  - Services: `src/services/` (30+ service files)
  - Routes: `src/routes/` (13 route files)
  - Middleware: `src/middleware/`
  - Utils: `src/utils/`
  - CLI: `src/cli/` and `cli/index.js`
- **No emojis**: Only use emojis if explicitly requested by user

### Architecture Patterns

#### Core Patterns
- **Unified Scheduler System**: Cross-account type intelligent scheduling
  - `unifiedClaudeScheduler.js`: Claude multi-account scheduling (official/console/bedrock/ccr)
  - `unifiedGeminiScheduler.js`: Gemini account scheduling
  - `unifiedOpenAIScheduler.js`: OpenAI-compatible service scheduling
  - `droidScheduler.js`: Droid account scheduling
- **Request Flow**:
  1. Client sends API Key (cr_ prefix) → Authenticate middleware
  2. Unified scheduler selects best account (sticky session + load balancing)
  3. Auto-refresh OAuth tokens if needed (with proxy support)
  4. Forward request to platform API (Claude/Gemini/OpenAI/etc.)
  5. Capture usage data from streaming response
  6. Calculate costs and update statistics
  7. Record rate limits and concurrency control
- **Data Encryption**: AES encryption for sensitive data (OAuth tokens, refresh tokens, credentials)
- **Token Management**: Automatic OAuth token refresh with 10-second early refresh strategy
- **Proxy Architecture**: Per-account proxy configuration, OAuth flows also use proxies
- **Sticky Sessions**: Session-level account binding using request content hash (supports auto-renewal)
- **Streaming Responses**: SSE (Server-Sent Events) with real-time usage capture and client disconnect handling
- **Caching Strategy**: Multi-layer LRU caching (decryption cache, account cache) with global monitoring
- **Concurrency Control**: Redis Sorted Set implementation with automatic cleanup
- **Error Handling**: 529 overload detection with temporary account exclusion

#### Service Layers
- **Relay Services**: Platform-specific API forwarding (Claude, Gemini, Bedrock, Azure, Droid, CCR, OpenAI)
- **Account Services**: Account management and OAuth token refresh per platform
- **Core Services**: API Key management, user management, pricing, cost calculation
- **Support Services**: Webhooks, LDAP auth, rate limiting, token refresh, cleanup tasks

#### Security Patterns
- **Multi-layer encryption**: API Key hashing (SHA-256) + OAuth token encryption (AES)
- **Zero-trust validation**: Every request requires full authentication chain
- **Graceful degradation**: Redis connection failure fallback mechanisms
- **Resource cleanup**: Auto-cleanup on client disconnect (AbortController)

### Frontend Conventions

- **Responsive Design**: MUST support mobile, tablet, and desktop
  - Use Tailwind responsive prefixes: `sm:`, `md:`, `lg:`, `xl:`
- **Dark Mode**: ALL components must support both light and dark themes
  - Use `dark:` prefix for dark mode styles
  - Text: `text-gray-700 dark:text-gray-200`
  - Background: `bg-white dark:bg-gray-800`
  - Borders: `border-gray-200 dark:border-gray-700`
- **Theme Management**: Use `stores/theme.js` (Pinia store)
- **Glass Morphism**: Maintain existing glass effect design patterns
- **No Emojis**: Avoid emojis unless explicitly requested

### Testing Strategy

- **Framework**: Jest + SuperTest configured
- **Current State**: Test infrastructure exists but lacks test coverage
- **Testing Priorities**:
  1. Core authentication flows (API Key validation, OAuth refresh)
  2. Unified scheduler logic (account selection, sticky sessions)
  3. Cost calculation accuracy (pricing service, usage tracking)
  4. Encryption/decryption correctness
- **Testing Tools**:
  - CLI testing: `npm run cli status`
  - Manual testing: Web UI + log monitoring
  - Debug tools: `DEBUG_HTTP_TRAFFIC=true` for HTTP logging
- **Future Improvements**: Add unit tests and integration tests

### Git Workflow

- **Branches**:
  - `main`: Production-ready code (main branch for PRs)
  - `dev`: Development branch (feature integration)
  - Feature branches: Create from `dev`, merge back to `dev`
- **Commit Conventions**: Conventional commits format
  - `feat:` - New features
  - `fix:` - Bug fixes
  - `chore:` - Maintenance tasks
  - `docs:` - Documentation updates
  - `refactor:` - Code refactoring
  - Auto-generated commits include: "🤖 Generated with Claude Code"
- **PR Process**:
  - Use `gh pr create` for pull requests
  - Base PRs against `main` branch
  - Run lint and tests before submitting
  - Update VERSION file for releases (automated via CI)

## Domain Context

### AI API Relay Concepts

- **API Key**: User-facing authentication token (format: `cr_<hash>`) with permissions, rate limits, and quotas
- **Account**: Backend AI provider credentials (OAuth tokens, API keys, AWS credentials, etc.)
- **Unified Scheduler**: Algorithm to select optimal account based on:
  - Account type compatibility with request route
  - Sticky session binding (same session → same account)
  - Account status (active, token validity, not overloaded)
  - Load balancing (concurrent request count)
- **Sticky Session**: Request content hash → account binding with configurable TTL and renewal
- **Usage Capture**: Parse SSE streams to extract real token usage (input/output/cache_create/cache_read)
- **Cost Calculation**: Token usage × model pricing (managed by `pricingService.js`)
- **Rate Limiting**: Redis-based rate limit counters with automatic cleanup
- **Concurrency Control**: Redis Sorted Set tracking active requests per account
- **OAuth Flow**: PKCE flow for Claude and Gemini with proxy support
- **Proxy Configuration**: Per-account SOCKS5/HTTP proxy settings (used for API calls and OAuth)

### Supported Account Types

1. **claude-official**: Claude official API with OAuth
2. **claude-console**: Claude Console accounts
3. **gemini**: Google Gemini with OAuth
4. **openai-responses**: OpenAI Responses format (Codex)
5. **bedrock**: AWS Bedrock Claude models
6. **azure-openai**: Microsoft Azure OpenAI
7. **droid**: Factory.ai Droid API
8. **ccr**: CCR account credentials

### Key Metrics

- **Token Usage**: Input/output/cache_create/cache_read tokens per request
- **Cost**: USD cost calculated from token usage × model pricing
- **Rate Limits**: Requests per time window per API Key
- **Concurrency**: Active concurrent requests per account
- **Cache Hit Rate**: Decryption cache and account cache performance
- **System Health**: Redis connectivity, memory usage, uptime

## Important Constraints

### Security Requirements

- **Encryption Mandatory**: All OAuth tokens, refresh tokens, and credentials MUST use AES encryption
- **No Token Logging**: Never log full tokens (use `tokenMask.js` for sanitization)
- **HTTPS Only**: Production deployments must use HTTPS
- **Secure Secrets**: `JWT_SECRET` (32+ chars), `ENCRYPTION_KEY` (exactly 32 chars)
- **OWASP Compliance**: Prevent XSS, SQL injection, command injection, etc.

### Performance Requirements

- **Streaming First**: Support SSE streaming for real-time responses
- **Cache Strategy**: Multi-layer caching to reduce Redis load
- **Async Operations**: Non-blocking I/O for all external calls
- **Resource Cleanup**: Auto-cleanup on client disconnect or timeout
- **Request Timeout**: Configurable timeout (default 10 minutes via `REQUEST_TIMEOUT`)

### Operational Constraints

- **Redis Dependency**: Service requires Redis for all data storage
- **Token Refresh**: OAuth tokens auto-refresh 10 seconds before expiry
- **Sticky Session TTL**: Default 1 hour (configurable via `STICKY_SESSION_TTL_HOURS`)
- **Metrics Window**: Real-time statistics window 1-60 minutes (default 5 via `METRICS_WINDOW`)
- **Log Retention**: Daily log rotation via Winston
- **Data Encryption**: Cannot change `ENCRYPTION_KEY` after data is encrypted (data will be unreadable)

### Business Constraints

- **User Management**: Optional feature (enable via `USER_MANAGEMENT_ENABLED`)
- **LDAP Integration**: Optional enterprise authentication
- **Webhook Notifications**: Optional event notifications (multi-URL support)
- **API Key Quotas**: Configurable per-user API Key limits
- **Model Blacklisting**: Per-API Key model access control

## External Dependencies

### Required Services

- **Redis**: Primary data store (all accounts, API Keys, sessions, usage stats)
  - Version: 6.0+
  - Configuration: `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
  - Features used: Key-value storage, Sorted Sets (concurrency), expiration, pipeline operations

### AI Provider APIs

- **Anthropic Claude**: Official API + Claude Console
  - OAuth: `https://claude.ai/api/oauth`
  - API: `https://api.anthropic.com/v1/messages`
  - Models: claude-3-opus, claude-3-sonnet, claude-3-haiku families
- **Google Gemini**: Generative AI API
  - OAuth: Google OAuth 2.0
  - API: `https://generativelanguage.googleapis.com/v1/models`
  - Models: gemini-pro, gemini-ultra, gemini-flash families
- **OpenAI**: OpenAI Responses (Codex format)
  - API: Custom OpenAI-compatible endpoints
  - Format: Chat completions with responses structure
- **AWS Bedrock**: Amazon managed AI service
  - Authentication: AWS credentials (access key + secret key)
  - API: AWS SDK for Bedrock Runtime
  - Models: Claude models on Bedrock
- **Azure OpenAI**: Microsoft Azure AI service
  - Authentication: Azure API keys
  - API: Azure OpenAI endpoints
  - Models: GPT-3.5, GPT-4 families
- **Factory.ai (Droid)**: Droid API
  - Authentication: API Key
  - API: Custom Droid endpoints
- **CCR**: CCR credential system
  - Authentication: Custom CCR credentials

### Optional Services

- **LDAP/Active Directory**: Enterprise authentication
  - Configuration: `LDAP_URL`, `LDAP_BIND_DN`, `LDAP_BIND_PASSWORD`
  - Support: TLS/SSL connections, custom certificate validation
- **Webhook Targets**: External webhook receivers
  - Configuration: `WEBHOOK_URLS` (comma-separated)
  - Events: Account errors, usage alerts, system events
- **Prometheus/Grafana**: Optional monitoring stack
  - Deploy: `docker-compose --profile monitoring up -d`
  - Metrics: Exposed via `/metrics` endpoint

### Development Dependencies

- **Node.js**: v16+ required (v18+ recommended)
- **npm**: v7+ for package management
- **Docker**: For containerized deployment
- **PM2**: For process management in production
