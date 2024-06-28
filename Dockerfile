
# Use an official Node.js image as the base image
FROM node:18

# Set the working directory in the container
WORKDIR /src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install project dependencies
RUN npm install

# Copy the rest of the application files
COPY . .

# Install Dataform CLI
RUN npm i -g @dataform/cli@^2.9.0

# Define the default command to run the script
CMD ["mv", ".", "/src/app/", "&&","node", "index.js"]
