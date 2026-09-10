# Neighbourly RC5.2 Build Notes

RC5.2 integrates the server-backed fair Boost and discovery work into the recovered RC5.1 frontend.

## Boost fairness
- One 24-hour Boost at a time per provider.
- 24-hour cooling period after expiry; no consecutive advertising days.
- Maximum 3 Boost activations in a rolling 7-day period.
- Maximum 3 active Boosts for the same service + area.
- Paid Explore placement rotates fairly; Boost never changes trust, ratings, verification, safety or enforcement.
- Server-backed providers activate and refresh Boost state through the protected provider-boost Edge Function.
- Generic Explore browsing stays organic; promoted placement is only used for a narrowed real service + area match.
- Promoted state is scoped to Explore and is not reused as Spotlight. Spotlight remains separate and not implemented in RC5.2.

## Admin / reporting
- Promotions drilldown surfaced in Admin Analytics.
- Discovery instrumentation is privacy-light and excludes messages, addresses, KYC and phone data.

## Safety / scope
- Live v4.3 was not modified.
- Worker Marketplace remains out of MVP.
