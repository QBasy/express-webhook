FROM node:alpine-22

WORKDIR /app

COPY . .

RUN npm install

EXPOSE 6005

CMD ["npm run start"]
