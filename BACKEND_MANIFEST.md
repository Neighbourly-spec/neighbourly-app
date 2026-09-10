# Neighbourly RC5.2 Backend Manifest

Project: `kgsfuyzieijmyfdsnqxc`

Active production-candidate Edge Functions expected by this frontend:
- emergency-case v1
- service-action v5
- create-order v5
- support-case v2
- sisters-action v4
- provider-application v2
- sisters-queue v1
- provider-pricing v1
- profile-media v2
- media-manage v1
- sisters-media-queue v2
- admin-reporting v4
- admin-records v2
- account-deletion v1

Important server schema additions include provider pricing, quote state, private media metadata/storage, membership entitlements, growth history, platform event history, admin reporting, and account deletion requests.

Live v4.3 remains separate and must not be overwritten by this release candidate.

Checkpoint QA: 74/74 static regression checks passing on 2026-09-10.


## RC5.2 additions
- provider-boost v3 active: fair-use state, area slot availability, 24-hour duration, cooldown and rolling cap surfaced to providers.
- provider-discovery v2 active: fair round-robin promoted placement for narrowed service + area discovery.
- Boost product catalogue direct client access revoked; server endpoint is authoritative.
- Promotions admin drilldown surfaced.
- Static QA: 74/74 passing on 2026-09-10.
