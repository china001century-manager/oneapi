# Hong Kong deployment

This deployment pins New API to `v1.0.0-rc.21` instead of following `latest`. The WBoke public website is built from `apps/web`; account, registration, console, and API routes remain on New API. Review upstream release notes and test database migrations before changing the tag.

## Start

1. Point `www.wboke.com` and `api.wboke.com` A/AAAA records to the Hong Kong host.
2. Copy `.env.example` to `.env` and replace every secret, including the AgentMail relay credentials.
3. Restrict SSH, enable host-level firewall rules for 22/80/443, and keep PostgreSQL and Redis unexposed.
4. Start the stack:

```bash
docker compose up -d
```

## New API settings

Configure these through the New API administrator console:

- System name and legal attribution required by the New API license.
- `ServerAddress`: `https://www.wboke.com`
- `TopUpLink`: the approved Lianxiaopu storefront or WBoke recharge page.
- Quota display type: `CNY`
- USD exchange rate: the fixed accounting rate chosen by the operator.
- Email verification and SMTP.
- Registration, invitation policy, model prices, group ratio, and redemption-code batches.
- Default-theme navigation: enable Overview, Dashboard, API Keys, Usage Logs, Wallet, and Profile; hide Chat, Playground, and referral rewards for the first release.
- Wallet copy: label the history view as redemption history when no direct payment gateway is enabled, and point the purchase action only to the approved Lianxiaopu storefront.

## Public website routing

- `https://www.wboke.com/` serves the WBoke public website.
- New API continues to serve `/api/*`, `/v1/*`, `/v1beta/*`, dashboard routes, OAuth, setup, and its `/static/*` frontend assets.
- `https://api.wboke.com` sends all traffic to New API.

When New API adds a new top-level authentication or console route, add it to the `@new_api` matcher in `caddy/Caddyfile` before exposing that feature.

The Docker Compose stack includes the private `agentmail-relay` service. After migration, update New API SMTP settings to host `agentmail-relay`, port `2525`, STARTTLS enabled, and the credentials from `deploy/.env`.

Do not enable a channel for paid users until its status is `approved`. Official providers that do not authorize the Hong Kong company or service region remain disabled.

## Backups

Back up PostgreSQL at least daily to storage that is not on this host. Test restoration before accepting user payments. Redis and the New API `/data` volume are operational state, not substitutes for the PostgreSQL backup.
