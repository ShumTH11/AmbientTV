FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy app
COPY . .

# Create data directories
RUN mkdir -p data backups

EXPOSE 3000

CMD ["node", "server.js"]
