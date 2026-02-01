# Use Node.js as the base image
#FROM node:18
FROM node:20-bookworm

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy the entire project
COPY . .

# Expose the Nuxt port
EXPOSE 3000

# Start the app in development mode
CMD ["npm", "run", "dev"]
