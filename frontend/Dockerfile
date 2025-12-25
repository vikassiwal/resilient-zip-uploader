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
EXPOSE 5173

# Vite Server Start (--host zaroori hai docker ke liye)
CMD ["npm", "run", "dev", "--", "--host"]