FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

COPY start.sh .
RUN chmod +x start.sh

# Startscript führt alles aus (inkl. node index.js)
CMD ["./start.sh"]