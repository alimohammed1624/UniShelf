# Use official Bun runtime as a parent image
FROM oven/bun:latest

# Set the working directory
WORKDIR /app

# Copy package.json and lock files
COPY package*.json bun.lock* ./

# Install dependencies
RUN bun install

# Copy the rest of the application code
COPY . .

# Set API URL at build time for Next.js
ARG NEXT_PUBLIC_API_URL=/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Make entrypoint executable
RUN chmod +x entrypoint.sh

# Expose port 3000
EXPOSE 3000

# Start the application via entrypoint
ENTRYPOINT ["./entrypoint.sh"]
