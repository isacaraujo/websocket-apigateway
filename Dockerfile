FROM node:14.12.0-alpine3.12

COPY package* tsconfig.json /app/

WORKDIR /app

RUN npm ci

COPY ./src /app/src/

RUN npx tsc

CMD [ "node", "dist/index.js" ]

EXPOSE 6262
