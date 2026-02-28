# Use official Node.js Alpine image for a small footprint
FROM node:18-alpine

# Set working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Clean continuous integration install for production
RUN npm ci --only=production

# Copy the rest of the application code
COPY . .

# Expose the API port
EXPOSE 3001

# Start the application
CMD ["npm", "start"]
