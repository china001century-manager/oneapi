FROM node:20-alpine

WORKDIR /app
COPY apps/agentmail-relay/package.json ./package.json
RUN npm install --omit=dev
COPY apps/agentmail-relay/src ./src

EXPOSE 2525 8080
CMD ["node", "src/server.js"]
