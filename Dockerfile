FROM node:16.17.1-alpine
WORKDIR /app
COPY package.json yarn.lock .
RUN yarn
COPY . .
EXPOSE 3000
