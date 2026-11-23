FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY backend/package.json backend/package.json
COPY Frontend/package.json Frontend/package.json
RUN npm ci
COPY Frontend Frontend
RUN npm run build -w Frontend
FROM nginx:1.28-alpine
COPY Frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/Frontend/dist/fintrack/browser /usr/share/nginx/html
EXPOSE 80
