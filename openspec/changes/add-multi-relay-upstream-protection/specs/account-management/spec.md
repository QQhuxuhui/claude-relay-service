# Account Management Capability

## ADDED Requirements

### Requirement: Account Session Window Rate Limiting

The system SHALL support configurable session window-based rate limiting for relay service accounts to prevent detection by upstream providers.

#### Scenario: Session window request limit enforcement

- **WHEN** an account has `sessionWindowHours=1` and `maxRequestsPerWindow=100` configured
- **AND** the account has processed 100 requests in the last 1 hour
- **THEN** the account SHALL be excluded from selection by the unified scheduler
- **AND** the system SHALL return error code indicating session window limit exceeded

#### Scenario: Session window disabled by default

- **WHEN** an account has `maxRequestsPerWindow=0` (default value)
- **THEN** the session window request limiting SHALL be disabled
- **AND** the account SHALL not be excluded based on request count

#### Scenario: Session window statistics query

- **WHEN** checking account availability during scheduling
- **THEN** the system SHALL query usage statistics for the configured window duration
- **AND** the query SHALL use existing hourly statistics infrastructure for performance
- **AND** the query SHALL aggregate all requests within the window (fixed window approach)

### Requirement: Account Daily Cost Limiting

The system SHALL support daily cost limits for relay service accounts to prevent unexpected billing and detect unusual consumption patterns.

#### Scenario: Daily cost limit enforcement

- **WHEN** an account has `maxCostPerDay=50.0` configured (in USD)
- **AND** the account has accumulated $50.00 in costs today
- **THEN** the account SHALL be excluded from selection by the unified scheduler
- **AND** the system SHALL log a warning message with cost details

#### Scenario: Daily cost limit disabled by default

- **WHEN** an account has `maxCostPerDay=0` (default value)
- **THEN** the daily cost limiting SHALL be disabled
- **AND** the account SHALL not be excluded based on cost

#### Scenario: Daily cost calculation accuracy

- **WHEN** calculating daily cost for an account
- **THEN** the system SHALL use the existing `redis.getAccountDailyCost()` method
- **AND** the cost SHALL include all models used by the account
- **AND** the cost SHALL be calculated based on actual token usage (input/output/cache tokens)

### Requirement: Multi-Provider Account Management

The system SHALL support managing accounts from multiple upstream relay service providers to distribute risk and improve availability.

#### Scenario: Provider identification

- **WHEN** creating or updating a CCR account
- **THEN** the system SHALL accept an optional `provider` field (e.g., "closeai", "api2d", "api7")
- **AND** the provider field SHALL be stored in Redis for reference
- **AND** the provider field SHALL be displayed in the Web UI and CLI tools

#### Scenario: Provider-based grouping

- **WHEN** viewing accounts in the Dashboard
- **THEN** the system SHALL support grouping accounts by provider
- **AND** each provider group SHALL show aggregated statistics (total requests, total cost, active accounts)

### Requirement: Account Risk Scoring

The system SHALL calculate and display risk scores for relay service accounts to help administrators identify potential detection risks.

#### Scenario: Risk score calculation

- **WHEN** calculating risk score for an account
- **THEN** the system SHALL compute:
  - Concurrency usage ratio = `currentConcurrency / maxConcurrentTasks` (weight: 0.4)
  - Window usage ratio = `windowRequests / maxRequestsPerWindow` (weight: 0.3)
  - Cost growth rate = `(todayCost - yesterdayCost) / yesterdayCost` (weight: 0.3)
- **AND** the final score SHALL be normalized to 0-100 range
- **AND** the risk level SHALL be classified as: low (<40), medium (40-60), high (60-80), critical (>=80)

#### Scenario: Risk level display

- **WHEN** viewing account details in the Web UI
- **THEN** the risk score and level SHALL be prominently displayed
- **AND** the risk level SHALL be color-coded (green/yellow/orange/red)
- **AND** the system SHALL show contributing factors (concurrency/window/cost)

### Requirement: Enhanced Webhook Notifications

The system SHALL send webhook notifications for account limit events to enable external monitoring and alerting.

#### Scenario: Session window exceeded event

- **WHEN** an account reaches its session window request limit
- **THEN** the system SHALL trigger a webhook event with type `account.session_window_exceeded`
- **AND** the event payload SHALL include:
  - Account ID and name
  - Session window configuration (hours, max requests)
  - Current usage statistics (requests in window)
  - Timestamp of the event

#### Scenario: Daily cost exceeded event

- **WHEN** an account reaches its daily cost limit
- **THEN** the system SHALL trigger a webhook event with type `account.daily_cost_exceeded`
- **AND** the event payload SHALL include:
  - Account ID and name
  - Daily cost limit (USD)
  - Current daily cost (USD)
  - Timestamp of the event

#### Scenario: High risk detected event

- **WHEN** an account's risk score exceeds 80 (critical level)
- **THEN** the system SHALL trigger a webhook event with type `account.high_risk_detected`
- **AND** the event payload SHALL include:
  - Account ID and name
  - Risk score and level
  - Contributing factors breakdown
  - Recommended actions

## MODIFIED Requirements

### Requirement: Account Selection in Unified Scheduler

The unified scheduler SHALL select accounts based on multiple criteria including session window limits and daily cost limits, in addition to existing concurrency and rate limiting checks.

#### Scenario: Account filtering with session window check

- **WHEN** the scheduler queries available CCR accounts
- **THEN** the system SHALL check each account's session window usage (if configured)
- **AND** accounts exceeding session window limits SHALL be excluded from the available pool
- **AND** the exclusion reason SHALL be logged with DEBUG level

#### Scenario: Account filtering with daily cost check

- **WHEN** the scheduler queries available CCR accounts
- **THEN** the system SHALL check each account's daily cost (if configured)
- **AND** accounts exceeding daily cost limits SHALL be excluded from the available pool
- **AND** the exclusion reason SHALL be logged with WARN level

#### Scenario: Priority preservation

- **WHEN** multiple accounts pass all filtering criteria
- **THEN** the system SHALL maintain existing sorting logic (priority + LRU)
- **AND** session window and cost checks SHALL not affect priority ordering

### Requirement: Account Configuration Persistence

Account configuration SHALL be stored in Redis and support all new fields with backward-compatible defaults.

#### Scenario: New account creation with defaults

- **WHEN** creating a new CCR account without specifying limit fields
- **THEN** the system SHALL apply default values:
  - `sessionWindowHours = 1`
  - `maxRequestsPerWindow = 0` (disabled)
  - `maxCostPerDay = 0` (disabled)
  - `provider = ''` (empty string)
- **AND** the account SHALL be immediately usable

#### Scenario: Existing account compatibility

- **WHEN** loading an existing account created before this feature
- **THEN** the system SHALL treat missing fields as defaults
- **AND** the account SHALL continue to function without modification

#### Scenario: Configuration updates

- **WHEN** updating account configuration via Admin API or Web UI
- **THEN** the system SHALL validate new values:
  - `sessionWindowHours` must be >= 0 (hours)
  - `maxRequestsPerWindow` must be >= 0 (0 = disabled)
  - `maxCostPerDay` must be >= 0 (0 = disabled)
  - `provider` can be any string (max 50 chars)
- **AND** invalid values SHALL be rejected with error message
- **AND** changes SHALL take effect immediately for future requests

## ADDED Non-Functional Requirements

### Performance Requirements

#### Scenario: Scheduling overhead limit

- **WHEN** selecting an account from a pool of 10 accounts with session window checks enabled
- **THEN** the additional overhead SHALL be less than 10ms at P99
- **AND** the system SHALL use Redis Pipeline for batch queries
- **AND** the system SHALL cache account configurations (LRU cache)

### Scalability Requirements

#### Scenario: Large account pool support

- **WHEN** managing 100+ CCR accounts
- **THEN** the session window queries SHALL scale linearly
- **AND** the system SHALL support pagination in Admin API
- **AND** the Web UI SHALL use virtualized lists for performance

### Observability Requirements

#### Scenario: Detailed exclusion logging

- **WHEN** an account is excluded during scheduling
- **THEN** the system SHALL log the exact reason:
  - Concurrent tasks limit reached
  - Session window limit reached
  - Daily cost limit reached
  - Account inactive/overloaded
- **AND** logs SHALL include account ID, limit values, and current usage
- **AND** logs SHALL use appropriate levels (DEBUG for routine, WARN for limits)

### Data Integrity Requirements

#### Scenario: Eventual consistency tolerance

- **WHEN** session window usage statistics are queried
- **THEN** the system MAY tolerate up to 1-minute staleness (due to Redis hourly aggregation)
- **AND** the system SHALL prioritize availability over strict consistency
- **AND** critical decisions (e.g., billing) SHALL use confirmed data only
