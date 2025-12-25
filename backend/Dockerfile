# Base Image
FROM node:18

# Working Directory
WORKDIR /app

# Dependencies Install karein
COPY package*.json ./
RUN npm install

# Source Code Copy karein
COPY . .

# Port Expose karein
EXPOSE 3000

# Server Start karein
CMD ["node", "app.js"]