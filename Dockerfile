FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install

# Copy the rest of the code
COPY . .

# Build the app
RUN npx vite build

# Expose the port that Vite preview server runs on
EXPOSE 4173

# Command to run the preview server
CMD ["pnpm", "preview", "--host", "0.0.0.0"]