FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY backend/package.json backend/package.json
COPY Frontend/package.json Frontend/package.json
RUN npm ci
COPY backend backend
RUN npm run build -w backend

FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
COPY backend/package.json backend/package.json
COPY Frontend/package.json Frontend/package.json
RUN npm ci --omit=dev --ignore-scripts && mkdir -p /app/backend/data && chown -R node:node /app/backend/data
COPY --from=build /app/backend/dist backend/dist
COPY backend/openapi.json backend/openapi.json
USER node
WORKDIR /app/backend
EXPOSE 3000
CMD ["node", "dist/server.js"]
