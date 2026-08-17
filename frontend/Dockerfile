# ================================
# Stage 1: Build Vue application
# ================================
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build


# ================================
# Stage 2: Serve with Nginx
# ================================
FROM nginx:alpine

# Remove default Nginx files
RUN rm -rf /usr/share/nginx/html/*

# Copy Vue production build
COPY --from=builder /app/dist /usr/share/nginx/html

# SPA routing configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Cloud Run uses the PORT environment variable.
# Nginx will listen on 8080.
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]