# Authenticating to Fleet

This webhook calls Fleet on every inbound ACME request to look up the host by serial number. This document explains how it authenticates to Fleet, why that approach was chosen, and what the alternatives are.

## Current approach: API-only user (static bearer)

The webhook reads a single `FLEET_TOKEN` from the environment and sends it as `Authorization: Bearer <token>` on every Fleet API call. The token comes from a Fleet [API-only user](https://fleetdm.com/docs/using-fleet/fleetctl-cli#create-an-api-only-user) — a user account created with `--api-only` whose session token does **not** expire server-side.

Under the hood, an API-only user has `users.api_only = true` in Fleet. When Fleet validates the session, it short-circuits the expiry check for these users (see `server/service/sessions.go:912-932`):

```go
sessionDuration := svc.config.Session.Duration
if session.APIOnly != nil && *session.APIOnly {
    sessionDuration = 0 // make API-only tokens unlimited
}
if sessionDuration != 0 && time.Since(session.AccessedAt) >= sessionDuration {
    ...
}
```

The token is minted once at user-creation time (`POST /api/v1/fleet/users/api_only` returns `{"token": "..."}`) and lives indefinitely until the user is deleted or the token is rotated.

**Why this approach:**

- **No token-exchange round-trip.** Each webhook invocation makes exactly one outbound HTTP call to Fleet.
- **No in-memory token cache** and no retry-on-401-and-re-login state machine.
- **One secret to provision and rotate.** `fleetctl user create --api-only ...` once, paste the result into `FLEET_TOKEN`, done.

**Tradeoffs:**

- The bearer token is long-lived and crosses the wire on every request. If it is captured anywhere (log aggregator, reverse proxy, memory dump), the attacker has full access until you rotate it.
- Rotation is manual: delete the API-only user (or rotate via the API) and update `FLEET_TOKEN`. There is no automatic refresh.
- The token's permissions are whatever role the API-only user was created with. Use the narrowest role that works (`observer` is sufficient for host reads).

## Original Jamf approach: OAuth 2.0 client_credentials

The Jamf-backed predecessor of this webhook used OAuth 2.0 client_credentials. `JAMF_CLIENT_ID` and `JAMF_CLIENT_SECRET` were exchanged at Jamf's `/api/oauth/token` for a short-lived access token (typically ~30 minutes), which was cached in-process by client id and re-fetched on miss.

```
POST {JAMF_URL}/api/oauth/token
  grant_type=client_credentials
  client_id=...
  client_secret=...
→ { "access_token": "...", "token_type": "Bearer", "expires_in": 1799 }
```

**Where this helped:**

- The long-lived secret only crossed the wire when fetching a new access token. Every other API call carried the short-lived bearer, so accidental request logging or a leaky proxy exposed only the short-lived token.
- Short-lived tokens reduce the window of usefulness for a captured bearer.

**Where it didn't help:**

- At rest, the client secret in env is just as exploitable as a long-lived bearer — an attacker with the secret can mint access tokens at will until the secret is rotated. So the at-rest leak risk is the same.

## Alternative not implemented: regular Fleet user (login → session)

A regular (non-API-only) Fleet user would be the closest direct analog to the Jamf OAuth flow. Implementation would look like this:

1. Add `FLEET_EMAIL` + `FLEET_PASSWORD` to env.
2. Add a `getFleetToken` helper that POSTs `{email, password}` to `/api/v1/fleet/login`, receives `{token, token_expires_at, ...}`, and caches `token` in-memory keyed by email. Cache TTL would be `(token_expires_at - now) - 60s` as a safety margin.
3. In `getFleetData`, treat any 401 from Fleet as a cache invalidation signal: drop the cached token, log in again, retry the host lookup once.

**How Fleet sessions actually expire:** Fleet's `session.duration` (default `120h` / 5 days) is a sliding window — every authenticated request resets the clock via `MarkSessionAccessed`. A regular user's session only dies after `session.duration` of consecutive **inactivity**. If this webhook is called at least once every 5 days, the session never dies in practice.

**Limitation: `session.duration` is server-wide.** It is configured once on the Fleet server (env `FLEET_SESSION_DURATION` or YAML) and cannot be overridden per user. The only per-user dial is the `api_only` boolean, which is all-or-nothing (use the server default, or never expire). You cannot, e.g., issue a regular user a 30-minute session like Jamf does. So the regular-user flow does not actually give you the "short-lived bearer" property — it gives you a "5-day-idle bearer" property.

**When this would be worth the added complexity:**

- You want sessions to die after an idle window as a defense-in-depth measure (so a stolen bearer becomes useless after some days of disuse).
- The password is operationally easier to rotate than the session token (e.g. it lives in a secret manager with automatic rotation).
- You want the long-lived secret to cross the wire only on login, not on every request.

For this webhook, none of those benefits are large enough to justify the extra code path. We use the API-only user.

## Comparison

| | Jamf OAuth CC (original) | Fleet API-only user (current) | Fleet regular user (alternative) |
|---|---|---|---|
| Long-lived secret in env | `client_id` + `client_secret` | `FLEET_TOKEN` (the bearer itself) | `email` + `password` |
| Sent on every API call | short-lived `access_token` | long-lived `FLEET_TOKEN` | short-ish session key |
| Long-lived secret on the wire | only on `/token` exchange | every request | only on `/login` |
| Server-side expiry | ~30 min (typical `expires_in`) | none (`api_only` short-circuits) | 5-day sliding window (server-wide; not per-user) |
| Cache / refresh logic | token cache keyed by client_id, TTL = `expires_in` | none | token cache keyed by email, TTL ≈ `token_expires_at`, plus 401-retry-relogin |
| Code complexity in this repo | medium | low | medium |
| Rotation | rotate secret in Jamf → next exchange | delete + recreate API-only user | rotate password |

## Recommendation

API-only user, unless you have a specific reason to want server-side session expiry. The operational simplicity is real, and the marginal security improvement of the regular-user flow is small given the at-rest secret already grants the attacker everything.
