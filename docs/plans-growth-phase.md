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
- product customization/modifiers
- transfer evidence
- Shared Orders
- verified customer reviews and business responses
- customer participation in loyalty programs
- basic business analytics
- business-scoped roles and permissions

### Approved scale limits

| Limit | FREE | LEVEL 1 | LEVEL 2 | LEVEL 3 |
|---|---:|---:|---:|---:|
| Team members | 3 | 10 | 30 | 90 |
| Menu items/products | 75 | 200 | 500 | 1500 |
| Business gallery photos | 4 | 8 | 15 | 25 |
| Analytics history days | 30 | 90 | 365 | 730 |

Team usage counts active business memberships, including the primary owner, plus non-expired pending membership invitations. Ownership-transfer invitations are not commercial team-seat additions.

### Commercial value matrix

The typed plan catalog is the source of truth. Commercial features can be assigned to a tier before implementation, but they remain `coming_soon` until the actual module exists; no plan may advertise a paid capability as available just because it appears in the roadmap.

#### FREE — Empieza a vender

All core capabilities remain available. FREE may display platform advertising and uses the approved scale limits above. Customers can participate in loyalty programs created by eligible businesses without a consumer subscription.

#### LEVEL 1 — Profesionaliza tu negocio

Available value:

- Reputation Insights: review trends, distribution, category signals and deterministic reputation alerts
- Loyalty Management: configure a simple recurring-order rewards program

Planned value:

- Marketing Center
- benefits for the separate qsCome Ads product (credits/conditions), never guaranteed organic ranking
- increased operational scale

#### LEVEL 2 — Haz crecer tu negocio

Inherits LEVEL 1 and adds planned value:

- advanced analytics
- Customer Intelligence
- customer segments
- advanced exports
- advanced marketing
- increased scale/history

#### LEVEL 3 — Optimiza y escala

Inherits LEVEL 2 and adds planned value:

- automations
- multi-location
- advanced integrations
- highest approved scale/history

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

Prices remain undefined. Numeric scale limits are approved and active independently from billing.

## Subscription domain

Each business has exactly one `business_plan_subscriptions` row.

- `plan_code` stores the persistent/base plan.
- an optional trial overlay stores `trial_plan_code`, `trial_starts_at` and `trial_ends_at`.
- expiry of a trial automatically resolves back to the base plan; no cron is required.
- plan and trial changes are recorded in `business_plan_audit_events`.
- business suspension/lifecycle is not a subscription status.
- `past_due` remains reserved for future billing integration.

## Upgrade/downgrade policy

Plan changes are non-destructive.

- upgrades apply immediately to the base plan and cancel an active trial to avoid ambiguous state
- downgrades never delete or archive existing products, team members or photos
- if a lower plan is below current usage, existing resources remain usable
- only new resource creation in the exceeded category is blocked while usage remains at/above the limit
- reducing/deleting resources can bring the business back under the limit
- order volume, realtime traffic, customers, Shared Orders and reviews are never blocked by downgrade
- loyalty progress and already-generated rewards are preserved on downgrade; new loyalty earning pauses while the business lacks `loyalty.management`
- the admin impact preview shows overages before assignment
- analytics history restricts the requested date window, not order volume or report availability itself

## Limit enforcement

- product creation is serialized per business before counting and inserting
- gallery-photo creation is serialized per business before counting and inserting
- membership invitation creation is serialized per business and counts active members plus pending invitations
- editing/removing existing resources remains allowed when usage is above a downgraded limit
- owner plan UI shows progressive usage guidance at 80%, 90% and 100%
- 100% blocks only new additions in that scale category
- backend remains authoritative; frontend warnings are UX only

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

## Reputation Intelligence domain

Reputation Insights is a Level 1+ commercial capability layered on top of core reviews. It never gates receiving, reading or responding to reviews.

- private business endpoint guarded by `reviews.manage` and plan entitlement
- periods follow the effective plan analytics-history allowance
- average rating compared with the previous equivalent period
- 5-to-1 star distribution and low-rating share
- response rate and unanswered-review count
- food/time/presentation/accuracy category averages and weakest category with minimum sample
- daily trend points for recent review activity
- deterministic alerts for rating drops/improvements, low-rating concentration, low response rate and weak categories
- fewer than 5 reviews returns descriptive metrics but suppresses trend alerts to avoid over-interpreting tiny samples
- automated sentiment/themes are intentionally not implemented yet; they require adequate review volume and a separate quality/privacy decision

## Loyalty domain

Loyalty participation is customer-core/free. Program management is a Level 1+ business capability.

- one configurable program per business
- current B4.1 model: one qualifying completed order adds one stamp
- owner configures required orders (2–20), future reward discount (5–30%) and optional minimum order amount
- crossing the threshold generates an available reward and carries remaining stamps forward
- `loyalty_accounts` stores customer progress and available rewards per business
- `loyalty_events` is the auditable/idempotent ledger; `(order_id, event_type)` is unique so the same event cannot be applied twice while future redemption can coexist with completion accrual on the same order
- every completed order occurring after the program exists is marked once in the ledger; ineligible completions receive zero deltas with a reason (`program_paused`, `plan_paused`, or `below_minimum`) so they cannot become retroactively eligible later
- missed completion processing self-reconciles only for completions after the loyalty program was created
- completing an order never fails solely because loyalty processing has a transient issue; reconciliation can recover it later
- lowering the business to a plan without Loyalty Management preserves progress/rewards but pauses new earning
- Shared Order accrual currently follows the qsCome order owner/payer (`orders.user_id`), not every participant
- B4.1 does not yet change order totals; server-authoritative reward redemption is B4.2

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

- [x] define feature-value matrix for FREE / LEVEL 1 / LEVEL 2 / LEVEL 3
- [x] approve numeric limits
- [x] activate approved limits in the typed catalog
- [x] define non-destructive upgrade/downgrade policy
- [x] add non-destructive admin impact preview before changing plan
- [x] add serialized/race-safe creation checks for products, photos and team invitations
- [x] enforce analytics history window by effective plan
- [x] owner UX for value comparison without aggressive upselling
- [x] owner usage guidance at 80% / 90% / 100%

B2 is complete at the product/foundation level. Billing/pricing remains a separate future concern and does not affect core ordering capabilities.

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

#### B3.2 Reputation Intelligence — foundation complete

- [x] activate `reputation.insights` from Level 1+
- [x] private business-scoped insights endpoint
- [x] plan-aware reputation-history periods
- [x] current vs previous rating trend
- [x] star distribution and low-rating share
- [x] response-rate opportunity signal
- [x] category averages and weakest-category signal
- [x] deterministic warning/opportunity/positive alerts
- [x] suppress trend alerts below 5 reviews
- [x] owner Reputation Intelligence panel
- [ ] automated sentiment/themes only after enough review volume exists

Customer reliability / Trust Score is deliberately not part of B3.2. It requires its own abuse, dispute, appeal and privacy model before implementation.

### B4 — Loyalty

#### B4.1 Earn — foundation complete

- [x] make customer participation core/free
- [x] activate `loyalty.management` from Level 1+
- [x] add business-scoped `loyalty.manage` permission for owner/co-owner/manager
- [x] configurable orders-required / reward-percent / minimum-order model
- [x] add program, account and event-ledger persistence
- [x] credit qualifying completed orders idempotently
- [x] mark non-qualifying completed orders to prevent retroactive earning
- [x] self-reconcile missed completion processing without importing pre-program history
- [x] preserve progress/rewards and pause new earning after downgrade
- [x] owner Loyalty configuration UI
- [x] customer progress/rewards summary in My Orders

#### B4.2 Redeem — next

- [ ] server-authoritative reward eligibility during checkout
- [ ] persist reward/discount snapshot on the order
- [ ] consume one available reward atomically with order creation
- [ ] calculate final discounted total on the server
- [ ] prevent reward reuse under concurrent checkout requests
- [ ] define cancellation/refund policy for consumed rewards
- [ ] checkout UX to apply/remove an available reward

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
