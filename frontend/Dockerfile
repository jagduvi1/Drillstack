# ── Stage 1: Build ──────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

# Declare build arg and make it available to Vite at build time
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Stage 2: Serve with nginx ──────────────────────
FROM nginx:alpine

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
