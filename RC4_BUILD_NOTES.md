# Neighbourly v0.5.0 RC4 — production candidate checkpoint

Live v4.3 remains untouched.

## Hosted Supabase now active
- Real Auth/session bootstrap for Customer/Provider accounts.
- Private RLS helpers and least-privilege browser grants.
- Real messages + Realtime subscription.
- `emergency-case` Edge Function (JWT required).
- `service-action` Edge Function (JWT required), including provider mark-done + customer confirmation.
- `create-order` Edge Function (JWT required).
- `support-case` Edge Function (JWT required) with automatic Help Desk triage.

## RC4 privacy and service cutover
- Exact service address moved to protected `service_locations`.
- Provider cannot retrieve the exact address while a request is still awaiting acceptance.
- Direct browser insert to `service_orders` revoked.
- Server-backed service cards use server state for accept/decline/cancel/mark-done/confirm-complete.
- Personal database notifications are surfaced in Updates.
- Sisters Help Desk login no longer uses the prototype `neighbourly-demo` password; production path requires Supabase staff auth and a `sister`/`admin` database role.
- General Help Desk reports from server-backed users become structured `safety_cases`; unsafe/threat/harassment/fraud/scam categories are auto-triaged high priority.

## Verification
- Static/security regression suite: 46/46 passing at checkpoint.

## Deliberately not live yet
- Payment provider / memberships / Boost payment capture.
- KYC vendor webhook.
- Actual Sisters staff account provisioning and MFA configuration.
- App-store signing/developer-account steps.
- Safety timer background scheduling and push delivery (next workstream).
