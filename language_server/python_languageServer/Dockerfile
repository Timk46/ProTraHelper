# Use the official Node.js 16 image as a base image
FROM node:16

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (or npm-shrinkwrap.json) from your project into the container
COPY package*.json ./

# Install both dependencies and devDependencies since ts-node is used for runtime compilation
RUN npm install

# Copy the rest of your application's code into the container
COPY . .

# Expose the port your app runs on
EXPOSE 30001

# Define the command to run your app using the script from package.json
# Adjust this command based on the actual way you run your server in production
CMD ["npm", "run", "start:server:python"]
