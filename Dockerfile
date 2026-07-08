############################
# 1️⃣ Build Stage
############################
FROM node:25 AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

# Copy EVERYTHING (important)
COPY . .


############################
# 2️⃣ Production Stage
############################
FROM node:25

WORKDIR /app
ENV NODE_ENV=production

# Copy entire app (utils, routes, configs, etc.)
COPY --from=builder /app ./

EXPOSE 8003
CMD ["node", "index.js"]
