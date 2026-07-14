FROM node:24-alpine

RUN corepack enable && corepack prepare pnpm@11.1.3 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/agentmail-relay/package.json apps/agentmail-relay/package.json
RUN pnpm install --frozen-lockfile --filter @wboke/agentmail-relay...

COPY apps/agentmail-relay apps/agentmail-relay
WORKDIR /app/apps/agentmail-relay

EXPOSE 2525 8080
CMD ["node", "src/server.js"]
