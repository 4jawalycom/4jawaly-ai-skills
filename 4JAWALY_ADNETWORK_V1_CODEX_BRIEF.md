# 4jawaly Ad Network — V1 Implementation Brief for Codex Orchestrator

> **Audience**: Codex (or any multi-agent orchestrator). This is the single source of truth for V1 implementation. Distribute tasks below to coding agents (Kimi, Minimax, etc.). Do **not** reopen closed architectural decisions — they are final.

---

## 0. How to Use This Document (Codex Instructions)

You are the orchestrator. Your responsibilities:

1. **Parse Section 9 (Work Breakdown Structure)** — each row is one atomic task assignable to a single coding agent.
2. **Respect dependencies** in the `Depends On` column. Do not dispatch a task until its dependencies are merged.
3. **For each task**, build an agent prompt containing:
   - The **Global Context** (Sections 1–8 of this document, compressed).
   - The **specific task row** from Section 9.
   - The **relevant ADR(s)** referenced in that row.
   - **Acceptance criteria** from Section 10.
4. **Agent selection rule**:
   - **Kimi** → Go backend services, infrastructure, database migrations, Kafka consumers.
   - **Minimax** → React/TypeScript frontends (Publisher/Advertiser/Admin dashboards), SDK code (Kotlin/Swift).
   - **Either** → docs, OpenAPI specs, test fixtures.
5. **Concurrency**: Independent tasks (no shared `Depends On`) run in parallel. Block on dependency merge.
6. **Definition of Done**: code + tests + OpenAPI updated + ADR updated if a decision changes. PRs only — no direct main pushes.
7. **Escalate to human (Sameh)** only when:
   - A closed decision in Sections 2–7 needs reopening.
   - An agent fails 3 times on the same task.
   - A security gap is discovered that the ADRs don't cover.

**Do NOT** ask the human for clarification on items already decided here. The list of closed decisions is in Section 2.

---

## 1. Product Vision (1 paragraph)

4jawaly Ad Network is a mobile ad network for the GCC market. It connects **Publishers** (app owners) with **Advertisers** (campaign buyers) via an OpenRTB-based auction engine (Prebid Server fork). It guarantees publishers a tiered daily minimum income and provides advertisers transparent reporting. Auth is via ZITADEL. Built as Go microservices + React frontends + Kafka/ClickHouse data pipeline.

---

## 2. Closed Decisions (DO NOT REOPEN)

| # | Domain | Final Decision |
|---|--------|----------------|
| D01 | Auth (SDK) | **Hybrid Attestation**: Play Integrity (Android) + App Attest (iOS). No `client_secret` in SDK ever. |
| D02 | Auth (Backend-to-Backend, optional) | Client credentials → JWT, TTL 15 min, refresh token 7d with rotation. For large publishers only. |
| D03 | Request signing | **Ed25519** (NOT HMAC). Keypair generated on-device, private key never leaves device. Public key stored server-side. |
| D04 | Impression token | JWT signed via HMAC-SHA256, TTL 30s, `kid` header for key rotation. Keys stored in **HashiCorp Vault**, rotated every 30 days. |
| D05 | Nonce flow | Server-issued, single-use, Redis-backed, TTL 60s. |
| D06 | Device binding | Android: `package_name + signing_cert_hash + install_id`. iOS: App Attest `key_id`. `device_hash = HMAC(secret, install_id + session_id)`. |
| D07 | Replay protection | Redis nonce store, Cluster (3 nodes), fallback "high-trust mode" max 5 min, then reject. |
| D08 | Rate limiting | 3 tiers: per-client_id (1000 rpm), per-device_hash (100 rpm), per-IP (500 rpm). Redis sliding window. |
| D09 | Anti-tampering | Server-side anomaly detection + native (Rust/C++) for signing in SDK. No heavy obfuscation. |
| D10 | Creative formats V1 | **Image + simple video (VAST 2.0) only**. No HTML/MRAID until V2. |
| D11 | Debug mode | `dev_mode` per app, TTL 7 days, accepts dev_key signatures. Production forbidden. |
| D12 | House Ads accounting | **Filler-only** (price = 0, `is_house = true`). Not counted in `real_revenue`. |
| D13 | Daily Guarantee | Tiered (T1=$0, T2=$1, T3=$5, T4=$20, T5=$50+), capped at 30% of last-7-day average real revenue, 14-day grace at T2 for new publishers. |
| D14 | Pacing formula | `target_qps = remaining_budget / (remaining_seconds * cpm/1000)`; `probability = min(1, target_qps / current_qps)`. `current_qps` from Redis sliding window. |
| D15 | Event sourcing | `spend_events(idempotency_key UNIQUE = impression_token nonce)`, INSERT ON CONFLICT DO NOTHING. |
| D16 | Reconciliation states | `pending` (0–24h) → `confirmed` (24–72h) → `final` (>72h) + `disputed` (within 30d after final). |
| D17 | Currencies V1 | **Pegged only**: SAR, AED, USD, QAR, BHD, OMR. Floating currencies (EGP, etc.) deferred to V2 with hedging. |
| D18 | Currency model | Per-account fixed currency + `fixed_exchange_rate` snapshot at registration. Immutable after first transaction. 30-day grace to change before first tx. |
| D19 | KYC | KYC Lite at signup (email + phone verified). KYC Full required at $500 accrued. Hard cap $1000 unverified. |
| D20 | Audit log | Append-only PostgreSQL table with hash chain, daily public notarization (e.g., OriginStamp or Git commit to public repo). |
| D21 | Compliance | ZATCA Phase 2 + Saudi PDPL + KYC via Nafath (Saudi nationals) / Qiwa (companies) + Trulioo for international. |
| D22 | Targeting V1 | Contextual only (geo, device, app category). Audience-based deferred to V2.1 (Q1 2027). |
| D23 | Storage | PostgreSQL = entities + aggregates. ClickHouse = raw events (TTL 13 months) + S3 Glacier archive 7 years (ZATCA). |
| D24 | Messaging | Kafka with replication=3, Schema Registry + Avro from day one, DLQ, idempotent producers. |
| D25 | CDN | Bunny.net OR Cloudflare R2 (NOT AWS CloudFront — too expensive for video). |
| D26 | Build vs Buy | Prebid Server fork + open-source infra (Kafka, ClickHouse, Redis, Vault). KYC via Nafath/Qiwa/Trulioo. |
| D27 | Identity (IAM) | ZITADEL self-hosted, OIDC + PKCE, roles: `publisher`, `advertiser`, `admin`, `reviewer`. |
| D28 | Commission model | 30% to 4jawaly, configurable per-publisher via `revenue_share_agreements` table. Min withdrawal $50. |
| D29 | Click safety | `click_token` carries `creative_id` only. Destination URL fetched from DB, must be HTTPS, not internal IP. |
| D30 | SLO | p99 < 300ms end-to-end ad request. Gateway → Prebid p99 < 150ms. Observability (Prometheus + Grafana) is P0. |

---

## 3. Microservices Topology

| # | Service | Language | Port | Responsibility |
|---|---------|----------|------|----------------|
| S01 | `gateway` | Go (Fiber) | 9000 | SDK entry point, auth, rate limit, OpenRTB orchestration, impression/click tokens |
| S02 | `publisher-service` | Go | 8001 | Publishers, apps, approval workflow, client credentials |
| S03 | `advertiser-service` | Go | 8002 | Advertisers, campaigns, creatives, budgets |
| S04 | `prebid-server` (fork) | Go | 8000 | Auction engine, internal adapter for 4jawaly campaigns |
| S05 | `house-ad-service` | Go | 8003 | Filler ads, guarantee make-up payments cron |
| S06 | `tracking-service` | Go | 8004 | Validate impression/click tokens → publish to Kafka |
| S07 | `fraud-detection` | Go | 8005 | Kafka consumer, anomaly rules, IVT flagging |
| S08 | `accounting-service` | Go | 8006 | Event sourcing for spend/earnings, reconciliation states, payouts |
| S09 | `admin-service` | Go | 8007 | App approval, creative moderation, suspension, audit log writer |
| S10 | `reporting-service` | Go | 8008 | ClickHouse queries, dashboards data |
| S11 | `publisher-dashboard` | React + TS | 3001 | Publisher UI |
| S12 | `advertiser-dashboard` | React + TS | 3002 | Advertiser UI |
| S13 | `admin-dashboard` | React + TS | 3003 | Internal staff UI |
| S14 | `sdk-android` | Kotlin + Rust | — | Android SDK |
| S15 | `sdk-ios` | Swift + Rust | — | iOS SDK |

**Infra (not coded, deployed):** PostgreSQL 15, Redis Cluster 7, Kafka 3.x + Schema Registry, ClickHouse 24.x, ZITADEL, HashiCorp Vault, Prometheus + Grafana + Loki, Bunny.net/R2 CDN, S3 (Glacier for archive).

---

## 4. Repository Layout (Monorepo)

```
4jawaly-adnetwork/
├── services/
│   ├── gateway/
│   ├── publisher-service/
│   ├── advertiser-service/
│   ├── prebid-server/            # fork
│   ├── house-ad-service/
│   ├── tracking-service/
│   ├── fraud-detection/
│   ├── accounting-service/
│   ├── admin-service/
│   └── reporting-service/
├── frontends/
│   ├── publisher-dashboard/
│   ├── advertiser-dashboard/
│   └── admin-dashboard/
├── sdks/
│   ├── android/
│   └── ios/
├── shared/
│   ├── proto/                    # gRPC schemas
│   ├── avro/                     # Kafka event schemas
│   └── openapi/                  # REST contracts
├── infra/
│   ├── docker-compose.dev.yml
│   ├── k8s/
│   ├── terraform/
│   └── vault/
├── docs/
│   ├── architecture/
│   └── adrs/                     # ADR-001 ... ADR-030 (one per D## decision)
└── .github/workflows/            # CI per service
```

---

## 5. Data Model (Conceptual ERD)

### Core entities (PostgreSQL)
- `publishers` (id, zitadel_user_id, company, currency, fixed_exchange_rate, kyc_level, status)
- `apps` (id, publisher_id, name, platform, bundle_id, status, attestation_mode, play_integrity_project_id, app_attest_team_id, allowed_bundle_ids[], signing_key_id, max_qps, allow_sideloaded)
- `app_credentials` (id, app_id, client_id, client_secret_hash, secret_last4, revoked) — only for B2B path
- `app_devices` (id, app_id, install_id, ed25519_public_key, last_seen)
- `advertisers` (id, zitadel_user_id, company, currency, fixed_exchange_rate, balance_usd, status)
- `campaigns` (id, advertiser_id, name, daily_budget_usd, total_budget_usd, bid_cpm_usd, targeting jsonb, status, start_date, end_date)
- `creatives` (id, campaign_id, type, cdn_url, width, height, duration, destination_url, moderation_status)
- `revenue_share_agreements` (id, publisher_id, share_percent, start_date, end_date)
- `daily_guarantee_tiers` (publisher_id, tier, computed_at, average_daily_requests, daily_guarantee_usd)
- `payout_requests` (id, publisher_id, amount_usd, status, processed_at)
- `audit_events` (id, prev_hash, hash, actor, action, target, data jsonb, created_at) — append-only

### Event tables (ClickHouse)
- `raw_impressions` (impression_id, app_id, campaign_id, publisher_id, advertiser_id, price_usd, currency, is_house, device_hash, ip, ts, state, fraud_flags)
- `raw_clicks` (click_id, impression_id, ts, state, fraud_flags)
- `bid_requests` (bid_id, app_id, ts, latency_ms, winning_campaign_id, floor_usd)
- `spend_events` (idempotency_key UNIQUE, campaign_id, amount_usd, ts) — also mirrored in PostgreSQL for accounting

### Cache (Redis)
- `campaigns:active` — set of active campaign IDs, refreshed every 30s
- `targeting:{campaign_id}` — hash of targeting rules
- `fcap:{campaign_id}:{device_hash}` — TTL 24h
- `pacing:qps:{campaign_id}` — sliding window
- `rate:client:{app_id}`, `rate:device:{hash}`, `rate:ip:{ip}`
- `nonce:{install_id}` — TTL 60s
- `impression_nonce:{nonce}` — TTL 60s

---

## 6. Critical Flows (Sequence Summaries)

### 6.1 Registration & Attestation (SDK first launch)
```
SDK              Gateway                Vault         Play/Apple
 │── POST /attestation/challenge ─→     │                │
 │                │── Redis SET nonce ──│                │
 │← {nonce} ──────│                     │                │
 │── PlayIntegrity(nonce) ─────────────────────────────→│
 │← verdict ─────────────────────────────────────────────│
 │── POST /register {verdict, ed25519_pub, install_id} →│
 │                │── verify verdict, check package_name
 │                │── store public_key + install_id
 │                │── issue session_token (TTL 15m, device_hash)
 │← {session_token} ─
```

### 6.2 Ad Request
```
SDK → Gateway (Bearer session_token, Ed25519 signature)
Gateway: verify session, rate limit, check fcap
Gateway → Prebid Server: OpenRTB BidRequest
Prebid: internal adapter → Redis campaigns + Redis targeting
Prebid: house adapter → House Ad Service
Prebid: select winning bid
Gateway: build impression_token (JWT, kid, TTL 30s, HMAC via Vault key)
Gateway → SDK: {creative_url, impression_token, click_token}
```

### 6.3 Impression Tracking
```
SDK → Tracking Service: POST /impression {token}
Tracking: verify JWT (Vault key by kid), verify nonce not used, verify device_hash
Tracking: SET NX Redis nonce, publish Avro event to Kafka topic verified.impressions
Fraud Detection: consume, apply rules, republish to verified.clean OR flagged.fraud
Accounting: consume verified.clean, INSERT spend_events ON CONFLICT DO NOTHING
```

---

## 7. Priorities (Locked)

### P0 — Sprint 1–8 (launch foundation)
1. ZITADEL setup + OIDC apps + roles
2. Gateway skeleton with Ed25519 + attestation flow
3. Publisher Service + app registration + approval workflow
4. Advertiser Service + campaign CRUD
5. Prebid Server fork + 4jawaly internal adapter
6. House Ad Service + tiered guarantee cron
7. Tracking Service + impression token verification
8. Accounting Service + event sourcing + reconciliation states
9. Admin Service + audit log + hash chain notarization
10. ClickHouse + Kafka (replication=3, Avro, Schema Registry) from day one
11. Redis Cluster + campaign/targeting/fcap cache
12. Prometheus + Grafana + SLO dashboards
13. ZATCA-compliant invoicing + Nafath/Qiwa KYC integration
14. Currency selector (Pegged-only list) + fixed_exchange_rate
15. Vault + key rotation for impression JWT
16. Publisher/Advertiser/Admin dashboards (minimal flows)
17. Android + iOS SDKs (Rust core for signing)
18. CDN setup (Bunny.net), VAST generation, macro replacement

### P1 — Sprint 9–16
- Frequency capping
- Pacing (corrected formula)
- Circuit breaker (gobreaker, 200ms timeout, 10 failures/30s)
- Reconciliation 3-state automation
- Creative moderation (manual → Cloud Vision SafeSearch for images, Rekognition first/mid/last frame for video)
- Suspension/appeal workflow
- Revenue share configurable UI
- Multi-currency UI polish (display-only, calculations stay USD)
- Disaster recovery: daily pg_dump + Redis RDB

### P2 — Sprint 17+
- Data retention automation (ClickHouse TTL + S3 archive)
- OpenAPI/Swagger docs + Publisher/Advertiser guides
- Audience targeting prep (V2.1)
- HTML/MRAID (deferred to V2)

---

## 8. Cross-Cutting Standards

- **Language versions**: Go 1.22+, Node 20 LTS, React 18, Kotlin 1.9, Swift 5.9, Rust 1.75.
- **Go conventions**: standard layout (`cmd/`, `internal/`, `pkg/`), `wire` for DI, `pgx` for Postgres, `segmentio/kafka-go`, `redis/go-redis/v9`, `gofiber/fiber/v2`.
- **Error handling**: never log tokens or PII. Use `slog` with structured fields. Errors wrap with `%w`.
- **Testing**: ≥70% coverage on services. Unit + integration (testcontainers for Postgres/Redis/Kafka).
- **Security**: every endpoint requires auth except `/health`, `/metrics`, `/attestation/challenge`, `/register`. All inputs validated. SQL via parameterized queries only.
- **OpenAPI**: every REST endpoint documented in `shared/openapi/<service>.yaml`. CI fails if drift.
- **Avro schemas**: every Kafka event has a schema in `shared/avro/`. Producers validate before send.
- **Migrations**: `golang-migrate`, forward-only. Each migration reviewed manually.
- **Secrets**: never in repo. Vault for runtime, `.env.example` for local dev only.
- **CI**: lint + unit + integration + container build + vulnerability scan (Trivy). PR blocks on red.
- **Branching**: trunk-based. Short-lived branches `feat/`, `fix/`, `chore/`. Squash merge.

---

## 9. Work Breakdown Structure (Atomic Tasks)

Each row = one assignable task. `Agent` = recommended (Kimi/Minimax). `Effort` = S (<1d), M (1–3d), L (3–5d), XL (>5d → split).

### EPIC A — Infrastructure & Tooling

| ID | Task | Agent | Depends | Effort | ADR |
|----|------|-------|---------|--------|-----|
| A01 | Monorepo init + Section 4 layout + root README + LICENSE | Kimi | — | S | — |
| A02 | `infra/docker-compose.dev.yml` (Postgres, Redis Cluster, Kafka+SR, ClickHouse, ZITADEL, Vault, Prometheus, Grafana) | Kimi | A01 | M | D24, D27 |
| A03 | GitHub Actions: lint + test + build + Trivy per service | Kimi | A01 | M | — |
| A04 | `shared/proto/` baseline + buf config | Kimi | A01 | S | — |
| A05 | `shared/avro/` schemas: impression, click, bid_request, spend_event, audit_event | Kimi | A01 | M | D24 |
| A06 | `shared/openapi/` skeletons per service | Kimi | A01 | S | — |
| A07 | Vault dev-mode setup + KV v2 secret paths + Vault Agent sidecar template | Kimi | A02 | M | D04 |
| A08 | golang-migrate config + per-service migration dirs | Kimi | A02 | S | — |
| A09 | Prometheus scrape config + Grafana baseline dashboards (latency, errors, saturation) | Kimi | A02 | M | D30 |
| A10 | ClickHouse schema: `raw_impressions`, `raw_clicks`, `bid_requests` + Kafka Engine tables + TTL 13 months | Kimi | A02, A05 | M | D23 |

### EPIC B — ZITADEL & IAM

| ID | Task | Agent | Depends | Effort | ADR |
|----|------|-------|---------|--------|-----|
| B01 | Terraform: ZITADEL org, project `ad-network`, roles (publisher/advertiser/admin/reviewer) | Kimi | A02 | M | D27 |
| B02 | Terraform: OIDC apps (publisher-dashboard, advertiser-dashboard, admin-dashboard, gateway-api) with PKCE | Kimi | B01 | S | D27 |
| B03 | Service account for backend mgmt API + Private Key JWT in Vault | Kimi | B01, A07 | M | D27 |
| B04 | `shared/auth/zitadel.go`: JWT verifier (JWKS), role extraction, middleware | Kimi | B02 | M | D27 |

### EPIC C — Publisher Service (S02)

| ID | Task | Agent | Depends | Effort | ADR |
|----|------|-------|---------|--------|-----|
| C01 | Migrations: `publishers`, `apps`, `app_credentials`, `app_devices`, `daily_guarantee_tiers`, `payout_requests` | Kimi | A08 | M | D17, D18, D19 |
| C02 | OpenAPI for `publisher-service` (register, list apps, create app, get sdk config) | Kimi | A06, C01 | M | — |
| C03 | Publisher registration handler + currency selector (Pegged-only) + fixed_exchange_rate snapshot | Kimi | C02, B04 | M | D17, D18 |
| C04 | App creation + status=pending | Kimi | C03 | S | — |
| C05 | App approval handler (admin role) + emit Kafka event `app.approved` | Kimi | C04, A05 | M | — |
| C06 | App credential issuance (bcrypt secret, shown once) — only for opt-in B2B path | Kimi | C05 | M | D02 |
| C07 | Device registration endpoint (Ed25519 public key storage) | Kimi | C05, A07 | M | D03, D06 |
| C08 | KYC Lite verification (email + phone OTP) | Kimi | C03 | M | D19 |
| C09 | KYC Full integration: Nafath (individuals) + Qiwa (companies) + Trulioo (international) | Kimi | C08 | L | D19, D21 |
| C10 | Tiered guarantee cron (nightly): compute T1–T5 + 14d grace + 30% cap | Kimi | C01 | M | D13 |

### EPIC D — Advertiser Service (S03)

| ID | Task | Agent | Depends | Effort | ADR |
|----|------|-------|---------|--------|-----|
| D01 | Migrations: `advertisers`, `campaigns`, `creatives`, `revenue_share_agreements` | Kimi | A08 | M | D17, D18, D28 |
| D02 | OpenAPI for `advertiser-service` | Kimi | A06, D01 | M | — |
| D03 | Advertiser registration + currency lock | Kimi | D02, B04 | M | D17, D18 |
| D04 | Campaign CRUD + budget validation (USD internal) | Kimi | D03 | M | — |
| D05 | Creative upload → S3 → Bunny.net/R2 CDN URL | Kimi | D04, A02 | M | D10, D25 |
| D06 | Creative submission to moderation queue | Kimi | D05 | S | — |
| D07 | Campaign cache publisher (Redis, 30s refresh) | Kimi | D04, A02 | M | D14 |

### EPIC E — Prebid Server Fork (S04)

| ID | Task | Agent | Depends | Effort | ADR |
|----|------|-------|---------|--------|-----|
| E01 | Fork prebid-server + repo `prebid-server-4jawaly` + CI | Kimi | A01 | M | D26 |
| E02 | Internal adapter `4jawaly`: reads campaigns from Redis, applies targeting | Kimi | E01, D07 | L | D26 |
| E03 | House adapter: calls house-ad-service via gRPC | Kimi | E01, F02 | M | D12 |
| E04 | Request authentication middleware (validate Gateway service JWT) | Kimi | E01, B04 | M | D27 |
| E05 | Avro analytics module → Kafka topic `bid_requests` | Kimi | E01, A05 | M | D24 |

### EPIC F — House Ad Service (S05)

| ID | Task | Agent | Depends | Effort | ADR |
|----|------|-------|---------|--------|-----|
| F01 | Migrations: `house_creatives`, `publisher_guarantees` | Kimi | A08 | S | D12, D13 |
| F02 | gRPC endpoint `GetHouseAd(bid_request)` — returns creative at price=0, `is_house=true` | Kimi | F01 | M | D12 |
| F03 | Make-up payment cron (nightly): `deficit = max(0, guarantee - real_revenue)`, insert into accounting | Kimi | F01, H03 | M | D12, D13 |

### EPIC G — Gateway (S01)

| ID | Task | Agent | Depends | Effort | ADR |
|----|------|-------|---------|--------|-----|
| G01 | Fiber skeleton + middleware chain (logger, recover, metrics, auth) | Kimi | A09, B04 | M | — |
| G02 | `/attestation/challenge` (Redis nonce, TTL 60s) | Kimi | G01, A02 | M | D05 |
| G03 | `/register` — verify Play Integrity / App Attest + store Ed25519 pub key | Kimi | G02, C07 | L | D01, D06 |
| G04 | Session token issuance (JWT 15m, device_hash) | Kimi | G03 | M | D02, D06 |
| G05 | Ed25519 signature verification middleware | Kimi | G04 | M | D03 |
| G06 | Rate limiter (3-tier Redis sliding window via Lua) | Kimi | G01, A02 | M | D08 |
| G07 | `/ad` endpoint: build OpenRTB → Prebid → impression_token JWT (Vault HMAC, kid) | Kimi | G05, E02, A07 | L | D04 |
| G08 | Frequency cap check before bidding | Kimi | G07 | M | (P1) |
| G09 | Pacing probability gate | Kimi | G07 | M | D14 (P1) |
| G10 | Click redirect: verify token, fetch destination from DB, validate HTTPS | Kimi | G07, D04 | M | D29 |
| G11 | Circuit breaker (gobreaker) for Prebid + Advertiser Service calls | Kimi | G07 | M | (P1) |

### EPIC H — Tracking & Accounting (S06, S08)

| ID | Task | Agent | Depends | Effort | ADR |
|----|------|-------|---------|--------|-----|
| H01 | Tracking Service: `/impression`, `/click` — verify JWT, check nonce, publish Avro | Kimi | G07, A05, A07 | L | D04, D07 |
| H02 | Fraud Detection consumer: anomaly rules (CTR>30%, geo spread, sub-second clicks) | Kimi | A05, A10 | L | D09 |
| H03 | Accounting consumer: `spend_events` with idempotency_key, state machine pending→confirmed→final | Kimi | A05, A10, D01 | L | D15, D16 |
| H04 | Dispute handler: 30-day window after `final`, emits Kafka `dispute.opened` | Kimi | H03 | M | D16 |
| H05 | Payout request workflow (publisher) + KYC Full gate at $500 | Kimi | H03, C09 | M | D19, D28 |
| H06 | ZATCA Phase 2 e-invoice generation for advertisers | Kimi | H03 | XL → split | D21 |

### EPIC I — Admin Service (S09)

| ID | Task | Agent | Depends | Effort | ADR |
|----|------|-------|---------|--------|-----|
| I01 | Audit log writer: hash chain, append-only table, daily notarization job | Kimi | A08 | M | D20 |
| I02 | App approval/rejection endpoints | Kimi | C05, I01 | S | — |
| I03 | Creative moderation queue + manual approve/reject | Kimi | D06, I01 | M | (P1) |
| I04 | Suspension/appeal workflow with money freeze | Kimi | C01, I01 | M | (P1) |
| I05 | Revenue-share editor (writes to `revenue_share_agreements`) | Kimi | D01, I01 | S | D28 |

### EPIC J — Reporting (S10)

| ID | Task | Agent | Depends | Effort | ADR |
|----|------|-------|---------|--------|-----|
| J01 | ClickHouse queries: publisher earnings, advertiser spend, fill rate, eCPM | Kimi | A10 | M | D23 |
| J02 | REST endpoints + caching (Redis 60s) | Kimi | J01 | M | — |
| J03 | Reconciliation report (publisher vs advertiser deltas) | Kimi | J01, H03 | M | D16 |

### EPIC K — Frontends

| ID | Task | Agent | Depends | Effort | ADR |
|----|------|-------|---------|--------|-----|
| K01 | Shared UI kit (Tailwind + shadcn/ui), Arabic RTL support, ZITADEL OIDC client wrapper | Minimax | B02 | M | D27 |
| K02 | Publisher Dashboard: register → add app → list apps → SDK download → earnings | Minimax | K01, C02 | L | — |
| K03 | Publisher Dashboard: KYC Lite/Full flows + payout request | Minimax | K02, C09, H05 | L | D19 |
| K04 | Advertiser Dashboard: register → create campaign → upload creative → reports | Minimax | K01, D02 | L | — |
| K05 | Advertiser Dashboard: budget top-up + invoice download | Minimax | K04, H06 | M | D21 |
| K06 | Admin Dashboard: app review queue + creative moderation + audit log viewer | Minimax | K01, I02, I03 | L | — |
| K07 | Admin Dashboard: suspension + revenue-share editor | Minimax | K06, I04, I05 | M | — |

### EPIC L — SDKs

| ID | Task | Agent | Depends | Effort | ADR |
|----|------|-------|---------|--------|-----|
| L01 | Rust core lib: Ed25519 keypair gen, sign, HMAC, secure storage glue | Kimi | — | L | D03, D09 |
| L02 | Android SDK (Kotlin) wrapping Rust core + Play Integrity API integration | Minimax | L01, G03 | XL → split | D01, D03 |
| L03 | iOS SDK (Swift) wrapping Rust core + App Attest integration | Minimax | L01, G03 | XL → split | D01, D03 |
| L04 | Banner + Interstitial + Rewarded ad views (Android) | Minimax | L02 | L | D10 |
| L05 | Banner + Interstitial + Rewarded ad views (iOS) | Minimax | L03 | L | D10 |
| L06 | SDK sample apps (Android + iOS) | Minimax | L04, L05 | M | — |

### EPIC M — Documentation & ADRs

| ID | Task | Agent | Depends | Effort | ADR |
|----|------|-------|---------|--------|-----|
| M01 | ADR files 001–030 in `docs/adrs/` (one per D## in Section 2) | Either | A01 | L | all |
| M02 | `docs/architecture/overview.md` + sequence diagrams (Mermaid) | Either | A01 | M | — |
| M03 | Publisher integration guide (SDK + dashboard walkthrough) | Either | L06, K03 | M | — |
| M04 | Advertiser onboarding guide | Either | K05 | M | — |
| M05 | Runbooks: deploy, rollback, Vault key rotation, Redis failover, Kafka DLQ replay | Either | A02, A07 | L | — |

---

## 10. Acceptance Criteria (per Epic)

- **EPIC A**: `docker-compose up` brings all infra healthy; CI green; ClickHouse receives test event from Kafka.
- **EPIC B**: Login via ZITADEL with PKCE works for each dashboard; backend rejects requests missing/invalid JWT; role claims correctly extracted.
- **EPIC C**: Publisher registers → app created in `pending` → admin approves → device registers with Ed25519 → SDK config returned; KYC Lite mandatory; KYC Full blocked until $500 accrued.
- **EPIC D**: Advertiser registers → campaign created → creative uploaded to CDN → moderation queued; campaign cache visible in Redis within 30s of activation.
- **EPIC E**: Prebid auction runs in <100ms p99; internal adapter returns bids only from active, properly-targeted campaigns; house adapter invoked when no commercial bid wins.
- **EPIC F**: Make-up payment cron computes correct deficit nightly; respects 30% cap and 14-day grace.
- **EPIC G**: Ad request end-to-end p99 < 300ms; impression_token verifies; nonce single-use; rate limits fire correctly under load test.
- **EPIC H**: Impression → spend_event with idempotency works; replaying same Kafka message produces zero double-spend; state transitions on schedule.
- **EPIC I**: Every admin action recorded in audit_events; hash chain verifies; daily notarization succeeds.
- **EPIC J**: Reports match raw ClickHouse aggregates; reconciliation flags >1% deltas.
- **EPIC K**: Publisher and advertiser dashboards complete primary flows without manual DB intervention; admin can approve/suspend.
- **EPIC L**: Sample apps fetch and render image and VAST video ad on real device and Play Integrity-protected device; Ed25519 signing verifies on Gateway.
- **EPIC M**: New engineer onboards from `docs/` alone in <1 day.

---

## 11. Definition of Done (per task)

- Code merged to `main` via PR with at least 1 reviewer.
- Unit tests pass; integration test added if cross-service.
- OpenAPI / Avro schema updated if endpoint or event changed.
- Migration reviewed and applied to dev environment.
- Metrics + log fields added (no PII / no tokens).
- ADR added or updated if a decision is touched.
- No high/critical findings from Trivy.
- Documentation snippet added to `docs/` if user-facing.

---

## 12. Risks & Open Watchlist (Inform Sameh, Don't Block)

These are NOT blockers for V1 — but the orchestrator should flag if encountered during implementation:

- **Vault outage**: cached impression-signing keys good for 1h; SLO defined, alert at 30 min lost connection.
- **Redis cluster outage**: fallback "high-trust mode" max 5 min, then reject.
- **Play Integrity quota**: only used at install registration; monitor monthly usage vs 10k/day standard limit.
- **CDN cost spike**: monitor Bunny.net invoice monthly; >$5k triggers re-evaluation vs R2.
- **FX drift on Pegged currencies**: monitor SAMA/CBUAE pegs; >2% deviation triggers alert (peg break is national event).
- **EGP / floating currency demand**: log onboarding rejections; if >50 publishers/month requesting, escalate V2 hedging design.

---

## 13. Out of Scope for V1 (DO NOT BUILD)

- HTML/MRAID rich media creatives
- Audience-based targeting / retargeting / lookalikes
- External OpenRTB integrations (Google, AppLovin, etc.) as buyers
- Programmatic Guaranteed / Private Marketplace (PMP) deals
- Floating currencies (EGP, TRY, LBP, etc.)
- ML-based fraud detection
- Multi-region active-active deployment
- Real-time bidding from 4jawaly as buyer on external networks
- Identity Graph / cross-app user tracking

---

## 14. Glossary

- **House Ad**: 4jawaly's own filler creative, price=0, served when no commercial bid wins.
- **Guarantee Tier**: T1–T5, daily USD floor for publisher payouts based on 7-day request volume.
- **Pegged Currency**: currency with fixed peg to USD (SAR=3.75, AED=3.6725, etc.).
- **Idempotency Key**: impression_token nonce, used to dedupe spend events.
- **kid**: JWT header field identifying which Vault key signed/should verify the token.
- **Reconciliation States**: pending (0–24h) → confirmed (24–72h) → final (>72h) → disputed (within 30d).
- **KYC Lite / Full**: phone+email vs ID document + Nafath/Qiwa/Trulioo verification.
- **Notarization**: daily publishing of latest audit_events hash to public immutable medium.

---

## 15. Handoff Confirmation

This brief contains everything Codex needs to begin Sprint 1. No architectural questions remain open. Begin by dispatching Epic A in parallel (A01–A10 have minimal cross-dependencies), then unblock Epic B, then fan out C/D/E/F/L01 in parallel.

**Single source of truth**: this file. If it contradicts any chat history, this file wins.

**Maintainer**: Sameh Soliman (`same7soliman.m@gmail.com`).
**Last updated**: 2026-05-31.
