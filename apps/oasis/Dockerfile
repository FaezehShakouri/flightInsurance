# Use Bun's official image
FROM oven/bun:1 as base

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Expose port
EXPOSE 4500

# Set environment to production
ENV NODE_ENV=production

# Run the application
CMD ["bun", "run", "start"]

