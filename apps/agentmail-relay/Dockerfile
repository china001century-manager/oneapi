FROM node:20-alpine

WORKDIR /app
COPY package.json ./package.json
RUN npm install --omit=dev
COPY src ./src

EXPOSE 2525 8080
CMD ["node", "src/server.js"]
