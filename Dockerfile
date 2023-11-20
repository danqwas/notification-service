# Use the official Node.js image as a base
FROM node:18.17.1

# Create a directory for your app
WORKDIR /app

# Copy the package.json and package-lock.json
COPY package*.json ./

# Install the app dependencies
RUN npm install

# Copy the rest of your app's source code
COPY . .

# Set environment variables from the .env file
ENV HOST=${HOST}
ENV PORT=${PORT}
ENV USERNAMEDB=${USERNAMEDB}
ENV PASSWORD=${PASSWORD}
ENV DATABASE=${DATABASE}
ENV PASSWORDEMAIL=${PASSWORDEMAIL}
ENV USERTRANSPORT=${USERTRANSPORT}
ENV FROMTRANSPORT=${FROMTRANSPORT}
ENV PORTTRANSPORT=${PORTTRANSPORT}
# Expose the port your app runs on
EXPOSE ${PORT}

# Define the command to start your app
CMD ["npm", "start"]