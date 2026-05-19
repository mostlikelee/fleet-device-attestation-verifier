# Jamf device attestation verifier #

Getting Started
---------------

The easiest way to get started is to clone the repository:

```bash
# Get the latest snapshot
git clone git@bitbucket.org:hydrantid/jamf-device-attestation-verifier.git

# Change directory
cd jamf-device-attestation-verifier

# Install NPM dependencies
npm install
```

Create .env file from [.env.example](.env.example) and change required variables:
```
JAMF_URL=https://example.jamfcloud.com
JAMF_CLIENT_ID=6cabf059-21c9-44d6-bbde-02898f7430dd
JAMF_CLIENT_SECRET=dzmsPks-FwXpks80jhQGZZrAV3H2_ER0NAk91RE-xOBZvfghd98EM1hF9msfkanl
```

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

Logic for check device again Jamf is in [postAppleMDAWebhook](./src/webhook/routes/postAppleMDAWebhook.ts) in function ``checkDevice``
