# EventPulse web — build the SPA, serve via nginx
FROM node:22-alpine AS build
WORKDIR /app
# API base URL is baked at build time. Default keeps local dev working (api on :8080).
# For production behind a reverse proxy, pass an EMPTY value so the SPA uses same-origin
# relative URLs (/api, /hubs) — then ONE image works for any domain.
ARG VITE_API_BASE_URL=http://localhost:8080
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
