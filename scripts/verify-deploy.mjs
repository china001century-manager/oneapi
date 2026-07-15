import { access, readFile } from 'node:fs/promises';

const vercel = JSON.parse(await readFile(new URL('../apps/web/vercel.json', import.meta.url), 'utf8'));
const caddy = await readFile(new URL('../deploy/caddy/Caddyfile', import.meta.url), 'utf8');
const relayLock = await readFile(new URL('../apps/agentmail-relay/package-lock.json', import.meta.url), 'utf8');
const railwayOrigin = 'https://wbokedesktop-production.up.railway.app';

const requiredVercelRoutes = [
  '/api',
  '/v1',
  '/v1beta',
  '/dashboard',
  '/keys',
  '/wallet',
  '/usage-logs',
  '/users',
  '/system-settings',
  '/assets',
  '/static',
  '/oauth',
  '/reset',
  '/setup',
];

const sources = vercel.rewrites.map(({ source }) => source);
for (const route of requiredVercelRoutes) {
  const exact = sources.indexOf(route);
  const wildcard = sources.indexOf(`${route}/:path*`);
  if (exact < 0 || wildcard < 0) {
    throw new Error(`Vercel rewrite pair is missing for ${route}`);
  }
  if (exact > wildcard) {
    throw new Error(`Exact Vercel rewrite must precede wildcard for ${route}`);
  }
  if (!vercel.rewrites[exact].destination.startsWith(railwayOrigin)
    || !vercel.rewrites[wildcard].destination.startsWith(railwayOrigin)) {
    throw new Error(`Vercel rewrite does not target the Railway New API origin for ${route}`);
  }
}

if (sources.at(-1) !== '/(.*)') {
  throw new Error('The website fallback must be the final Vercel rewrite');
}

for (const route of ['/api', '/api/*', '/v1', '/v1/*', '/v1beta', '/v1beta/*', '/static', '/static/*']) {
  if (!caddy.includes(route)) {
    throw new Error(`Caddy New API matcher is missing ${route}`);
  }
}

await access(new URL('../apps/web/public/wboke.png', import.meta.url));
await access(new URL('../apps/web/public/brand-logo.png', import.meta.url));
if (relayLock.includes('"link": true') || relayLock.includes('registry.npmmirror.com')) {
  throw new Error('Relay package-lock must be standalone and use the official npm registry');
}
console.log('Deployment configuration verified.');
