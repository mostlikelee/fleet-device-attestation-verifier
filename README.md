# Fleet device attestation verifier #

An ACME webhook that verifies Apple Managed Device Attestation (MDA) submissions against [Fleet](https://fleetdm.com/) as the device source of truth. The ACME CA POSTs `{Nonce, SerialNumber, UDID, ...}` to `/appleMDAWebhook`; this service looks the device up in Fleet by serial number, optionally checks label membership, and returns `true`/`false`.

This is a port of an earlier Jamf-backed verifier. See [AUTH.md](./AUTH.md) for a comparison of the auth approaches.

Getting Started
---------------

```bash
git clone <this repo>
cd jamf-device-attestation-verifier
npm install
```

Create a `.env` from [.env.example](.env.example) and fill in the required variables:

```
FLEET_URL=https://fleet.example.com
FLEET_TOKEN=<API-only user session token>
```

### Obtaining `FLEET_TOKEN`

Create an [API-only user](https://fleetdm.com/docs/using-fleet/fleetctl-cli#create-an-api-only-user) in Fleet and use its session token. Read access to hosts is sufficient (`observer` global role).

```bash
fleetctl user create \
  --email acme-webhook@example.com \
  --name "ACME Webhook" \
  --password <password> \
  --api-only \
  --global-role observer
```

Capture the returned `token` and paste it as `FLEET_TOKEN`. API-only user tokens do not expire; rotate by deleting and recreating the user.

# Running Development with Hot Reloading

```bash
npm run dev
```

# Running Production

```bash
npm run build
npm run start
```

# Test

Testing URL
```
http://localhost:8001/appleMDAWebhook
```

Example of data that ACM will send to you
```
$ curl --header "Content-Type: application/json" \
  --header 'Authorization: Bearer token' \
  --request POST \
  --data '{"Nonce":"3DfUVKHIBNEdfUAPxSRjpg","SEPVersion":"15.0.1","OtherOIDs":[{"oid":"2.5.29.19","value":{"0":48,"1":0}},{"oid":"2.5.29.15","value":{"0":3,"1":2,"2":4,"3":240}},{"oid":"1.2.840.113635.100.8.10.3","value":{"0":49,"1":53,"2":46,"3":48,"4":46,"5":49}},{"oid":"1.2.840.113635.100.8.10.1","value":{"0":49,"1":50,"2":46,"3":52}},{"oid":"1.2.840.113635.100.8.9.4","value":{"0":74,"1":52,"2":49,"3":51,"4":65,"5":80}},{"oid":"1.2.840.113635.100.8.13.3","value":{"0":2,"1":1,"2":0}}],"SecurityLevel":"020100","SecurityLevelLabel":"FullSecurity","SerialNumber":"LV9T17L9WK","UDID":"00008112-000A68263C06201E"}' \
  http://localhost:8001/appleMDAWebhook
```

Logic for checking the device against Fleet is in [postAppleMDAWebhook](./src/webhook/routes/postAppleMDAWebhook.ts) in function `checkDevice`. The Fleet lookup itself lives in [getFleetData](./src/fleet/getFleetData.ts).
