FROM node:16.17.1-alpine
WORKDIR /app
COPY . .
RUN yarn install
CMD ["yarn", "start"]
EXPOSE 3000