# Stage 1 — Build app met Node 20-alpine
FROM node:24-alpine AS build
WORKDIR /app
# Kopieer package manifesten en installeer dependencies (reproducible)
COPY package*.json ./
RUN npm ci --no-audit --no-fund
# Kopieer de rest van de broncode en bouw de Vite app
COPY . .
RUN npm run build

# Stage 2 — Runtime met Nginx 1.27-alpine (serve statische build)
FROM nginx:1.29-alpine AS runtime
# Kopieer alleen de productie build naar de Nginx webroot
COPY --from=build /app/dist /usr/share/nginx/html
# Gebruik optioneel een custom Nginx-config als deze bestaat in .gitlab/nginx.conf
COPY .gitlab /tmp/.gitlab
RUN if [ -f /tmp/.gitlab/nginx.conf ]; then mv /tmp/.gitlab/nginx.conf /etc/nginx/conf.d/default.conf; fi && rm -rf /tmp/.gitlab
# Expose poort 80 (HTTP)
EXPOSE 80
# Start Nginx in de voorgrond
CMD ["nginx", "-g", "daemon off;"]
