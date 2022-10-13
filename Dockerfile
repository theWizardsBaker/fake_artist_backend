FROM node:16.15.1-alpine as base

FROM base as deps
WORKDIR /var/www/build
RUN apk add g++ make py3-pip
COPY package.json yarn.lock ./
RUN yarn install

FROM base
WORKDIR /var/www/http
COPY . .
COPY --from=deps /var/www/build/node_modules ./node_modules/

ENTRYPOINT ["yarn"]
CMD ["start"]