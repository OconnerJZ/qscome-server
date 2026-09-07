# B6 — Marketing & qsCome Ads

## Product boundary

B6 intentionally keeps two commercial domains separate.

### Marketing Center

Marketing Center is business-owned growth tooling.

- available from LEVEL 1
- `marketing.manage` is business-scoped and granted to primary owner, co-owner and manager
- campaigns store an objective, message, audience and schedule
- LEVEL 1 can create campaigns for the aggregate `all` audience
- behavioral audiences require `customer.segments`, available from LEVEL 2
- campaign status is planning/management state; this foundation does not pretend to send email, SMS or push notifications
- no customer identity, phone, email or contact export is exposed

### Customer segments

Segments are aggregate audiences computed from completed orders inside the effective plan analytics-history window.

- all observed customers
- one observed purchase
- returning (2+ observed completed orders)
- frequent (4+ observed completed orders)
- inactive 90+ days

The API returns counts only. These are observable-window segments, not claims about lifetime customer behavior.

### qsCome Ads

qsCome Ads is a separate optional advertising product, not a plan entitlement.

- available to businesses independently of FREE / LEVEL 1 / LEVEL 2 / LEVEL 3
- current surfaces: `explore` and `hero`
- owner configures daily budget, total budget, optional radius and schedule
- owner-created ads begin as `draft`
- submitting an ad moves it to `pending_billing`
- there is intentionally no owner endpoint that changes an ad to `active`
- `spent_amount`, impressions and clicks remain factual counters; this foundation never fabricates spend or delivery
- billing and ad approval/serving are disabled until a real billing/approval integration exists
- future plan benefits such as ad credits remain `coming_soon`

## Organic vs sponsored

Sponsored placement must never modify organic ranking.

- the public sponsored feed is separate from the organic business feed
- Explore renders sponsored businesses in an explicitly labeled `Patrocinado` section only when an approved active campaign exists
- the organic business array is rendered unchanged after the sponsored section
- paid placement cannot guarantee or alter the business's organic position

## Persistence

B6 does not repurpose the legacy `promotions` / `subscription_promotions` tables because those belong to the legacy subscription-promotion model.

New domain tables:

- `marketing_campaigns`
- `ad_campaigns`

This keeps restaurant marketing campaigns and paid advertising semantically distinct from legacy subscription promotions.

## Foundation checklist

- [x] Marketing Center plan entitlement from LEVEL 1
- [x] business-scoped `marketing.manage` authorization
- [x] campaign creation and lifecycle management
- [x] aggregate customer segments from LEVEL 2
- [x] qsCome Ads draft/budget/schedule model independent from subscription tier
- [x] Explore and Hero ad surfaces represented in the domain
- [x] public sponsored feed separated from organic results
- [x] Explore sponsored presentation clearly labeled
- [x] performance counters represented without fabricated activity
- [x] billing/serving explicitly disabled instead of simulated

## Deferred intentionally

- billing provider and payment collection for Ads
- platform approval/moderation workflow that can transition an Ad to `ready` / `active`
- actual impression/click attribution and anti-fraud accounting
- conversion attribution from ad click to completed order/revenue
- email/SMS/push delivery channels
- customer contact exports
- advanced segment builder
- plan ad credits/discounts
- automatic campaign recommendations/automations
