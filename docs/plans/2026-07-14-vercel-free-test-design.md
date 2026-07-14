# WBoke Vercel Free Test Design

## Goal

Validate the complete account path at zero infrastructure cost before moving the
commercial service to a Hong Kong VPS: email verification, registration, login,
API key creation, dashboard access, and desktop authentication.

## Test Architecture

- Vercel static deployment: WBoke marketing and authentication UI
- Vercel container function in `hkg1`: New API `v1.0.0-rc.21`
- Neon Free in Singapore: PostgreSQL
- Upstash Free in Singapore: Redis
- AgentMail Free: registration verification email

The website proxies New API dashboard and `/api/*` paths to the generated New API
test URL. The relay API uses the New API URL directly. Test domains remain under
`vercel.app`; `wboke.com` is not changed during this phase.

## Boundaries

- No real upstream provider keys
- No real recharge codes or payments
- No production user data
- No Turnstile until desktop browser authorization exists
- No claim of production reliability for the Vercel container function
- Rotate the AgentMail key disclosed during testing before SMTP configuration

## Verification

1. New API `/api/status` returns success.
2. Setup creates the root administrator.
3. AgentMail sends a registration code to a personal email.
4. A new user registers without an invitation code and signs in.
5. The user can create and reveal an API key.
6. WBoke Desktop signs in and loads the normalized account snapshot.

## Exit Criteria

After the flow passes, deploy New API, PostgreSQL, and Redis to a Hong Kong VPS.
The Vercel website may remain as the production frontend with external rewrites
to the VPS.
