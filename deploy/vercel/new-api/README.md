# New API Vercel Test

This directory deploys the pinned New API image as an experimental Vercel
container function. It is for free functional testing, not the final paid
service.

Required runtime variables:

- `DATABASE_URL` or `SQL_DSN`
- `REDIS_URL`, `KV_URL`, or `REDIS_CONN_STRING`
- `SESSION_SECRET`
- `CRYPTO_SECRET`
- `TZ=Asia/Hong_Kong`
- `STREAMING_TIMEOUT=280`
- `RELAY_IDLE_CONN_TIMEOUT=90`

Provision Neon Postgres and Upstash Redis through the Vercel Marketplace. Keep
all credentials in Vercel environment variables; never add them to this folder.
