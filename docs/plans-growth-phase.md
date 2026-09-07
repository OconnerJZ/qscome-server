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
- basic business analytics
- business-scoped roles and permissions

### Approved scale limits

| Limit | FREE | LEVEL 1 | LEVEL 2 | LEVEL 3 |
|---|---:|---:|---:|---:|
| Team members | 3 | 10 | 30 | 90 |
| Menu items/products | 75 | 200 | 500 | 1500 |
| Business gallery photos | 4 | 8 | 15 | 25 |
| Analytics history days | 30 | 90 | 365 | 730 |

Team usage counts active business memberships, including the primary owner, plus non-expired pending membership invitations. Ownership-transfer invitations are not commercial team-seat additions. A transfer that retains the previous owner as co-owner validates the real additional seat before acceptance.

### Commercial value matrix

The typed plan catalog is the source of truth. Commercial features can be assigned to a tier before implementation, but they remain `coming_soon` until the actual module exists; no plan may advertise a paid capability as available just because it appears in the roadmap.

#### FREE — Empieza a vender

All core capabilities remain available. FREE may display platform advertising and uses the approved scale limits above.

#### LEVEL 1 — Profesionaliza tu negocio

Available value:

- Reputation Insights
- Loyalty Management
- Marketing Center for aggregate `all` campaigns

Planned value:

- benefits for the separate qsCome Ads product (credits/conditions), never guaranteed organic ranking
- increased operational scale

#### LEVEL 2 — Haz crecer tu negocio

Inherits LEVEL 1.

Available value:

- Customer Intelligence: aggregate new/returning cohorts, repeat behavior, inactivity and Shared Order impact
- Customer Segments for Marketing audiences

Planned value:

- advanced analytics
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

Foundation surfaces:

- sponsored Explore listings
- optional Hero campaigns represented in the Ads domain

Requirements:

- clearly marked as sponsored
- relevance still matters
- owner controls budget and pause/stop
- organic ranking cannot be bought
- campaign reporting should connect spend to orders/revenue when real serving/attribution is implemented

Current foundation intentionally does not enable billing, approval-to-active transitions, real serving, attribution or fabricated performance counters.

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
- downgrades never delete or archive existing products, team members, photos, loyalty state or marketing campaign configuration
- if a lower plan is below current usage, existing resources remain usable
- only new resource creation in the exceeded category is blocked while usage remains at/above the limit
- reducing/deleting resources can bring the business back under the limit
- order volume, realtime traffic, customers, Shared Orders and reviews are never blocked by downgrade
- premium campaign configuration is preserved, but actions that require a lost entitlement cannot be reactivated until the business regains that entitlement
- the admin impact preview shows overages before assignment
- analytics history restricts the requested date window, not order volume or report availability itself

## Limit enforcement

- product creation is serialized per business before counting and inserting
- gallery-photo creation is serialized per business before counting and inserting
- membership invitation creation is serialized per business and counts active members plus pending membership invitations
- ownership-transfer invitations do not reserve commercial seats; retaining the previous owner as co-owner validates the actual membership delta under the same business lock
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
- one qualifying completed order adds one stamp
- owner configures required orders (2–20), reward discount (5–30%) and optional minimum order amount
- crossing the threshold generates an available reward and carries remaining stamps forward
- `loyalty_accounts` stores customer progress and available rewards per business
- `loyalty_events` is the auditable/idempotent ledger; `(order_id, event_type)` is unique
- every completed order occurring after the program exists is marked once in the ledger; ineligible completions receive zero deltas with a reason so they cannot become retroactively eligible later
- missed completion processing self-reconciles only for completions after the loyalty program was created
- lowering the business to a plan without Loyalty Management preserves progress/rewards but pauses new earning
- Shared Order accrual currently follows the qsCome order owner/payer (`orders.user_id`), not every participant
- checkout sends only redemption intent; backend recalculates product prices and reward eligibility
- redemption locks the customer loyalty account, consumes exactly one available reward and writes `reward_redeemed`
- the order stores immutable reward snapshot fields: subtotal before discount, percent, discount amount and final total
- concurrent attempts to consume the same last reward cannot both succeed
- order status transitions are serialized so acceptance/cancellation/completion cannot race against each other from the same prior state
- cancelling an order with a consumed reward restores exactly one reward and writes `reward_restored`
- completion earning uses the pre-discount subtotal for minimum-order eligibility

## Customer Intelligence domain

Customer Intelligence is a Level 2+ commercial capability layered on top of core business analytics. Basic customer counts and repeat-rate KPIs remain available to every plan.

- private business endpoint guarded by `reports.read` plus the `customer.intelligence` plan entitlement
- requested periods remain constrained by the effective plan analytics-history allowance
- new vs returning customers are calculated from completed orders inside the observable analytics-history window
- average ticket, order count and revenue are compared by new/returning cohort
- observed frequency buckets show 1, 2–3, 4–7 and 8+ completed orders inside the observable history window
- inactivity bands show 0–30, 31–60, 61–90 and 90+ days since the last completed order inside the observable history window
- Shared Order intelligence reports share of completed orders, revenue, shared vs individual average ticket and average distinct participants per shared session
- Shared Orders themselves remain core/free and are never restricted by these analytics
- fewer than 5 customers or 5 completed orders suppresses deterministic opportunity signals while descriptive metrics remain visible
- signals are deterministic and explainable; no predictive churn score or opaque customer scoring is introduced
- responses are aggregate-only and do not expose customer names, emails, phones or internal IDs
- frequency/inactivity wording deliberately says “observed” because plan history limits may hide older activity
- individual customer profiles and contact exports remain out of scope; aggregate customer segments are implemented only inside the Marketing privacy boundary

## Marketing & qsCome Ads domain

B6 intentionally separates business-owned Marketing from the optional qsCome Ads product.

### Marketing Center

- `marketing.center` is available from Level 1+
- `marketing.manage` is business-scoped for primary owner, co-owner and manager
- campaigns store objective, message, audience, dates and lifecycle status
- Level 1 can manage campaigns for the aggregate `all` audience
- behavioral audiences require `customer.segments`, available from Level 2+
- a downgrade preserves campaign configuration but blocks scheduling/reactivating a segmented campaign without the required entitlement
- campaign lifecycle is planning/management only; direct email/SMS/push delivery is not implemented
- no raw customer identity/contact export is exposed

### Customer Segments

- aggregate audiences are derived from completed orders inside the effective analytics-history window
- supported foundation audiences: all, new/one observed purchase, returning, frequent and inactive 90+
- API returns aggregate counts only

### qsCome Ads

- independent from FREE / Level 1 / Level 2 / Level 3 subscription entitlement
- owner can create draft campaigns with Explore/Hero surface, budget, radius and schedule
- submit moves Ads to `pending_billing`
- owner has no endpoint to activate an Ad
- billing, approval/moderation, serving, attribution and anti-fraud accounting remain deferred
- sponsored Explore results are rendered in a separate clearly labeled section and never alter organic ranking
- counters are stored for the future serving domain but this foundation never fabricates spend, impressions or clicks
- plan Ads benefits/credits remain `coming_soon`

See `docs/b6-marketing-ads.md` for the focused B6 boundary and deferred work.

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

### B3 — Reviews & Reputation

#### B3.1 Core reviews — complete

- [x] evolve the existing review schema without creating a parallel module
- [x] verified-order customer reviews
- [x] one review per completed order enforced in backend/database
- [x] 1–5 overall rating and optional category ratings
- [x] public business rating/reviews
- [x] customer review flow from My Orders
- [x] business-scoped `reviews.manage` permission
- [x] owner/co-owner/manager response flow
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

### B4 — Loyalty

#### B4.1 Earn — complete

- [x] make customer participation core/free
- [x] activate `loyalty.management` from Level 1+
- [x] add business-scoped `loyalty.manage` permission for owner/co-owner/manager
- [x] configurable orders-required / reward-percent / minimum-order model
- [x] add program, account and event-ledger persistence
- [x] credit qualifying completed orders idempotently
- [x] mark non-qualifying completed orders to prevent retroactive earning
- [x] preserve progress/rewards and pause new earning after downgrade
- [x] owner Loyalty configuration UI
- [x] customer progress/rewards summary in My Orders

#### B4.2 Redeem — complete

- [x] server-authoritative reward eligibility during checkout
- [x] persist reward/discount snapshot on the order
- [x] consume one available reward atomically with order creation
- [x] calculate final discounted total on the server
- [x] prevent reward reuse under concurrent checkout requests
- [x] restore a consumed reward exactly once when the order is cancelled
- [x] checkout UX to apply/remove an available reward
- [x] expose loyalty snapshot in order payloads/history

### B5 — Customer Intelligence — foundation complete

- [x] activate `customer.intelligence` from Level 2+
- [x] preserve basic customer KPIs as core analytics
- [x] new vs returning customer cohorts inside observable plan history
- [x] repeat/frequency analysis within observable plan history
- [x] average ticket and revenue by cohort
- [x] inactivity bands without exposing customer identities
- [x] Shared Order analytics as intelligence, not a usage paywall
- [x] average distinct participants per shared session
- [x] deterministic signals with minimum sample protection
- [x] aggregate-only API with no customer contact details or IDs
- [x] owner Customer Intelligence panel with Level 2 gate

### B6 — Marketing & qsCome Ads — foundation complete

- [x] Marketing Center entitlement from Level 1+
- [x] business-scoped campaign management
- [x] campaign objectives, message, audience, schedule and lifecycle
- [x] aggregate customer segments from Level 2+
- [x] downgrade-safe segmented campaign activation
- [x] qsCome Ads domain independent from subscription tier
- [x] Explore/Hero ad surfaces represented
- [x] budget/radius/schedule controls
- [x] owner submit to `pending_billing` only
- [x] public sponsored feed separated from organic results
- [x] clearly labeled sponsored Explore section
- [x] factual counter persistence without fabricated serving data
- [x] billing/serving explicitly disabled instead of simulated

Deferred intentionally:

- billing/payment provider and Ads economics
- moderation/approval and transition to active serving
- impression/click anti-fraud accounting
- conversion attribution / ROAS
- direct email/SMS/push delivery
- raw contact exports
- advanced segment builder
- Ads plan credits/discounts
- automations

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

The full Admin Control Center remains a later phase. Its future backlog includes a Feature Control Center with audited global/plan/business runtime controls for selected non-core features; security, authorization, pricing integrity and core data consistency must never become admin-switchable feature flags.
