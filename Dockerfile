FROM node:20-alpine

WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application files
COPY . .

# Expose Vite's default port
EXPOSE 5173

# Run Vite in dev mode with --host to bind to all interfaces
CMD ["npm", "run", "dev", "--", "--host"]
