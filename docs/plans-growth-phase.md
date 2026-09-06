# Plans & Growth Phase

## Product principles

1. The customer experience remains free at the core. Ordering, checkout, realtime tracking and Shared Orders are not subscription paywalls.
2. FREE must be viable for a real small business. Paid plans primarily monetize scale, insight and growth tooling.
3. Realtime is core infrastructure and must not degrade by plan.
4. Reviews are platform/customer trust infrastructure. Every business can receive reviews; paid plans may add reputation intelligence and management tools.
5. Advertising is a separate optional commercial product. A subscription may provide credits, discounts or better tooling, but must not guarantee organic ranking.
6. Organic ranking and sponsored placement remain distinct; sponsored surfaces must be clearly labeled.
7. Customer subscriptions are out of scope until qsCome can offer recurring consumer value such as rewards, savings or cross-business benefits.

## Commercial model

### Core — never plan-gated

- secure ordering and validated prices
- realtime updates
- kitchen workflow
- transfer evidence
- Shared Orders
- verified customer reviews and business responses
- basic business analytics
- business-scoped roles and permissions

### Scale limits — configurable, numbers pending commercial approval

- team members
- menu items/products
- business gallery photos
- analytics history days

### Growth capabilities — roadmap, not implemented entitlements yet

- advanced Reputation Center insights (trends, alerts, themes)
- loyalty management
- customer intelligence
- Marketing Center
- campaign segmentation
- advanced analytics
- exports
- automations
- multi-location/integrations when justified

### Advertising product — separate from subscription

Potential surfaces:

- sponsored Explore listings
- sponsored category/search positions
- optional hero campaigns

Requirements:

- clearly marked as sponsored
- relevance still matters
- owner controls budget and pause/stop
- organic ranking cannot be bought
- campaign reporting should connect spend to orders/revenue when possible

## Plan positioning

- FREE — start selling
- LEVEL 1 — professionalize the business
- LEVEL 2 — grow the business
- LEVEL 3 — optimize and scale

Prices and numeric limits intentionally remain undefined until the value matrix is approved.

## Subscription domain

Each business has exactly one `business_plan_subscriptions` row.

- `plan_code` stores the persistent/base plan.
- an optional trial overlay stores `trial_plan_code`, `trial_starts_at` and `trial_ends_at`.
- expiry of a trial automatically resolves back to the base plan; no cron is required.
- plan and trial changes are recorded in `business_plan_audit_events`.
- business suspension/lifecycle is not a subscription status.
- `past_due` remains reserved for future billing integration.

## Admin access

Platform administration uses the global `user_roles.role_name = 'admin'` role. Public registration can never self-assign it.

- frontend route: `/admin`
- frontend guard: authenticated session + `user.role === 'admin'`
- backend namespace: `/api/admin`
- backend security: `authenticate` + `authorize('admin')`
- frontend guards are UX only; backend authorization remains authoritative

## Reviews domain

The existing `review_comments` table remains the canonical review store and is evolved rather than replaced.

- one verified review per completed order
- the authenticated order owner is resolved by the backend; client payload cannot choose `userId` or `businessId`
- overall rating is 1–5
- optional food/time/presentation/accuracy ratings are 1–5
- a business response is public and does not alter the customer's score
- `reviews.manage` is business-scoped and available to primary owner, co-owner and manager
- public review payloads expose verification state but not internal user/order/business identifiers
- historical review rows remain readable while verified-order data is introduced
- private customer reliability feedback is deliberately a separate follow-up; it is not mixed into public ratings

## Delivery blocks

### B1 — Plan foundation

- [x] branch from current `main`
- [x] typed catalog and policies
- [x] remove Shared Orders from commercial limits
- [x] base plan + trial overlay
- [x] backfill existing businesses with FREE where missing
- [x] create new businesses with FREE transactionally
- [x] lightweight capability resolution
- [x] plan/trial audit history
- [x] admin endpoints for plan assignment and trial lifecycle
- [x] owner plan UI updated for base/effective/trial state
- [x] catalog unit tests

### B2 — Commercial matrix

- [ ] approve feature/value matrix for FREE / LEVEL 1 / LEVEL 2 / LEVEL 3
- [ ] approve numeric limits
- [ ] define final upgrade/downgrade policy when current usage exceeds a lower plan
- [x] add non-destructive admin impact preview before changing plan
- [ ] add race-safe enforcement for approved hard limits
- [ ] owner UX for limits and upgrade guidance without aggressive upselling

No downgrade currently deletes or disables existing products, team members or photos. The impact preview is informational until numeric limits and the downgrade policy are approved.

### B3 — Reviews & Reputation

#### B3.1 Core reviews — complete

- [x] evolve the existing review schema without creating a parallel module
- [x] verified-order customer reviews
- [x] one review per completed order enforced in backend/database
- [x] 1–5 overall rating and optional category ratings
- [x] public business rating/reviews
- [x] public verified-purchase indicator without leaking internal order/user ids
- [x] customer review flow from My Orders
- [x] business-scoped `reviews.manage` permission
- [x] owner/co-owner/manager response flow
- [x] owner review dashboard with basic aggregate reputation summary
- [x] Reviews remain core and are not plan-gated

#### B3.2 Reputation intelligence / trust — later

- [ ] private customer reliability feedback for platform safety
- [ ] define abuse/dispute safeguards before using customer reliability signals
- [ ] Level 1+ reputation trends, alerts and deeper insights
- [ ] sentiment/themes only after enough review volume exists

### B4 — Loyalty

- [ ] simple rewards model first
- [ ] customer participation remains free
- [ ] owner management/advanced rules become commercial capabilities

### B5 — Customer Intelligence

- [ ] new vs returning customers
- [ ] repeat rate
- [ ] average ticket by cohort
- [ ] inactivity/churn windows
- [ ] Shared Order analytics as intelligence, not a usage paywall

### B6 — Marketing & qsCome Ads

- [ ] Marketing Center
- [ ] campaigns/promotions
- [ ] customer segments
- [ ] sponsored listings
- [ ] optional hero campaigns
- [ ] budget controls and performance reporting

### B7 — Minimal Admin plan controls

- [x] global admin route guard
- [x] admin-only backend namespace
- [x] search business by name, email or ID
- [x] inspect base/effective plan and trial
- [x] assign plan
- [x] grant/cancel trial
- [x] inspect plan history
- [x] preview commercial impact before plan assignment
- [x] keep plan mutations protected by backend admin authorization

The full Admin Control Center remains a later phase.
