# AmbientTV Backend — production Docker image
# Uses Node.js 20 Alpine for minimal size

FROM node:20-alpine

WORKDIR /app

# Copy dependency manifests and install
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy application code
COPY . .

# Expose the port defined in server.js / .env
EXPOSE 3000

# Run the server
CMD ["node", "server.js"]
