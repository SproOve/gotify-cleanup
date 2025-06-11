FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache nano
COPY index.js ./
COPY package.json ./
COPY logger.js ./
COPY config_set ./config_set
RUN mkdir -p config
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh
RUN npm install --production
ENTRYPOINT ["./entrypoint.sh"]
