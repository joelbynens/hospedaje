# FNMT Root Certificate — SES.Hospedaje TLS validation

The Spanish Ministry of Interior SES servers use TLS certificates issued by **FNMT-RCM**
(Fábrica Nacional de Moneda y Timbre), the Spanish government CA. This CA is not included
in the standard Node.js / OpenSSL CA bundle, so without it Node.js will reject the connection.

Without this file the app falls back to `rejectUnauthorized: false` (connection works but
the server certificate is not validated — a warning is logged).

## How to obtain and install the certificate

**Step 1 — Download the FNMT root certificate**

Go to: https://www.sede.fnmt.gob.es/descargas/certificados-raiz-de-la-fnmt-rcm

Download: **AC Raíz FNMT-RCM SHA256** — filename `AC_Raiz_FNMT-RCM_SHA256.cer`

**Step 2 — Convert DER → PEM**

```bash
openssl x509 -inform DER -in ~/Downloads/AC_Raiz_FNMT-RCM_SHA256.cer -out certs/fnmt.pem
```

**Step 3 — Verify**

```bash
openssl x509 -in certs/fnmt.pem -noout -subject -issuer -dates
# Expected: subject/issuer = "CN=AC RAIZ FNMT-RCM SHA256", dates should be valid until ~2030
```

**Step 4 — Test**

```bash
SES_MOCK=false node scripts/test-ses.mjs rh
# Should no longer show the "falling back to rejectUnauthorized:false" warning
```

## Vercel deployment

Add the PEM content as an environment variable in Vercel:

```
FNMT_CERT_PATH=/var/task/certs/fnmt.pem
```

And commit the `certs/fnmt.pem` file to the repo (it is a public certificate — no security risk).

## .gitignore

The `certs/` directory should NOT be in .gitignore since FNMT certificates are public.
Make sure `.gitignore` does not exclude `*.pem` or `certs/`.
