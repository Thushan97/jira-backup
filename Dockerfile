# Use the official Node.js image
FROM node:20-alpine

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm install --production

# Copy app source code
COPY . .

# Expose the port the app runs on
EXPOSE 8080

# Define the command to run your app
CMD ["node", "index.js"]
