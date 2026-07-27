# Stage 1: Build
FROM node:22 AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Set environment variables for build time
# These point to the relative paths handled by Nginx proxy
ENV VITE_API_BASE_URL=/api/v1
ENV VITE_SOCKET_URL=/

RUN npm run build

# Stage 2: Serve
FROM nginx:alpine

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
